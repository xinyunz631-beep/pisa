import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  fetchCategories,
  fetchDishes,
  removeDish,
  saveDish,
  updateDishStatus,
  type DishInput,
} from '../../services/dish';
import type { Dish, DishStatus, Paged } from '../../types';
import { dishStatusMeta, money } from '../../utils/format';

const emptyPage: Paged<Dish> = { list: [], total: 0, page: 1, pageSize: 10 };

export default function DishesPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<DishInput>();

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>();
  const [status, setStatus] = useState<DishStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [categories, setCategories] = useState<string[]>([]);
  const [data, setData] = useState<Paged<Dish>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [saving, setSaving] = useState(false);

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
  }, []);

  const resetFilters = () => {
    setKeyword('');
    setCategory(undefined);
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'on', stock: 100 });
    setDrawerOpen(true);
  };

  const openEdit = (dish: Dish) => {
    setEditing(dish);
    form.resetFields();
    form.setFieldsValue({
      name: dish.name,
      category: dish.category,
      price: dish.price,
      cost: dish.cost,
      stock: dish.stock,
      status: dish.status,
      description: dish.description,
    });
    setDrawerOpen(true);
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

  const doSave = async (values: DishInput) => {
    setSaving(true);
    try {
      await saveDish({ ...values, id: editing?.id });
      message.success(editing ? '菜品已更新' : '菜品已新增');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (values: DishInput) => {
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

  const columns: ColumnsType<Dish> = [
    {
      title: '菜品',
      dataIndex: 'name',
      width: 200,
      render: (value: string, dish) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dish.id}</div>
        </div>
      ),
    },
    { title: '分类', dataIndex: 'category', width: 110 },
    {
      title: '售价',
      dataIndex: 'price',
      width: 100,
      align: 'right',
      render: (value: number) => <span style={{ fontWeight: 600 }}>{money(value)}</span>,
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 110,
      align: 'right',
      sorter: (a, b) => a.stock - b.stock,
      render: (value: number) => {
        if (value === 0) return <span className="stock-empty">缺货</span>;
        if (value < 20) return <span className="stock-low">{value} 份</span>;
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
            onChange={(checked) => void handleToggle(dish, checked)}
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>菜品管理</h2>
          <p>共 {data.total} 道菜，支持按名称 / 分类 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
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
          scroll={{ x: 1020 }}
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
        title={editing ? `编辑菜品 · ${editing.name}` : '新增菜品'}
        width={440}
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
        <Form<DishInput> id="dish-form" form={form} layout="vertical" onFinish={(values) => void handleSave(values)}>
          <Form.Item name="name" label="菜品名称" rules={[{ required: true, message: '请输入菜品名称' }]}>
            <Input placeholder="如：麻辣香锅" maxLength={30} />
          </Form.Item>

          <Form.Item name="category" label="所属分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select
              placeholder="选择分类"
              options={categories.map((item) => ({ label: item, value: item }))}
            />
          </Form.Item>

          <Space size={12} align="start">
            <Form.Item
              name="price"
              label="售价（元）"
              rules={[{ required: true, message: '请输入售价' }]}
              style={{ width: 200 }}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="68.00" />
            </Form.Item>
            <Form.Item
              name="cost"
              label="成本（元）"
              rules={[{ required: true, message: '请输入成本' }]}
              style={{ width: 200 }}
              extra="用于核算毛利，不在列表展示"
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="26.00" />
            </Form.Item>
          </Space>

          <Form.Item
            name="stock"
            label="库存（份）"
            rules={[{ required: true, message: '请输入库存' }]}
          >
            <InputNumber min={0} max={9999} precision={0} style={{ width: '100%' }} placeholder="100" />
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
