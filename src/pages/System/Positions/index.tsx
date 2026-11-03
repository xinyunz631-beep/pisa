import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  fetchPositionDepartments,
  fetchPositions,
  removePosition,
  savePosition,
} from '../../../services/ops';
import type { PositionInput } from '../../../services/ops';
import type { Position, PositionStatus } from '../../../services/ops';
import type { Paged } from '../../../types';

const emptyPage: Paged<Position> = { list: [], total: 0, page: 1, pageSize: 10 };

const positionStatusMeta: Record<PositionStatus, { label: string; color: string }> = {
  active: { label: '启用', color: 'green' },
  disabled: { label: '停用', color: 'default' },
};

/** 岗位管理：维护岗位名称 / 编码 / 所属部门与启停状态。 */
export default function PositionsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<PositionInput>();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<PositionStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [departments, setDepartments] = useState<string[]>([]);
  const [data, setData] = useState<Paged<Position>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPositions({ keyword, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchPositionDepartments().then(setDepartments);
  }, []);

  const resetFilters = () => {
    setKeyword('');
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setDrawerOpen(true);
  };

  const openEdit = (position: Position) => {
    setEditing(position);
    form.resetFields();
    form.setFieldsValue({
      name: position.name,
      code: position.code,
      department: position.department,
      status: position.status,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: PositionInput) => {
    setSaving(true);
    try {
      await savePosition({ ...values, id: editing?.id });
      message.success(editing ? '岗位已更新' : '岗位已新增');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (position: Position) => {
    await removePosition(position.id);
    message.success(`岗位「${position.name}」已删除`);
    if (page > 1 && data.list.length === 1) {
      setPage(page - 1);
    } else {
      await load();
    }
  };

  const columns: ColumnsType<Position> = [
    { title: '岗位名称', dataIndex: 'name', width: 160 },
    { title: '岗位编码', dataIndex: 'code', width: 130 },
    { title: '所属部门', dataIndex: 'department', width: 140 },
    {
      title: '在岗人数',
      dataIndex: 'staffCount',
      width: 110,
      align: 'right',
      render: (value: number) => `${value} 人`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: PositionStatus) => (
        <Tag color={positionStatusMeta[value].color}>{positionStatusMeta[value].label}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 130 },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, position) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(position)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除岗位「${position.name}」？`}
            description="删除后不可恢复（原型阶段仅影响内存 Mock 数据）"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRemove(position)}
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
          <h2>岗位管理</h2>
          <p>共 {data.total} 个岗位，维护岗位编码、所属部门与启停状态（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增岗位
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索岗位名称"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '启用', value: 'active' },
              { label: '停用', value: 'disabled' },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<Position>
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
          locale={{ emptyText: keyword || status !== 'all' ? '没有符合条件的岗位' : '暂无岗位数据' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑岗位 · ${editing.name}` : '新增岗位'}
        width={440}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="position-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<PositionInput>
          id="position-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="岗位名称"
            rules={[{ required: true, message: '请输入岗位名称' }]}
          >
            <Input placeholder="如：门店店长" maxLength={20} />
          </Form.Item>

          <Form.Item
            name="code"
            label="岗位编码"
            rules={[
              { required: true, message: '请输入岗位编码' },
              { pattern: /^[A-Za-z0-9_-]{2,20}$/, message: '2-20 位字母、数字、下划线或中划线' },
            ]}
          >
            <Input placeholder="如：POS001" maxLength={20} />
          </Form.Item>

          <Form.Item
            name="department"
            label="所属部门"
            rules={[{ required: true, message: '请选择所属部门' }]}
          >
            <Select
              placeholder="选择部门"
              options={departments.map((item) => ({ label: item, value: item }))}
            />
          </Form.Item>

          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Radio.Group
              options={[
                { label: '启用', value: 'active' },
                { label: '停用', value: 'disabled' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
