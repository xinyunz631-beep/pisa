import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  fetchPointOverview,
  fetchPointRecords,
  fetchPointRules,
  pointRecordTypeMeta,
  pointSceneMeta,
  savePointRule,
  type PointOverview,
  type PointRecord,
  type PointRecordType,
  type PointRule,
  type PointScene,
} from '../../../services/assets';
import type { Paged } from '../../../types';

const emptyRules: Paged<PointRule> = { list: [], total: 0, page: 1, pageSize: 10 };
const emptyRecords: Paged<PointRecord> = { list: [], total: 0, page: 1, pageSize: 10 };
const emptyOverview: PointOverview = { issued: 0, consumed: 0, circulating: 0 };

const sceneOptions: Array<{ label: string; value: PointScene }> = [
  { label: '消费', value: 'consume' },
  { label: '评价', value: 'review' },
  { label: '签到', value: 'checkin' },
  { label: '注册', value: 'register' },
];

const recordTypeOptions: Array<{ label: string; value: PointRecordType | 'all' }> = [
  { label: '全部类型', value: 'all' },
  { label: '获得', value: 'earn' },
  { label: '消耗', value: 'spend' },
  { label: '过期', value: 'expire' },
];

const recordTypeColor: Record<PointRecordType, string> = {
  earn: '#389e0d',
  spend: '#d4380d',
  expire: 'var(--text-secondary)',
};

interface PointRuleFormValues {
  name: string;
  scene: PointScene;
  points: number;
  enabled: boolean;
}

