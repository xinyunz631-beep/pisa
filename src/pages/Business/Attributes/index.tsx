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
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  attributeSelectionMeta,
  attributeStatusMeta,
  fetchAttributeGroups,
  fetchAttributeSummary,
  removeAttributeGroup,
  saveAttributeGroup,
  updateAttributeGroupStatus,
  type AttributeGroupRow,
} from '../../../services/attribute';
import type { AttributeSelection, AttributeStatus, Paged } from '../../../types';

const emptyPage: Paged<AttributeGroupRow> = { list: [], total: 0, page: 1, pageSize: 10 };
const emptySummary = { total: 0, enabled: 0, optionTotal: 0, dishRefTotal: 0 };

const selectionOptions: Array<{ label: string; value: AttributeSelection | 'all' }> = [
  { label: '全部类型', value: 'all' },
  { label: '单选', value: 'single' },
  { label: '多选', value: 'multiple' },
];

const statusOptions: Array<{ label: string; value: AttributeStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '启用中', value: 'enabled' },
  { label: '已停用', value: 'disabled' },
];

interface AttributeOptionFormValues {
  label: string;
  extraPrice: number;
  isDefault: boolean;
}

interface AttributeFormValues {
  name: string;
  selection: AttributeSelection;
  required: boolean;
  status: AttributeStatus;
  remark?: string;
  options: AttributeOptionFormValues[];
}

