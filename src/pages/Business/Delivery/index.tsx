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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  fetchBusinessStoreOptions,
  fetchDeliveryOverview,
  fetchDeliveryRules,
  removeDeliveryRule,
  saveDeliveryRule,
  type DeliveryOverview,
  type DeliveryRule,
  type DeliveryRuleInput,
  type DeliveryStatus,
} from '../../../services/business';
import type { Paged } from '../../../types';
import { money } from '../../../utils/format';

const emptyPage: Paged<DeliveryRule> = { list: [], total: 0, page: 1, pageSize: 10 };

const deliveryStatusMeta: Record<DeliveryStatus, { label: string; color: string }> = {
  enabled: { label: '启用中', color: 'green' },
  disabled: { label: '已停用', color: 'default' },
};

export default function DeliveryPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<DeliveryRuleInput>();

  const [storeId, setStoreId] = useState<string>();
  const [status, setStatus] = useState<DeliveryStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [storeOptions, setStoreOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [data, setData] = useState<Paged<DeliveryRule>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<DeliveryOverview>({
    todayOrders: 0,
    avgMinutes: 0,
    onTimeRate: 0,
  });
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryRule | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchDeliveryRules({ storeId, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [storeId, status, page, pageSize]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      setOverview(await fetchDeliveryOverview());
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchBusinessStoreOptions().then(setStoreOptions);
    void loadOverview();
  }, [loadOverview]);

  const resetFilters = () => {
    setStoreId(undefined);
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      rangeKm: 3,
      minAmount: 20,
      fee: 5,
      etaMinutes: 30,
      status: 'enabled',
    });
    setDrawerOpen(true);
  };

  const openEdit = (rule: DeliveryRule) => {
    setEditing(rule);
    form.resetFields();
    form.setFieldsValue({
      name: rule.name,
      storeId: rule.storeId,
      rangeKm: rule.rangeKm,
      minAmount: rule.minAmount,
      fee: rule.fee,
      etaMinutes: rule.etaMinutes,
      status: rule.status,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: DeliveryRuleInput) => {
    setSaving(true);
    try {
      await saveDeliveryRule({ ...values, id: editing?.id });
      message.success(editing ? '配送规则已更新' : '配送规则已新增');
      setDrawerOpen(false);
      await Promise.all([load(), loadOverview()]);
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (rule: DeliveryRule) => {
    await removeDeliveryRule(rule.id);
    message.success(`${rule.name} 已删除`);
    await Promise.all([load(), loadOverview()]);
  };

  const columns: ColumnsType<DeliveryRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      width: 190,
      render: (value: string, rule) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{rule.id}</div>
        </div>
      ),
    },
    { title: '门店', dataIndex: 'storeName', width: 140 },
    {
      title: '配送范围',
      dataIndex: 'rangeKm',
      width: 110,
      align: 'right',
      render: (value: number) => `${value} km`,
    },
    {
      title: '起送价',
      dataIndex: 'minAmount',
      width: 110,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '配送费',
      dataIndex: 'fee',
      width: 100,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '预计时长',
      dataIndex: 'etaMinutes',
      width: 110,
      align: 'right',
      render: (value: number) => `${value} 分钟`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: DeliveryStatus) => (
        <Tag color={deliveryStatusMeta[value].color}>{deliveryStatusMeta[value].label}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, rule) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(rule)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除「${rule.name}」？`}
            description="删除后不可恢复（原型阶段仅影响内存 Mock 数据）"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRemove(rule)}
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
          <h2>配送管理</h2>
          <p>共 {data.total} 条配送规则，支持按门店 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void Promise.all([load(), loadOverview()])}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建配送规则
          </Button>
        </Space>
      </div>

      <div className="kpi-grid">
        <Card>
          <Statistic
            title="今日配送单量"
            value={overview.todayOrders}
            suffix="单"
            loading={overviewLoading}
            valueStyle={{ fontSize: 28, fontWeight: 600 }}
          />
        </Card>
        <Card>
          <Statistic
            title="平均配送时长"
            value={overview.avgMinutes}
            precision={1}
            suffix="分钟"
            loading={overviewLoading}
            valueStyle={{ fontSize: 28, fontWeight: 600 }}
          />
        </Card>
        <Card>
          <Statistic
            title="准时率"
            value={overview.onTimeRate}
            precision={1}
            suffix="%"
            loading={overviewLoading}
            valueStyle={{ fontSize: 28, fontWeight: 600 }}
          />
        </Card>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
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
            style={{ width: 140 }}
            value={status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '启用中', value: 'enabled' },
              { label: '已停用', value: 'disabled' },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<DeliveryRule>
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
            emptyText: storeId || status !== 'all' ? '没有找到匹配的配送规则' : '暂无配送规则',
          }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑配送规则 · ${editing.name}` : '新建配送规则'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="delivery-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<DeliveryRuleInput>
          id="delivery-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="如：静安店标准配送" maxLength={30} />
          </Form.Item>

          <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择门店"
              options={storeOptions}
            />
          </Form.Item>

          <Space size={12} align="start">
            <Form.Item
              name="rangeKm"
              label="配送范围"
              rules={[{ required: true, message: '请输入配送范围' }]}
              style={{ width: 210 }}
            >
              <InputNumber min={0.5} max={20} step={0.5} precision={1} addonAfter="km" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="minAmount"
              label="起送价"
              rules={[{ required: true, message: '请输入起送价' }]}
              style={{ width: 210 }}
            >
              <InputNumber min={0} max={999} precision={2} addonAfter="元" style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space size={12} align="start">
            <Form.Item
              name="fee"
              label="配送费"
              rules={[{ required: true, message: '请输入配送费' }]}
              style={{ width: 210 }}
            >
              <InputNumber min={0} max={99} precision={2} addonAfter="元" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="etaMinutes"
              label="预计时长"
              rules={[{ required: true, message: '请输入预计时长' }]}
              style={{ width: 210 }}
            >
              <InputNumber min={5} max={120} precision={0} addonAfter="分钟" style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="status" label="规则状态" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { label: '启用中', value: 'enabled' },
                { label: '已停用', value: 'disabled' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
