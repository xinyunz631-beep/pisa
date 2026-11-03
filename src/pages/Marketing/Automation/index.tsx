import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Drawer, Form, Input, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  automationStatusMeta,
  fetchActivityOptions,
  fetchAudienceTags,
  fetchAutomationPlans,
  marketingChannelMeta,
  notifyMethodMeta,
  saveAutomationPlan,
  triggerTypeMeta,
  updateAutomationStatus,
} from '../../../services/marketing';
import type {
  AutomationPlan,
  AutomationStatus,
  MarketingActivityOption,
  MarketingActivityType,
  MarketingChannel,
  NotifyMethod,
  TriggerType,
} from '../../../services/marketing';
import type { Paged } from '../../../types';

const emptyPage: Paged<AutomationPlan> = { list: [], total: 0, page: 1, pageSize: 10 };

const activityTypeColor: Record<MarketingActivityType, string> = {
  满减活动: 'volcano',
  满折活动: 'geekblue',
  发券活动: 'green',
};

const triggerOptions: Array<{ label: string; value: TriggerType }> = [
  { label: '定时触发', value: 'scheduled' },
  { label: '事件触发', value: 'event' },
];

const channelOptions = (Object.keys(marketingChannelMeta) as MarketingChannel[]).map((value) => ({
  value,
  label: marketingChannelMeta[value].label,
}));

const notifyOptions = (Object.keys(notifyMethodMeta) as NotifyMethod[]).map((value) => ({
  value,
  label: notifyMethodMeta[value].label,
}));

const statusOptions: Array<{ label: string; value: AutomationStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '启用中', value: 'enabled' },
  { label: '已暂停', value: 'paused' },
];

interface AutomationFormValues {
  name: string;
  activityId: string;
  audiences: string[];
  triggerType: TriggerType;
  triggerRule: string;
  channels: MarketingChannel[];
  notifyMethod: NotifyMethod;
}

