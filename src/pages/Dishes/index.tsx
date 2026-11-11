import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Checkbox,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  attributeSelectionMeta,
  fetchAttributeGroupOptions,
} from '../../services/attribute';
import {
  fetchCategories,
  fetchDishes,
  fetchNextDishCode,
  removeDish,
  saveDish,
  updateDishStatus,
  type DishInput,
} from '../../services/dish';
import type { Dish, DishAttributeBinding, DishAttributeGroup, DishStatus, Paged } from '../../types';
import { dishStatusMeta, money } from '../../utils/format';

const emptyPage: Paged<Dish> = { list: [], total: 0, page: 1, pageSize: 10 };
const MAX_IMAGES = 6;

interface DishSkuFormValues {
  code: string;
  specName: string;
  price?: number;
  stock?: number;
}

interface DishFormValues {
  code: string;
  name: string;
  category: string;
  cost: number;
  status: DishStatus;
  description?: string;
  skus: DishSkuFormValues[];
}

/** 菜品管理：SPU（菜品）+ SKU（规格）模型，支持商品编码、商品图与多规格。 */
export default function DishesPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<DishFormValues>();
  const skuWatch = Form.useWatch('skus', form);

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>();
  const [status, setStatus] = useState<DishStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [categories, setCategories] = useState<string[]>([]);
  const [attributeGroups, setAttributeGroups] = useState<DishAttributeGroup[]>([]);
  const [data, setData] = useState<Paged<Dish>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageList, setImageList] = useState<UploadFile[]>([]);
  const [bindings, setBindings] = useState<DishAttributeBinding[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchDishes({ keyword, category, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, category, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchCategories().then(setCategories);
    void fetchAttributeGroupOptions().then(setAttributeGroups);
  }, []);

  const resetFilters = () => {
    setKeyword('');
    setCategory(undefined);
    setStatus('all');
    setPage(1);
  };

  const openCreate = async () => {
    setEditing(null);
    form.resetFields();
    setImageList([]);
    const code = await fetchNextDishCode();
    form.setFieldsValue({
      code,
      status: 'on',
      skus: [{ specName: '标准份', code: `${code}-01`, stock: 100 }],
    });
    setBindings([]);
    setDrawerOpen(true);
  };

  const openEdit = (dish: Dish) => {
    setEditing(dish);
    form.resetFields();
    form.setFieldsValue({
      code: dish.code,
      name: dish.name,
      category: dish.category,
      cost: dish.cost,
      status: dish.status,
      description: dish.description,
      skus: dish.skus.map((sku) => ({
        code: sku.code,
        specName: sku.specName,
        price: sku.price,
        stock: sku.stock,
      })),
    });
    setImageList(
      dish.images.map((url, index) => ({
        uid: `${dish.id}-img-${index}`,
        name: `商品图 ${index + 1}`,
        status: 'done' as const,
        url,
      })),
    );
    setBindings(dish.attributeBindings.map((binding) => ({ ...binding })));
    setDrawerOpen(true);
  };

  const handleUpload = (file: RcFile) => {
    if (!file.type.startsWith('image/')) {
      message.warning('只能上传图片文件');
      return Upload.LIST_IGNORE;
    }
    if (imageList.length >= MAX_IMAGES) {
      message.warning(`商品图最多 ${MAX_IMAGES} 张`);
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      if (!url) return;
      setImageList((prev) =>
        [...prev, { uid: file.uid, name: file.name, status: 'done' as const, url }].slice(0, MAX_IMAGES),
      );
    };
    reader.readAsDataURL(file);
    return Upload.LIST_IGNORE;
  };

  const confirmOffline = (title: string, onOk: () => Promise<void> | void) => {
    modal.confirm({
      title,
      content: '下架不影响已生成的订单，用户将无法购买此商品，确定要下架吗？',
      okText: '确定下架',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk,
    });
  };

  const doSave = async (values: DishFormValues) => {
    setSaving(true);
    try {
      const payload: DishInput = {
        id: editing?.id,
        code: values.code,
        name: values.name,
        category: values.category,
        cost: values.cost,
        status: values.status,
        description: values.description,
        images: imageList.map((file) => file.url).filter((url): url is string => Boolean(url)),
        skus: values.skus.map((sku) => ({
          code: sku.code,
          specName: sku.specName,
          price: Number(sku.price),
          stock: Number(sku.stock),
        })),
        attributeBindings: bindings,
      };
      await saveDish(payload);
      message.success(editing ? '菜品已更新' : '菜品已新增');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (values: DishFormValues) => {
    if (editing && editing.status === 'on' && values.status === 'off') {
      confirmOffline(`确认下架「${editing.name}」？`, () => doSave(values));
      return;
    }
    void doSave(values);
  };

  const doToggle = async (dish: Dish, checked: boolean) => {
    await updateDishStatus(dish.id, checked ? 'on' : 'off');
    message.success(`${dish.name} 已${checked ? '上架' : '下架'}`);
    await load();
  };

  const handleToggle = (dish: Dish, checked: boolean) => {
    if (checked) {
      void doToggle(dish, true);
      return;
    }
    confirmOffline(`确认下架「${dish.name}」？`, () => doToggle(dish, false));
  };

  const handleRemove = async (dish: Dish) => {
    await removeDish(dish.id);
    message.success(`${dish.name} 已删除`);
    await load();
  };

  const bindingOf = (groupId: string) => bindings.find((binding) => binding.groupId === groupId);

  const toggleBinding = (group: DishAttributeGroup, checked: boolean) => {
    setBindings((prev) =>
      checked
        ? prev.some((binding) => binding.groupId === group.id)
          ? prev
          : [...prev, { groupId: group.id }]
        : prev.filter((binding) => binding.groupId !== group.id),
    );
  };

  const updateBinding = (
    groupId: string,
    updater: (binding: DishAttributeBinding) => DishAttributeBinding,
  ) => {
    setBindings((prev) =>
      prev.map((binding) => (binding.groupId === groupId ? updater(binding) : binding)),
    );
  };

  const setOptionPrice = (groupId: string, optionId: string, value: number | null) => {
    updateBinding(groupId, (binding) => {
      const nextPrices = { ...(binding.optionPrices ?? {}) };
      if (value === null) delete nextPrices[optionId];
      else nextPrices[optionId] = value;
      return {
        ...binding,
        optionPrices: Object.keys(nextPrices).length > 0 ? nextPrices : undefined,
      };
    });
  };

  const setOptionProvided = (groupId: string, optionId: string, provided: boolean) => {
    updateBinding(groupId, (binding) => {
      const disabled = new Set(binding.disabledOptionIds ?? []);
      if (provided) disabled.delete(optionId);
      else disabled.add(optionId);
      const list = [...disabled];
      return { ...binding, disabledOptionIds: list.length > 0 ? list : undefined };
    });
  };

  const columns: ColumnsType<Dish> = [
    {
      title: '菜品',
      dataIndex: 'name',
      width: 220,
      render: (value: string, dish) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {dish.id} · {dish.code}
          </div>
        </div>
      ),
    },
    { title: '分类', dataIndex: 'category', width: 110 },
    {
      title: '售价',
      dataIndex: 'price',
      width: 140,
      align: 'right',
      render: (value: number, dish) => {
        const prices = dish.skus.map((sku) => sku.price);
        const min = Math.min(value, ...prices);
        const max = Math.max(value, ...prices);
        return (
          <div>
            <span style={{ fontWeight: 600 }}>
              {min === max ? money(min) : `${money(min)} ~ ${money(max)}`}
            </span>
            {dish.skus.length > 1 && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dish.skus.length} 个规格</div>
            )}
          </div>
        );
      },
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 110,
      align: 'right',
      sorter: (a, b) => {
        const effective = (value: number) => (value === -1 ? Number.MAX_SAFE_INTEGER : value);
        return effective(a.stock) - effective(b.stock);
      },
      render: (value: number) => {
        if (value === -1) {
          return (
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              不限
            </Tag>
          );
        }
        if (value === 0) return <span className="stock-empty">缺货</span>;
        return `${value} 份`;
      },
    },
    {
      title: '销量',
      dataIndex: 'sales',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.sales - b.sales,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: DishStatus, dish) => (
        <Space size={8}>
          <Switch
            size="small"
            checked={value === 'on'}
            onChange={(checked) => handleToggle(dish, checked)}
          />
          <Tag color={dishStatusMeta[value].color} style={{ marginInlineEnd: 0 }}>
            {dishStatusMeta[value].label}
          </Tag>
        </Space>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 150 },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, dish) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(dish)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除「${dish.name}」？`}
            description="删除后不可恢复（原型阶段仅影响内存 Mock 数据）"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRemove(dish)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const skuSummary = (() => {
    const list = (skuWatch ?? []) as DishSkuFormValues[];
    const priced = list.filter((sku) => typeof sku?.price === 'number');
    if (!priced.length) return '';
    const prices = priced.map((sku) => Number(sku.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const unlimited = list.some((sku) => Number(sku?.stock) === -1);
    const stock = list.reduce((sum, sku) => sum + (Number(sku?.stock) || 0), 0);
    return `当前规格售价 ${min === max ? money(min) : `${money(min)} ~ ${money(max)}`} · 库存合计 ${
      unlimited ? '不限' : `${stock} 份`
    }`;
  })();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>菜品管理</h2>
          <p>共 {data.total} 道菜，支持按名称 / 编码 / 分类 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => void openCreate()}>
            新增菜品
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索菜品名称 / 编码"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="全部分类"
            style={{ width: 150 }}
            options={categories.map((item) => ({ label: item, value: item }))}
            value={category}
            onChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '在售', value: 'on' },
              { label: '已下架', value: 'off' },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<Dish>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1080 }}
          pagination={{
            current: page,
            pageSize,
            total: data.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>

      <Drawer
        title={editing ? '编辑菜品' : '新增菜品'}
        width={680}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="dish-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<DishFormValues>
          id="dish-form"
          form={form}
          layout="vertical"
          onFinish={(values) => handleSave(values)}
        >
          <Form.Item name="name" label="菜品名称" rules={[{ required: true, message: '请输入菜品名称' }]}>
            <Input placeholder="如：麻辣香锅" maxLength={30} />
          </Form.Item>

          <Space size={12} align="start" style={{ display: 'flex' }}>
            <Form.Item
              name="code"
              label="商品编码"
              rules={[
                { required: true, message: '请输入商品编码' },
                { pattern: /^[A-Za-z][A-Za-z0-9_-]*$/, message: '以字母开头，只能包含字母、数字、下划线、中划线' },
              ]}
              style={{ width: 300 }}
            >
              <Input placeholder="如：SPU029" maxLength={30} />
            </Form.Item>
            <Form.Item
              name="category"
              label="所属分类"
              rules={[{ required: true, message: '请选择分类' }]}
              style={{ width: 300 }}
            >
              <Select
                placeholder="选择分类"
                options={categories.map((item) => ({ label: item, value: item }))}
              />
            </Form.Item>
          </Space>

          <Form.Item label="商品图（最多 6 张）" extra="支持 jpg / png；原型阶段图片仅保存在内存，刷新后恢复初始图">
            <Upload
              listType="picture-card"
              accept="image/*"
              multiple
              fileList={imageList}
              beforeUpload={handleUpload}
              onRemove={(file) => {
                setImageList((prev) => prev.filter((item) => item.uid !== file.uid));
              }}
              onPreview={(file) => {
                if (file.url) window.open(file.url, '_blank');
              }}
            >
              {imageList.length >= MAX_IMAGES ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 4 }}>上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <div className="sku-editor">
            <div className="sku-head">
              <span>规格名称</span>
              <span>规格编码</span>
              <span>售价（元）</span>
              <span>库存</span>
              <span />
            </div>
            <Form.List
              name="skus"
              rules={[
                {
                  validator: async (_, value) => {
                    if (!value || value.length === 0) {
                      return Promise.reject(new Error('至少保留一个规格'));
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  {fields.map((field) => (
                    <div className="sku-row" key={field.key}>
                      <Form.Item
                        name={[field.name, 'specName']}
                        rules={[{ required: true, message: '请输入规格名' }]}
                      >
                        <Input placeholder="如：小份" maxLength={20} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'code']}
                        rules={[{ required: true, message: '请输入规格编码' }]}
                      >
                        <Input placeholder="如：SPU001-01" maxLength={30} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'price']}
                        rules={[{ required: true, message: '请输入售价' }]}
                      >
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="68.00" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'stock']}
                        rules={[{ required: true, message: '请输入库存' }]}
                      >
                        <InputNumber
                          min={-1}
                          max={9999}
                          precision={0}
                          style={{ width: '100%' }}
                          placeholder="100 / -1"
                        />
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        disabled={fields.length <= 1}
                        onClick={() => remove(field.name)}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() =>
                      add({
                        specName: '',
                        code: `${form.getFieldValue('code') || 'SPU'}-0${fields.length + 1}`,
                        stock: 100,
                      })
                    }
                  >
                    添加规格
                  </Button>
                  <Form.ErrorList errors={errors} />
                </>
              )}
            </Form.List>
            {skuSummary && <div className="sku-summary">{skuSummary}</div>}
            <div className="sku-summary">库存：填 ≥ 0 的整数为实际库存；填 -1 表示无限库存（不限量）</div>
          </div>

          <Form.Item
            label="口味 / 做法"
            extra="在「业务 · 菜品属性」统一维护；勾选后可按本商品覆盖选项加价（留空继承属性组默认价），点单时按订单快照记录，不参与售价与库存"
            style={{ marginTop: 16 }}
          >
            {attributeGroups.length === 0 ? (
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                还没有启用中的属性组，去「业务 · 菜品属性」创建
              </span>
            ) : (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {attributeGroups.map((group) => {
                  const binding = bindingOf(group.id);
                  return (
                    <div className="attr-binding" key={group.id}>
                      <Checkbox
                        checked={Boolean(binding)}
                        onChange={(event) => toggleBinding(group, event.target.checked)}
                      >
                        <Space size={6} align="center" wrap>
                          <span style={{ fontWeight: 500 }}>{group.name}</span>
                          <Tag
                            color={attributeSelectionMeta[group.selection].color}
                            style={{ marginInlineEnd: 0 }}
                          >
                            {attributeSelectionMeta[group.selection].label}
                          </Tag>
                          {group.required && (
                            <Tag color="gold" style={{ marginInlineEnd: 0 }}>
                              必选
                            </Tag>
                          )}
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {group.options.map((option) => option.label).join(' / ')}
                          </span>
                        </Space>
                      </Checkbox>

                      {binding && (
                        <div className="attr-binding-options">
                          <div className="attr-binding-head">
                            <span>选项</span>
                            <span>本商品加价（元）</span>
                            <span>是否提供</span>
                          </div>
                          {group.options.map((option) => {
                            const disabled = binding.disabledOptionIds?.includes(option.id) ?? false;
                            const override = binding.optionPrices?.[option.id];
                            return (
                              <div className="attr-binding-row" key={option.id}>
                                <span>
                                  {option.label}
                                  {option.extraPrice > 0 && (
                                    <Tag
                                      color="orange"
                                      style={{ marginInlineStart: 8, marginInlineEnd: 0 }}
                                    >
                                      默认 +{option.extraPrice}
                                    </Tag>
                                  )}
                                </span>
                                <InputNumber
                                  min={0}
                                  precision={2}
                                  style={{ width: '100%' }}
                                  disabled={disabled}
                                  value={typeof override === 'number' ? override : undefined}
                                  placeholder={`继承默认 ${option.extraPrice}`}
                                  onChange={(value) =>
                                    setOptionPrice(group.id, option.id, value === null ? null : Number(value))
                                  }
                                />
                                <Switch
                                  size="small"
                                  checked={!disabled}
                                  onChange={(checked) => setOptionProvided(group.id, option.id, checked)}
                                />
                              </div>
                            );
                          })}
                          <div className="attr-binding-hint">
                            留空 = 继承属性组默认加价；关闭「是否提供」后该选项在本商品不可选
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Space>
            )}
          </Form.Item>

          <Form.Item
            name="cost"
            label="成本（元）"
            rules={[{ required: true, message: '请输入成本' }]}
            extra="用于核算毛利，不在列表展示"
            style={{ marginTop: 16 }}
          >
            <InputNumber min={0} precision={2} style={{ width: 200 }} placeholder="26.00" />
          </Form.Item>

          <Form.Item name="status" label="售卖状态" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { label: '在售', value: 'on' },
                { label: '下架', value: 'off' },
              ]}
            />
          </Form.Item>

          <Form.Item name="description" label="菜品描述">
            <Input.TextArea rows={3} maxLength={120} showCount placeholder="口味、卖点、规格说明等" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
