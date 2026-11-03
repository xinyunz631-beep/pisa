import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Descriptions,
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
  fetchBusinessStoreOptions,
  fetchMenuDishes,
  fetchMenus,
  removeMenu,
  saveMenu,
  type Menu,
  type MenuDish,
  type MenuInput,
  type MenuPeriod,
  type MenuStatus,
} from '../../../services/business';
import type { Paged } from '../../../types';
import { dishStatusMeta, money } from '../../../utils/format';

const emptyPage: Paged<Menu> = { list: [], total: 0, page: 1, pageSize: 10 };

const periodMeta: Record<MenuPeriod, { label: string; color: string }> = {
  morning: { label: '早市', color: 'orange' },
  noon: { label: '午市', color: 'blue' },
  evening: { label: '晚市', color: 'purple' },
  all: { label: '全天', color: 'cyan' },
};

const menuStatusMeta: Record<MenuStatus, { label: string; color: string }> = {
  online: { label: '已上架', color: 'green' },
  offline: { label: '已下架', color: 'default' },
};

export default function MenusPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<MenuInput>();

  const [keyword, setKeyword] = useState('');
  const [storeId, setStoreId] = useState<string>();
  const [status, setStatus] = useState<MenuStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [storeOptions, setStoreOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [data, setData] = useState<Paged<Menu>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Menu | null>(null);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Menu | null>(null);
  const [detailDishes, setDetailDishes] = useState<MenuDish[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchMenus({ keyword, storeId, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, storeId, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchBusinessStoreOptions().then(setStoreOptions);
  }, []);

  const resetFilters = () => {
    setKeyword('');
    setStoreId(undefined);
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ period: 'all', status: 'online' });
    setDrawerOpen(true);
  };

  const openEdit = (menu: Menu) => {
    setEditing(menu);
    form.resetFields();
    form.setFieldsValue({
      name: menu.name,
      storeId: menu.storeId,
      period: menu.period,
      status: menu.status,
    });
    setDrawerOpen(true);
  };

  const openDetail = async (menu: Menu) => {
    setDetail(menu);
    setDetailDishes([]);
    setDetailLoading(true);
    try {
      setDetailDishes(await fetchMenuDishes(menu.id));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async (values: MenuInput) => {
    setSaving(true);
    try {
      await saveMenu({ ...values, id: editing?.id });
      message.success(editing ? '菜单已更新' : '菜单已新增');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (menu: Menu) => {
    await removeMenu(menu.id);
    message.success(`${menu.name} 已删除`);
    await load();
  };

  const columns: ColumnsType<Menu> = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      width: 180,
      render: (value: string, menu) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{menu.id}</div>
        </div>
      ),
    },
    { title: '所属门店', dataIndex: 'storeName', width: 140 },
    {
      title: '菜品数量',
      dataIndex: 'dishCount',
      width: 100,
      align: 'right',
      render: (value: number) => `${value} 道`,
    },
    {
      title: '生效时段',
      dataIndex: 'period',
      width: 100,
      render: (value: MenuPeriod) => (
        <Tag color={periodMeta[value].color}>{periodMeta[value].label}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: MenuStatus) => (
        <Tag color={menuStatusMeta[value].color}>{menuStatusMeta[value].label}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      fixed: 'right',
      render: (_, menu) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => void openDetail(menu)}>
            查看
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(menu)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除「${menu.name}」？`}
            description="删除后不可恢复（原型阶段仅影响内存 Mock 数据）"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRemove(menu)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const detailColumns: ColumnsType<MenuDish> = [
    { title: '菜品名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', width: 110 },
    {
      title: '价格',
      dataIndex: 'price',
      width: 100,
      align: 'right',
      render: (value: number) => <span style={{ fontWeight: 600 }}>{money(value)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: MenuDish['status']) => (
        <Tag color={dishStatusMeta[value].color}>{dishStatusMeta[value].label}</Tag>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>菜单管理</h2>
          <p>共 {data.total} 个菜单，支持按名称 / 门店 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建菜单
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索菜单名称 / 门店"
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
            placeholder="全部门店"
            style={{ width: 160 }}
            options={storeOptions}
            value={storeId}
            onChange={(value) => {
              setStoreId(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '已上架', value: 'online' },
              { label: '已下架', value: 'offline' },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<Menu>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 980 }}
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
          locale={{ emptyText: keyword || storeId || status !== 'all' ? '没有找到匹配的菜单' : '暂无菜单数据' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑菜单 · ${editing.name}` : '新建菜单'}
        width={460}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="menu-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<MenuInput>
          id="menu-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="菜单名称"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="如：午市套餐、秋季新品" maxLength={30} />
          </Form.Item>

          <Form.Item
            name="storeId"
            label="所属门店"
            rules={[{ required: true, message: '请选择所属门店' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择门店"
              options={storeOptions}
            />
          </Form.Item>

          <Form.Item name="period" label="生效时段" rules={[{ required: true, message: '请选择生效时段' }]}>
            <Radio.Group
              options={[
                { label: '早市', value: 'morning' },
                { label: '午市', value: 'noon' },
                { label: '晚市', value: 'evening' },
                { label: '全天', value: 'all' },
              ]}
            />
          </Form.Item>

          <Form.Item name="status" label="菜单状态" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { label: '已上架', value: 'online' },
                { label: '已下架', value: 'offline' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={detail ? `菜单详情 · ${detail.name}` : '菜单详情'}
        width={640}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        destroyOnClose
      >
        {detail && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="菜单编号">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="菜单名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="所属门店">{detail.storeName}</Descriptions.Item>
              <Descriptions.Item label="生效时段">
                <Tag color={periodMeta[detail.period].color}>{periodMeta[detail.period].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="菜品数量">{detail.dishCount} 道</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={menuStatusMeta[detail.status].color}>
                  {menuStatusMeta[detail.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="更新时间" span={2}>
                {detail.updatedAt}
              </Descriptions.Item>
            </Descriptions>

            <Table<MenuDish>
              rowKey="id"
              size="small"
              loading={detailLoading}
              columns={detailColumns}
              dataSource={detailDishes}
              pagination={false}
              scroll={{ y: 420 }}
              locale={{ emptyText: '该菜单下暂无菜品' }}
            />
          </Space>
        )}
      </Drawer>
    </div>
  );
}