/** 自动化营销：按人群 + 触发条件自动触达的营销计划。 */
export default function AutomationPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<AutomationFormValues>();

  const [keyword, setKeyword] = useState('');
  const [channel, setChannel] = useState<MarketingChannel | 'all'>('all');
  const [status, setStatus] = useState<AutomationStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<AutomationPlan>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [activityOptions, setActivityOptions] = useState<MarketingActivityOption[]>([]);
  const [audienceTags, setAudienceTags] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAutomationPlans({ keyword, channel, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, channel, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchActivityOptions().then(setActivityOptions);
    void fetchAudienceTags().then(setAudienceTags);
  }, []);

  const resetFilters = () => {
    setKeyword('');
    setChannel('all');
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (plan: AutomationPlan) => {
    setEditing(plan);
    form.resetFields();
    form.setFieldsValue({
      name: plan.name,
      activityId: plan.activityId,
      audiences: plan.audiences,
      triggerType: plan.triggerType,
      triggerRule: plan.triggerRule,
      channels: plan.channels,
      notifyMethod: plan.notifyMethod,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: AutomationFormValues) => {
    setSaving(true);
    try {
      await saveAutomationPlan({
        id: editing?.id,
        name: values.name,
        activityId: values.activityId,
        audiences: values.audiences,
        triggerType: values.triggerType,
        triggerRule: values.triggerRule,
        channels: values.channels,
        notifyMethod: values.notifyMethod,
      });
      message.success(editing ? '自动化计划已更新' : '自动化计划已创建');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plan: AutomationPlan) => {
    const enabled = plan.status === 'paused';
    await updateAutomationStatus(plan.id, enabled);
    message.success(`${plan.name} 已${enabled ? '启用' : '暂停'}`);
    await load();
  };

  const columns: ColumnsType<AutomationPlan> = [
    {
      title: '计划名称',
      dataIndex: 'name',
      width: 180,
      render: (value: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.id}</div>
        </div>
      ),
    },
    {
      title: '关联活动',
      dataIndex: 'activityName',
      width: 220,
      render: (value: string, record) => (
        <Space size={6}>
          <Tag color={activityTypeColor[record.activityType]}>{record.activityType}</Tag>
          <span>{value}</span>
        </Space>
      ),
    },
    {
      title: '人群标签',
      dataIndex: 'audiences',
      width: 190,
      render: (value: string[]) => (
        <Space size={4} wrap>
          {value.slice(0, 2).map((tag) => (
            <Tag key={tag} color="blue">
              {tag}
            </Tag>
          ))}
          {value.length > 2 && <Tag>+{value.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: '触发方式',
      key: 'trigger',
      width: 200,
      render: (_, record) => (
        <div style={{ lineHeight: 1.7 }}>
          <Tag color={triggerTypeMeta[record.triggerType].color}>
            {triggerTypeMeta[record.triggerType].label}
          </Tag>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.triggerRule}</div>
        </div>
      ),
    },
    {
      title: '渠道',
      dataIndex: 'channels',
      width: 150,
      render: (value: MarketingChannel[]) => (
        <Space size={4} wrap>
          {value.map((item) => (
            <Tag key={item} color={marketingChannelMeta[item].color}>
              {marketingChannelMeta[item].label}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '通知方式',
      dataIndex: 'notifyMethod',
      width: 110,
      render: (value: NotifyMethod) => (
        <Tag color={notifyMethodMeta[value].color}>{notifyMethodMeta[value].label}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: AutomationStatus) => (
        <Tag color={automationStatusMeta[value].color}>{automationStatusMeta[value].label}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 150 },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => void handleToggle(record)}>
            {record.status === 'paused' ? '启用' : '暂停'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>自动化营销</h2>
          <p>共 {data.total} 个自动化计划，支持按名称 / 渠道 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建计划
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索计划名称"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={channel}
            options={[{ label: '全部渠道', value: 'all' }, ...channelOptions]}
            onChange={(value) => {
              setChannel(value);
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

        <Table<AutomationPlan>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1420 }}
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
          locale={{ emptyText: '没有找到匹配的自动化计划' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑自动化计划 · ${editing.name}` : '新建自动化计划'}
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="automation-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<AutomationFormValues>
          id="automation-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="计划名称"
            rules={[{ required: true, message: '请输入计划名称' }]}
          >
            <Input placeholder="如：新客 24 小时欢迎计划" maxLength={30} />
          </Form.Item>

          <Form.Item
            name="activityId"
            label="关联活动"
            rules={[{ required: true, message: '请选择关联活动' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择关联的营销活动（含满减 / 满折 / 发券）"
              options={activityOptions.map((item) => ({ label: item.label, value: item.value }))}
            />
          </Form.Item>

          <Form.Item
            name="audiences"
            label="人群标签"
            rules={[{ required: true, message: '请选择人群标签' }]}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="选择人群标签（可多选）"
              options={audienceTags.map((tag) => ({ label: tag, value: tag }))}
            />
          </Form.Item>

          <Space size={12} align="start">
            <Form.Item
              name="triggerType"
              label="触发方式"
              rules={[{ required: true, message: '请选择触发方式' }]}
              style={{ width: 200 }}
            >
              <Select options={triggerOptions} placeholder="定时 / 事件" />
            </Form.Item>
            <Form.Item
              name="triggerRule"
              label="触发时间 / 周期"
              rules={[{ required: true, message: '请输入触发时间或周期' }]}
              style={{ width: 300 }}
            >
              <Input placeholder="如：每天 10:00 / 用户完成订单后 30 分钟" maxLength={40} />
            </Form.Item>
          </Space>

          <Form.Item
            name="channels"
            label="渠道"
            rules={[{ required: true, message: '请选择触达渠道' }]}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="选择渠道（可多选）"
              options={channelOptions}
            />
          </Form.Item>

          <Form.Item
            name="notifyMethod"
            label="通知方式"
            rules={[{ required: true, message: '请选择通知方式' }]}
          >
            <Select options={notifyOptions} placeholder="选择通知方式" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
