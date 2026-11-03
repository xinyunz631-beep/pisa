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
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  fetchNotificationTemplates,
  marketingChannelMeta,
  notificationSceneMeta,
  notificationStatusMeta,
  notifyMethodMeta,
  removeNotificationTemplate,
  saveNotificationTemplate,
  updateNotificationStatus,
} from '../../../services/marketing';
import type {
  MarketingChannel,
  NotificationScene,
  NotificationStatus,
  NotificationTemplate,
  NotifyMethod,
} from '../../../services/marketing';
import type { Paged } from '../../../types';

const emptyPage: Paged<NotificationTemplate> = { list: [], total: 0, page: 1, pageSize: 10 };

const sceneOptions = (Object.keys(notificationSceneMeta) as NotificationScene[]).map((value) => ({
  value,
  label: notificationSceneMeta[value].label,
}));

const channelOptions = (Object.keys(marketingChannelMeta) as MarketingChannel[]).map((value) => ({
  value,
  label: marketingChannelMeta[value].label,
}));

const notifyOptions = (Object.keys(notifyMethodMeta) as NotifyMethod[]).map((value) => ({
  value,
  label: notifyMethodMeta[value].label,
}));

const statusOptions: Array<{ label: string; value: NotificationStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
];

interface NotificationFormValues {
  name: string;
  scene: NotificationScene;
  channel: MarketingChannel;
  notifyMethod: NotifyMethod;
  content: string;
}

/** 消息通知：管理短信 / 微信 / 站内信的通知模板与预览。 */
export default function NotificationsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<NotificationFormValues>();

  const [keyword, setKeyword] = useState('');
  const [channel, setChannel] = useState<MarketingChannel | 'all'>('all');
  const [status, setStatus] = useState<NotificationStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<NotificationTemplate>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<NotificationTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchNotificationTemplates({ keyword, channel, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, channel, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const openEdit = (template: NotificationTemplate) => {
    setEditing(template);
    form.resetFields();
    form.setFieldsValue({
      name: template.name,
      scene: template.scene,
      channel: template.channel,
      notifyMethod: template.notifyMethod,
      content: template.content,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: NotificationFormValues) => {
    setSaving(true);
    try {
      await saveNotificationTemplate({
        id: editing?.id,
        name: values.name,
        scene: values.scene,
        channel: values.channel,
        notifyMethod: values.notifyMethod,
        content: values.content,
      });
      message.success(editing ? '通知模板已更新' : '通知模板已创建');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (template: NotificationTemplate) => {
    const enabled = template.status !== 'enabled';
    await updateNotificationStatus(template.id, enabled);
    message.success(`${template.name} 已${enabled ? '启用' : '停用'}`);
    await load();
  };

  const handleRemove = async (template: NotificationTemplate) => {
    await removeNotificationTemplate(template.id);
    message.success(`${template.name} 已删除`);
    await load();
  };

  const columns: ColumnsType<NotificationTemplate> = [
    {
      title: '模板名称',
      dataIndex: 'name',
      width: 190,
      render: (value: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.id}</div>
        </div>
      ),
    },
    {
      title: '场景',
      dataIndex: 'scene',
      width: 110,
      render: (value: NotificationScene) => (
        <Tag color={notificationSceneMeta[value].color}>{notificationSceneMeta[value].label}</Tag>
      ),
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 100,
      render: (value: MarketingChannel) => (
        <Tag color={marketingChannelMeta[value].color}>{marketingChannelMeta[value].label}</Tag>
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
      title: '内容摘要',
      dataIndex: 'summary',
      width: 280,
      ellipsis: true,
      render: (value: string) => <span style={{ color: 'rgba(0,0,0,0.65)' }}>{value}</span>,
    },
    {
      title: '发送量',
      dataIndex: 'sendCount',
      width: 110,
      align: 'right',
      render: (value: number) => value.toLocaleString('zh-CN'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: NotificationStatus) => (
        <Tag color={notificationStatusMeta[value].color}>{notificationStatusMeta[value].label}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 150 },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => setPreview(record)}>
            预览
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => void handleToggle(record)}>
            {record.status === 'enabled' ? '停用' : '启用'}
          </Button>
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
        </Space>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>消息通知</h2>
          <p>共 {data.total} 个通知模板，支持按名称 / 渠道 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建模板
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索模板名称"
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

        <Table<NotificationTemplate>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1430 }}
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
          locale={{ emptyText: '没有找到匹配的通知模板' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑通知模板 · ${editing.name}` : '新建通知模板'}
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="notification-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<NotificationFormValues>
          id="notification-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="如：新券到账通知" maxLength={30} />
          </Form.Item>

          <Form.Item
            name="scene"
            label="通知场景"
            rules={[{ required: true, message: '请选择通知场景' }]}
          >
            <Select options={sceneOptions} placeholder="选择场景" />
          </Form.Item>

          <Form.Item
            name="channel"
            label="渠道"
            rules={[{ required: true, message: '请选择渠道' }]}
          >
            <Select options={channelOptions} placeholder="选择渠道" />
          </Form.Item>

          <Form.Item
            name="notifyMethod"
            label="通知方式"
            rules={[{ required: true, message: '请选择通知方式' }]}
          >
            <Select options={notifyOptions} placeholder="选择通知方式" />
          </Form.Item>

          <Form.Item
            name="content"
            label="通知内容"
            rules={[{ required: true, message: '请输入通知内容' }]}
          >
            <Input.TextArea
              rows={6}
              maxLength={200}
              showCount
              placeholder="支持变量占位符，如：{会员昵称}、{券名称}、{订单号}"
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={preview ? `通知预览 · ${preview.name}` : '通知预览'}
        width={520}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        destroyOnClose
      >
        {preview && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="模板名称">{preview.name}</Descriptions.Item>
              <Descriptions.Item label="场景">
                <Tag color={notificationSceneMeta[preview.scene].color}>
                  {notificationSceneMeta[preview.scene].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="渠道">
                <Tag color={marketingChannelMeta[preview.channel].color}>
                  {marketingChannelMeta[preview.channel].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="通知方式">
                <Tag color={notifyMethodMeta[preview.notifyMethod].color}>
                  {notifyMethodMeta[preview.notifyMethod].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={notificationStatusMeta[preview.status].color}>
                  {notificationStatusMeta[preview.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="累计发送量">
                {preview.sendCount.toLocaleString('zh-CN')} 条
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">{preview.updatedAt}</Descriptions.Item>
            </Descriptions>

            <div>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>通知内容</div>
              <div
                style={{
                  background: '#f5f6f8',
                  borderRadius: 8,
                  padding: 16,
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  color: 'rgba(0,0,0,0.72)',
                }}
              >
                {preview.content}
              </div>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