/** 积分管理：积分规则 + 积分流水。 */
export default function PointsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<PointRuleFormValues>();

  const [overview, setOverview] = useState<PointOverview>(emptyOverview);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [rules, setRules] = useState<Paged<PointRule>>(emptyRules);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulePage, setRulePage] = useState(1);
  const [rulePageSize, setRulePageSize] = useState(10);

  const [records, setRecords] = useState<Paged<PointRecord>>(emptyRecords);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordKeyword, setRecordKeyword] = useState('');
  const [recordType, setRecordType] = useState<PointRecordType | 'all'>('all');
  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(10);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PointRule | null>(null);
  const [saving, setSaving] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      setOverview(await fetchPointOverview());
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      setRules(await fetchPointRules({ page: rulePage, pageSize: rulePageSize }));
    } finally {
      setRulesLoading(false);
    }
  }, [rulePage, rulePageSize]);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      setRecords(
        await fetchPointRecords({
          keyword: recordKeyword,
          type: recordType,
          page: recordPage,
          pageSize: recordPageSize,
        }),
      );
    } finally {
      setRecordsLoading(false);
    }
  }, [recordKeyword, recordType, recordPage, recordPageSize]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const resetRecordFilters = () => {
    setRecordKeyword('');
    setRecordType('all');
    setRecordPage(1);
  };

  const openCreateRule = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ scene: 'consume', points: 10, enabled: true });
    setDrawerOpen(true);
  };

  const openEditRule = (rule: PointRule) => {
    setEditing(rule);
    form.resetFields();
    form.setFieldsValue({
      name: rule.name,
      scene: rule.scene,
      points: rule.points,
      enabled: rule.enabled,
    });
    setDrawerOpen(true);
  };

  const handleSaveRule = async (values: PointRuleFormValues) => {
    setSaving(true);
    try {
      await savePointRule({ id: editing?.id, ...values });
      message.success(editing ? '积分规则已更新' : '积分规则已新增');
      setDrawerOpen(false);
      await loadRules();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const ruleColumns: ColumnsType<PointRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      width: 200,
      render: (value: string, rule) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rule.id}</div>
        </div>
      ),
    },
    {
      title: '触发场景',
      dataIndex: 'scene',
      width: 110,
      render: (value: PointScene) => (
        <Tag color={pointSceneMeta[value].color}>{pointSceneMeta[value].label}</Tag>
      ),
    },
    {
      title: '积分值',
      dataIndex: 'points',
      width: 100,
      align: 'right',
      render: (value: number) => <span style={{ fontWeight: 600 }}>+{value}</span>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 100,
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'default'}>{value ? '启用中' : '已停用'}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, rule) => (
        <Button type="link" size="small" onClick={() => openEditRule(rule)}>
          编辑
        </Button>
      ),
    },
  ];

  const recordColumns: ColumnsType<PointRecord> = [
    { title: '会员昵称', dataIndex: 'nickname', width: 140 },
    {
      title: '变动类型',
      dataIndex: 'type',
      width: 110,
      render: (value: PointRecordType) => (
        <Tag color={pointRecordTypeMeta[value].color}>{pointRecordTypeMeta[value].label}</Tag>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      width: 100,
      align: 'right',
      render: (value: number, record) => (
        <span style={{ fontWeight: 600, color: recordTypeColor[record.type] }}>
          {record.type === 'earn' ? '+' : '-'}
          {value}
        </span>
      ),
    },
    { title: '时间', dataIndex: 'createdAt', width: 160 },
    { title: '备注', dataIndex: 'remark', width: 220 },
  ];

  const tabItems = [
    {
      key: 'rules',
      label: `积分规则（${rules.total}）`,
      children: (
        <div>
          <Table<PointRule>
            rowKey="id"
            loading={rulesLoading}
            columns={ruleColumns}
            dataSource={rules.list}
            scroll={{ x: 820 }}
            pagination={{
              current: rulePage,
              pageSize: rulePageSize,
              total: rules.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (nextPage, nextPageSize) => {
                setRulePage(nextPage);
                setRulePageSize(nextPageSize);
              },
            }}
          />
        </div>
      ),
    },
    {
      key: 'records',
      label: `积分流水（${records.total}）`,
      children: (
        <div>
          <Space wrap style={{ marginBottom: 16 }}>
            <Input.Search
              allowClear
              placeholder="搜索会员昵称 / 备注"
              prefix={<SearchOutlined />}
              style={{ width: 240 }}
              onSearch={(value) => {
                setRecordKeyword(value);
                setRecordPage(1);
              }}
            />
            <Select
              style={{ width: 130 }}
              value={recordType}
              options={recordTypeOptions}
              onChange={(value) => {
                setRecordType(value);
                setRecordPage(1);
              }}
            />
            <Button onClick={resetRecordFilters}>重置</Button>
          </Space>
          <Table<PointRecord>
            rowKey="id"
            loading={recordsLoading}
            columns={recordColumns}
            dataSource={records.list}
            scroll={{ x: 780 }}
            pagination={{
              current: recordPage,
              pageSize: recordPageSize,
              total: records.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (nextPage, nextPageSize) => {
                setRecordPage(nextPage);
                setRecordPageSize(nextPageSize);
              },
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>积分管理</h2>
          <p>配置积分获取规则，查看会员积分发放与消耗流水（Mock 数据）</p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={overviewLoading || rulesLoading || recordsLoading}
            onClick={() => {
              void loadOverview();
              void loadRules();
              void loadRecords();
            }}
          >
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRule}>
            新增规则
          </Button>
        </Space>
      </div>

      <div className="kpi-grid">
        <Card loading={overviewLoading}>
          <Statistic
            title="累计发放积分"
            value={overview.issued}
            suffix={<span style={{ fontSize: 13 }}>分</span>}
          />
        </Card>
        <Card loading={overviewLoading}>
          <Statistic
            title="累计消耗积分"
            value={overview.consumed}
            suffix={<span style={{ fontSize: 13 }}>分</span>}
          />
        </Card>
        <Card loading={overviewLoading}>
          <Statistic
            title="当前流通积分"
            value={overview.circulating}
            suffix={<span style={{ fontSize: 13 }}>分</span>}
          />
        </Card>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      <Drawer
        title={editing ? `编辑规则 · ${editing.name}` : '新增积分规则'}
        width={420}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="point-rule-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<PointRuleFormValues>
          id="point-rule-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSaveRule(values)}
        >
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="如：消费 1 元得 1 积分" maxLength={30} />
          </Form.Item>

          <Form.Item
            name="scene"
            label="触发场景"
            rules={[{ required: true, message: '请选择触发场景' }]}
          >
            <Select placeholder="选择触发场景" options={sceneOptions} />
          </Form.Item>

          <Form.Item
            name="points"
            label="积分值"
            rules={[{ required: true, message: '请输入积分值' }]}
          >
            <InputNumber
              min={1}
              max={10_000}
              precision={0}
              style={{ width: '100%' }}
              placeholder="10"
            />
          </Form.Item>

          <Form.Item name="enabled" label="状态" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { label: '启用', value: true },
                { label: '停用', value: false },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