/** 做法属性：属性组（辣度 / 温度 / 忌口 / 加料…）的集中维护，菜品只做引用。 */
export default function AttributesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<AttributeFormValues>();
  const selection = Form.useWatch('selection', form);
  const required = Form.useWatch('required', form);

  const [keyword, setKeyword] = useState('');
  const [selectionFilter, setSelectionFilter] = useState<AttributeSelection | 'all'>('all');
  const [status, setStatus] = useState<AttributeStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<AttributeGroupRow>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(emptySummary);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeGroupRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await fetchAttributeGroups({
          keyword,
          selection: selectionFilter,
          status,
          page,
          pageSize,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, selectionFilter, status, page, pageSize]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await fetchAttributeSummary());
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const refreshAll = async () => {
    await Promise.all([load(), loadSummary()]);
  };

  const resetFilters = () => {
    setKeyword('');
    setSelectionFilter('all');
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      selection: 'single',
      required: true,
      status: 'enabled',
      options: [{ label: '', extraPrice: 0, isDefault: true }],
    });
    setDrawerOpen(true);
  };

  const openEdit = (row: AttributeGroupRow) => {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue({
      name: row.name,
      selection: row.selection,
      required: row.required,
      status: row.status,
      remark: row.remark,
      options: row.options.map((option) => ({
        label: option.label,
        extraPrice: option.extraPrice,
        isDefault: option.isDefault,
      })),
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: AttributeFormValues) => {
    setSaving(true);
    try {
      await saveAttributeGroup({
        id: editing?.id,
        name: values.name,
        selection: values.selection,
        required: values.required,
        status: values.status,
        remark: values.remark,
        options: values.options.map((option) => ({
          label: option.label,
          extraPrice: option.extraPrice,
          isDefault: Boolean(option.isDefault),
        })),
      });
      message.success(editing ? '属性组已保存' : '属性组已创建');
      setDrawerOpen(false);
      await refreshAll();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (row: AttributeGroupRow) => {
    const next: AttributeStatus = row.status === 'enabled' ? 'disabled' : 'enabled';
    await updateAttributeGroupStatus(row.id, next);
    message.success(next === 'enabled' ? `已启用「${row.name}」` : `已停用「${row.name}」`);
    await refreshAll();
  };

  const handleRemove = async (row: AttributeGroupRow) => {
    try {
      await removeAttributeGroup(row.id);
      message.success(`已删除「${row.name}」`);
      await refreshAll();
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const columns: ColumnsType<AttributeGroupRow> = [
    {
      title: '属性组名称',
      dataIndex: 'name',
      width: 200,
      render: (value: string, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.remark || '—'}</div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'selection',
      width: 90,
      render: (value: AttributeSelection) => (
        <Tag color={attributeSelectionMeta[value].color}>
          {attributeSelectionMeta[value].label}
        </Tag>
      ),
    },
    {
      title: '是否必选',
      dataIndex: 'required',
      width: 100,
      render: (value: boolean) =>
        value ? <Tag color="gold">必选</Tag> : <Tag>可选</Tag>,
    },
    {
      title: '选项',
      dataIndex: 'optionCount',
      width: 90,
      align: 'right',
      render: (value: number) => `${value} 项`,
    },
    {
      title: '关联菜品',
      dataIndex: 'dishCount',
      width: 110,
      align: 'right',
      render: (value: number) => (value > 0 ? `${value} 道` : '—'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: AttributeStatus) => (
        <Tag color={attributeStatusMeta[value].color}>{attributeStatusMeta[value].label}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 150 },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => void handleToggleStatus(row)}>
            {row.status === 'enabled' ? '停用' : '启用'}
          </Button>
          {row.dishCount > 0 ? (
            <Tooltip title={`该属性组已被 ${row.dishCount} 道菜品引用，需先在菜品中取消引用`}>
              <Button type="link" size="small" danger disabled>
                删除
              </Button>
            </Tooltip>
          ) : (
            <Popconfirm
              title={`删除「${row.name}」？`}
              description="删除后不可恢复（原型阶段仅影响内存 Mock 数据）"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleRemove(row)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>做法属性</h2>
          <p>
            属性组（辣度 / 温度 / 忌口 / 加料…）集中维护，菜品只做引用；属性不参与售价与库存，点单时按快照记录（Mock 数据）
          </p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={loading || summaryLoading}
            onClick={() => void refreshAll()}
          >
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增属性组
          </Button>
        </Space>
      </div>

      <div className="kpi-grid">
        <Card loading={summaryLoading}>
          <Statistic
            title="属性组总数"
            value={summary.total}
            suffix={<span style={{ fontSize: 13 }}>个</span>}
          />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic
            title="启用中"
            value={summary.enabled}
            suffix={<span style={{ fontSize: 13 }}>个</span>}
          />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic
            title="选项总数"
            value={summary.optionTotal}
            suffix={<span style={{ fontSize: 13 }}>项</span>}
          />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic
            title="菜品引用"
            value={summary.dishRefTotal}
            suffix={<span style={{ fontSize: 13 }}>次</span>}
          />
        </Card>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索属性组名称"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={selectionFilter}
            options={selectionOptions}
            onChange={(value) => {
              setSelectionFilter(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={status}
            options={statusOptions}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<AttributeGroupRow>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1010 }}
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
          locale={{ emptyText: '没有符合条件的属性组' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑属性组 · ${editing.name}` : '新增属性组'}
        width={620}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="attribute-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<AttributeFormValues>
          id="attribute-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="属性组名称"
            rules={[
              { required: true, message: '请输入属性组名称' },
              { max: 20, message: '名称最多 20 个字符' },
            ]}
            extra="如：辣度、温度、忌口、加料"
          >
            <Input placeholder="如：辣度" maxLength={20} />
          </Form.Item>

          <Space size={12} align="start" style={{ display: 'flex' }}>
            <Form.Item name="selection" label="选择方式" rules={[{ required: true }]}>
              <Radio.Group
                options={[
                  { label: '单选', value: 'single' },
                  { label: '多选', value: 'multiple' },
                ]}
              />
            </Form.Item>
            <Form.Item name="required" label="是否必选" rules={[{ required: true }]}>
              <Radio.Group
                options={[
                  { label: '必选', value: true },
                  { label: '可选', value: false },
                ]}
              />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Radio.Group
                options={[
                  { label: '启用中', value: 'enabled' },
                  { label: '已停用', value: 'disabled' },
                ]}
              />
            </Form.Item>
          </Space>

          <div className="attr-option-editor">
            <div className="attr-option-head">
              <span>选项名称</span>
              <span>加价（元）</span>
              <span>默认项</span>
              <span />
            </div>
            <Form.List
              name="options"
              rules={[
                {
                  validator: async (_, value) => {
                    if (!value || value.length === 0) {
                      return Promise.reject(new Error('至少添加一个选项'));
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  {fields.map((field) => (
                    <div className="attr-option-row" key={field.key}>
                      <Form.Item
                        name={[field.name, 'label']}
                        rules={[{ required: true, message: '请输入选项名称' }]}
                      >
                        <Input placeholder="如：微辣" maxLength={20} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'extraPrice']}
                        rules={[{ required: true, message: '请输入加价' }]}
                      >
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'isDefault']} valuePropName="checked">
                        <Switch checkedChildren="默认" unCheckedChildren="—" />
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
                    onClick={() => add({ label: '', extraPrice: 0, isDefault: false })}
                  >
                    添加选项
                  </Button>
                  <Form.ErrorList errors={errors} />
                </>
              )}
            </Form.List>
            <div className="attr-option-hint">
              {selection === 'single' && required
                ? '单选 + 必选：需要且只能设置一个默认项'
                : '口味 / 辣度类加价填 0；加料类才需要填加价金额'}
            </div>
          </div>

          <Form.Item name="remark" label="备注" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} maxLength={60} showCount placeholder="如：门店默认中辣" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
