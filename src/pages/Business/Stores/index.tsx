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
  fetchBusinessStores,
  removeBusinessStore,
  saveBusinessStore,
  type BusinessStore,
  type BusinessStoreInput,
} from '../../../services/business';
import type { Paged, StoreStatus } from '../../../types';
import { storeStatusMeta } from '../../../utils/format';

const emptyPage: Paged<BusinessStore> = { list: [], total: 0, page: 1, pageSize: 10 };

export default function StoresPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<BusinessStoreInput>();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StoreStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<BusinessStore>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessStore | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchBusinessStores({ keyword, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetFilters = () => {
    setKeyword('');
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'open', businessHours: '10:00-22:00' });
    setDrawerOpen(true);
  };

  const openEdit = (store: BusinessStore) => {
    setEditing(store);
    form.resetFields();
    form.setFieldsValue({
      name: store.name,
      city: store.city,
      address: store.address,
      manager: store.manager,
      phone: store.phone,
      businessHours: store.businessHours,
      status: store.status,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: BusinessStoreInput) => {
    setSaving(true);
    try {
      await saveBusinessStore({ ...values, id: editing?.id });
      message.success(editing ? '门店已更新' : '门店已新增');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (store: BusinessStore) => {
    await removeBusinessStore(store.id);
    message.success(`${store.name} 已删除`);
    await load();
  };

  const columns: ColumnsType<BusinessStore> = [
    { title: '门店编号', dataIndex: 'id', width: 90 },
    {
      title: '门店名称',
      dataIndex: 'name',
      width: 150,
      render: (value: string) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    { title: '城市', dataIndex: 'city', width: 80 },
    { title: '地址', dataIndex: 'address', width: 180 },
    { title: '店长', dataIndex: 'manager', width: 90 },
    { title: '联系电话', dataIndex: 'phone', width: 125 },
    { title: '营业时间', dataIndex: 'businessHours', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: StoreStatus) => (
        <Tag color={storeStatusMeta[value].color}>{storeStatusMeta[value].label}</Tag>
      ),
    },
    { title: '开业时间', dataIndex: 'openedAt', width: 130 },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, store) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(store)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除「${store.name}」？`}
            description="删除后不可恢复（原型阶段仅影响内存 Mock 数据）"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRemove(store)}
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
          <h2>门店管理</h2>
          <p>共 {data.total} 家门店，支持按名称 / 城市关键词与营业状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建门店
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索门店名称 / 城市 / 编号"
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 140 }}
            value={status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '营业中', value: 'open' },
              { label: '筹备中', value: 'preparing' },
              { label: '已停业', value: 'closed' },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<BusinessStore>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1160 }}
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
            emptyText: keyword || status !== 'all' ? '没有找到匹配的门店' : '暂无门店数据',
          }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑门店 · ${editing.name}` : '新建门店'}
        width={460}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="store-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<BusinessStoreInput>
          id="store-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="门店名称"
            rules={[{ required: true, message: '请输入门店名称' }]}
          >
            <Input placeholder="如：上海静安店" maxLength={30} />
          </Form.Item>

          <Space size={12} align="start">
            <Form.Item
              name="city"
              label="城市"
              rules={[{ required: true, message: '请输入城市' }]}
              style={{ width: 200 }}
            >
              <Input placeholder="如：上海" maxLength={10} />
            </Form.Item>
            <Form.Item
              name="manager"
              label="店长"
              rules={[{ required: true, message: '请输入店长姓名' }]}
              style={{ width: 200 }}
            >
              <Input placeholder="如：周明" maxLength={10} />
            </Form.Item>
          </Space>

          <Form.Item
            name="address"
            label="门店地址"
            rules={[{ required: true, message: '请输入门店地址' }]}
          >
            <Input placeholder="如：静安区南京西路 1266 号" maxLength={60} />
          </Form.Item>

          <Space size={12} align="start">
            <Form.Item
              name="phone"
              label="联系电话"
              rules={[
                { required: true, message: '请输入联系电话' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入 11 位手机号' },
              ]}
              style={{ width: 200 }}
            >
              <Input placeholder="如：13800000000" maxLength={11} />
            </Form.Item>
            <Form.Item
              name="businessHours"
              label="营业时间"
              rules={[{ required: true, message: '请输入营业时间' }]}
              style={{ width: 200 }}
            >
              <Input placeholder="如：10:00-22:00" maxLength={20} />
            </Form.Item>
          </Space>

          <Form.Item name="status" label="营业状态" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { label: '营业中', value: 'open' },
                { label: '筹备中', value: 'preparing' },
                { label: '已停业', value: 'closed' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
