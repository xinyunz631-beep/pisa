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
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  categoryStatusMeta,
  fetchCategoryList,
  fetchCategorySummary,
  removeCategory,
  saveCategory,
  updateCategoryStatus,
  type CategoryRow,
  type CategoryStatus,
  type CategorySummary,
} from '../../../services/category';
import type { Paged } from '../../../types';

const emptyPage: Paged<CategoryRow> = { list: [], total: 0, page: 1, pageSize: 10 };
const emptySummary: CategorySummary = { total: 0, enabled: 0, disabled: 0, dishTotal: 0 };

const statusOptions: Array<{ label: string; value: CategoryStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '启用中', value: 'enabled' },
  { label: '已停用', value: 'disabled' },
];

interface CategoryFormValues {
  name: string;
  code: string;
  sort: number;
  status: CategoryStatus;
  remark?: string;
}

/** 分类管理：菜品分类的新增、编辑、启停与删除（业务模块）。 */
export default function CategoriesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<CategoryFormValues>();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<CategoryStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<CategoryRow>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CategorySummary>(emptySummary);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCategoryList({ keyword, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, status, page, pageSize]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await fetchCategorySummary());
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
    setStatus('all');
    setPage(1);
  };

  const nextSort = () => {
    const max = data.list.reduce((acc, item) => Math.max(acc, item.sort), 0);
    return max + 10;
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'enabled', sort: nextSort() });
    setDrawerOpen(true);
  };

  const openEdit = (category: CategoryRow) => {
    setEditing(category);
    form.resetFields();
    form.setFieldsValue({
      name: category.name,
      code: category.code,
      sort: category.sort,
      status: category.status,
      remark: category.remark,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: CategoryFormValues) => {
    setSaving(true);
    try {
      await saveCategory({ ...values, id: editing?.id });
      message.success(editing ? '分类已保存' : '分类已创建');
      setDrawerOpen(false);
      await refreshAll();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (category: CategoryRow) => {
    const next = category.status === 'enabled' ? 'disabled' : 'enabled';
    await updateCategoryStatus(category.id, next);
    message.success(next === 'enabled' ? `已启用「${category.name}」` : `已停用「${category.name}」`);
    await refreshAll();
  };

  const handleRemove = async (category: CategoryRow) => {
    try {
      await removeCategory(category.id);
      message.success(`已删除「${category.name}」`);
      await refreshAll();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const columns: ColumnsType<CategoryRow> = [
    {
      title: '排序',
      dataIndex: 'sort',
      width: 70,
      align: 'center',
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      width: 140,
    },
    {
      title: '分类编码',
      dataIndex: 'code',
      width: 150,
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
      render: (value: CategoryStatus) => (
        <Tag color={categoryStatusMeta[value].color}>{categoryStatusMeta[value].label}</Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 150,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          {record.status === 'enabled' ? (
            <Popconfirm
              title={`停用「${record.name}」？`}
              description={
                record.dishCount > 0
                  ? `该分类下还有 ${record.dishCount} 道菜，停用后菜品表单里将不再显示该分类`
                  : '停用后菜品表单里将不再显示该分类'
              }
              okText="停用"
              cancelText="取消"
              onConfirm={() => void handleToggleStatus(record)}
            >
              <Button type="link" size="small">
                停用
              </Button>
            </Popconfirm>
          ) : (
            <Button type="link" size="small" onClick={() => void handleToggleStatus(record)}>
              启用
            </Button>
          )}
          {record.dishCount > 0 ? (
            <Tooltip title={`该分类下还有 ${record.dishCount} 道菜，需先调整菜品分类`}>
              <Button type="link" size="small" danger disabled>
                删除
              </Button>
            </Tooltip>
          ) : (
            <Popconfirm
              title={`删除「${record.name}」？`}
              description="删除后不可恢复（原型阶段仅影响内存 Mock 数据）"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleRemove(record)}
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
          <h2>分类管理</h2>
          <p>共 {data.total} 个菜品分类，支持按名称 / 编码 / 状态筛选；分类改名会同步更新菜品归属（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} loading={loading || summaryLoading} onClick={() => void refreshAll()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增分类
          </Button>
        </Space>
      </div>

      <div className="kpi-grid">
        <Card loading={summaryLoading}>
          <Statistic
            title="分类总数"
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
            title="已停用"
            value={summary.disabled}
            suffix={<span style={{ fontSize: 13 }}>个</span>}
          />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic
            title="已归类菜品"
            value={summary.dishTotal}
            suffix={<span style={{ fontSize: 13 }}>道</span>}
          />
        </Card>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索分类名称 / 编码"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onSearch={(value) => {
              setKeyword(value);
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

        <Table<CategoryRow>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 900 }}
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
          locale={{ emptyText: '没有符合条件的分类' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑分类 · ${editing.name}` : '新增分类'}
        width={460}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="category-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<CategoryFormValues>
          id="category-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 20, message: '名称最多 20 个字符' },
            ]}
            extra="改名后，该分类下的菜品会自动归到新名称下"
          >
            <Input placeholder="如：招牌主菜" maxLength={20} />
          </Form.Item>

          <Form.Item
            name="code"
            label="分类编码"
            rules={[
              { required: true, message: '请输入分类编码' },
              { pattern: /^[A-Za-z][A-Za-z0-9_]*$/, message: '以字母开头，只能包含字母、数字、下划线' },
            ]}
          >
            <Input placeholder="如：SIGNATURE" maxLength={30} />
          </Form.Item>

          <Form.Item
            name="sort"
            label="排序"
            extra="数值越小越靠前"
            rules={[{ required: true, message: '请输入排序值' }]}
          >
            <InputNumber min={1} max={999} precision={0} style={{ width: '100%' }} placeholder="10" />
          </Form.Item>

          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Radio.Group>
              <Radio value="enabled">启用中</Radio>
              <Radio value="disabled">已停用</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="remark" label="备注" rules={[{ max: 60, message: '备注最多 60 个字符' }]}>
            <Input.TextArea rows={2} maxLength={60} showCount placeholder="如：门店主打、毛利较高的招牌菜" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
