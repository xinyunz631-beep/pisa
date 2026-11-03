import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchStaff, fetchStaffFormOptions, saveStaff } from '../../../services/ops';
import type { Staff, StaffStatus } from '../../../services/ops';
import type { Paged } from '../../../types';

const emptyPage: Paged<Staff> = { list: [], total: 0, page: 1, pageSize: 10 };

const staffStatusMeta: Record<StaffStatus, { label: string; color: string }> = {
  active: { label: '在职', color: 'green' },
  disabled: { label: '停用', color: 'red' },
};

type StaffOptions = Awaited<ReturnType<typeof fetchStaffFormOptions>>;

interface StaffFormValues {
  name: string;
  employeeNo: string;
  phone: string;
  position: string;
  storeName: string;
  status: StaffStatus;
  joinedAt: Dayjs;
}

/** 人员管理：人员检索、新增/编辑，以及基础信息 + 账号状态详情。 */
export default function StaffPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<StaffFormValues>();

  const [keyword, setKeyword] = useState('');
  const [position, setPosition] = useState<string>();
  const [storeName, setStoreName] = useState<string>();
  const [status, setStatus] = useState<StaffStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [options, setOptions] = useState<StaffOptions>({ positions: [], stores: [], roles: [] });
  const [data, setData] = useState<Paged<Staff>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<Staff | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchStaff({ keyword, position, storeName, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, position, storeName, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchStaffFormOptions().then(setOptions);
  }, []);

  const resetFilters = () => {
    setKeyword('');
    setPosition(undefined);
    setStoreName(undefined);
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active', joinedAt: dayjs('2026-11-04') });
    setDrawerOpen(true);
  };

  const openEdit = (member: Staff) => {
    setEditing(member);
    form.resetFields();
    form.setFieldsValue({
      name: member.name,
      employeeNo: member.employeeNo,
      phone: member.phone,
      position: member.position,
      storeName: member.storeName,
      status: member.status,
      joinedAt: dayjs(member.joinedAt),
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: StaffFormValues) => {
    setSaving(true);
    try {
      await saveStaff({
        id: editing?.id,
        name: values.name,
        employeeNo: values.employeeNo,
        phone: values.phone,
        position: values.position,
        storeName: values.storeName,
        status: values.status,
        joinedAt: values.joinedAt.format('YYYY-MM-DD'),
      });
      message.success(editing ? '人员信息已更新' : '人员已新增');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<Staff> = [
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '工号', dataIndex: 'employeeNo', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 140 },
    { title: '岗位', dataIndex: 'position', width: 130 },
    { title: '所属门店', dataIndex: 'storeName', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: StaffStatus) => (
        <Tag color={staffStatusMeta[value].color}>{staffStatusMeta[value].label}</Tag>
      ),
    },
    { title: '入职时间', dataIndex: 'joinedAt', width: 120 },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, member) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => setDetail(member)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(member)}>
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>人员管理</h2>
          <p>共 {data.total} 名员工，支持按关键词 / 岗位 / 门店 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增人员
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索姓名 / 工号 / 手机号"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="全部岗位"
            style={{ width: 150 }}
            options={options.positions.map((item) => ({ label: item, value: item }))}
            value={position}
            onChange={(value) => {
              setPosition(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="全部门店"
            style={{ width: 160 }}
            options={options.stores.map((item) => ({ label: item, value: item }))}
            value={storeName}
            onChange={(value) => {
              setStoreName(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '在职', value: 'active' },
              { label: '停用', value: 'disabled' },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<Staff>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 970 }}
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
          locale={{
            emptyText: keyword || position || storeName || status !== 'all' ? '没有符合条件的人员' : '暂无人员数据',
          }}
        />
      </Card>

      <Drawer
        title={detail ? `人员详情 · ${detail.name}` : '人员详情'}
        width={540}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        destroyOnClose
      >
        {detail && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions title="基础信息" column={2} size="small" bordered>
              <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="工号">{detail.employeeNo}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="岗位">{detail.position}</Descriptions.Item>
              <Descriptions.Item label="所属门店">{detail.storeName}</Descriptions.Item>
              <Descriptions.Item label="入职时间">{detail.joinedAt}</Descriptions.Item>
              <Descriptions.Item label="邮箱" span={2}>
                {detail.email}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="账号状态" column={2} size="small" bordered>
              <Descriptions.Item label="账号状态">
                <Tag color={staffStatusMeta[detail.status].color}>
                  {staffStatusMeta[detail.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="权限角色">{detail.role}</Descriptions.Item>
              <Descriptions.Item label="最近登录" span={2}>
                {detail.lastLogin}
              </Descriptions.Item>
              <Descriptions.Item label="登录 IP" span={2}>
                {detail.loginIp}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Drawer>

      <Drawer
        title={editing ? `编辑人员 · ${editing.name}` : '新增人员'}
        width={460}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="staff-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<StaffFormValues>
          id="staff-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="如：张伟" maxLength={20} />
          </Form.Item>

          <Form.Item
            name="employeeNo"
            label="工号"
            rules={[
              { required: true, message: '请输入工号' },
              { pattern: /^[A-Za-z0-9]{3,12}$/, message: '3-12 位字母或数字' },
            ]}
          >
            <Input placeholder="如：EMP1027" maxLength={12} />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入 11 位有效手机号' },
            ]}
          >
            <Input placeholder="11 位手机号" maxLength={11} />
          </Form.Item>

          <Form.Item name="position" label="岗位" rules={[{ required: true, message: '请选择岗位' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择岗位"
              options={options.positions.map((item) => ({ label: item, value: item }))}
            />
          </Form.Item>

          <Form.Item
            name="storeName"
            label="所属门店"
            rules={[{ required: true, message: '请选择所属门店' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择门店"
              options={options.stores.map((item) => ({ label: item, value: item }))}
            />
          </Form.Item>

          <Form.Item
            name="joinedAt"
            label="入职时间"
            rules={[{ required: true, message: '请选择入职时间' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current.isAfter(dayjs('2026-11-04'), 'day')}
            />
          </Form.Item>

          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Radio.Group
              options={[
                { label: '在职', value: 'active' },
                { label: '停用', value: 'disabled' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
