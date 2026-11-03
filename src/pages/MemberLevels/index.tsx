import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchLevelConfigs, saveLevelConfig } from '../../services/member';
import type { MemberLevelConfig } from '../../types';
import { memberLevelMeta, money } from '../../utils/format';

const upgradeTypeMeta: Record<MemberLevelConfig['upgradeType'], string> = {
  amount: '按累计消费金额',
  frequency: '按消费频次',
  either: '满足任一条件',
};

export default function MemberLevelsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<MemberLevelConfig>();

  const [data, setData] = useState<MemberLevelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MemberLevelConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const upgradeType = Form.useWatch('upgradeType', form);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchLevelConfigs());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (level: MemberLevelConfig) => {
    setEditing(level);
    form.resetFields();
    form.setFieldsValue(level);
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      upgradeType: 'either',
      minAmount: 0,
      minFrequency: 0,
      discount: 10,
      pointsRate: 1,
      memberCount: 0,
      order: data.length + 1,
    } as Partial<MemberLevelConfig>);
    setOpen(true);
  };

  const handleSave = async (values: MemberLevelConfig) => {
    setSaving(true);
    try {
      const payload: MemberLevelConfig = {
        ...values,
        id: editing?.id ?? `LV${Date.now() % 100000}`,
        order: editing?.order ?? data.length + 1,
        memberCount: editing?.memberCount ?? 0,
      };
      await saveLevelConfig(payload);
      message.success(editing ? '等级规则已更新' : '等级已新增');
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const renderCondition = (level: MemberLevelConfig) => {
    if (level.upgradeType === 'amount') return `累计消费 ≥ ${money(level.minAmount)}`;
    if (level.upgradeType === 'frequency') return `消费频次 ≥ ${level.minFrequency} 次`;
    return `累计消费 ≥ ${money(level.minAmount)} 或 消费 ≥ ${level.minFrequency} 次`;
  };

  const columns: ColumnsType<MemberLevelConfig> = [
    {
      title: '等级',
      dataIndex: 'name',
      width: 140,
      render: (value: string) => (
        <Tag color={memberLevelMeta[value]?.color ?? 'default'} style={{ fontSize: 13 }}>
          {value}
        </Tag>
      ),
    },
    {
      title: '升级条件',
      key: 'condition',
      width: 300,
      render: (_, level) => (
        <Space direction="vertical" size={0}>
          <span>{renderCondition(level)}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {upgradeTypeMeta[level.upgradeType]}
          </span>
        </Space>
      ),
    },
    {
      title: '会员权益',
      key: 'benefit',
      width: 200,
      render: (_, level) => (
        <Space size={6}>
          <Tag color={level.discount < 10 ? 'volcano' : 'default'}>
            {level.discount < 10 ? `${level.discount} 折` : '无折扣'}
          </Tag>
          <Tag color="blue">积分 ×{level.pointsRate}</Tag>
        </Space>
      ),
    },
    {
      title: '当前人数',
      dataIndex: 'memberCount',
      width: 110,
      align: 'right',
      render: (value: number) => value.toLocaleString('zh-CN'),
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, level) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(level)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>等级配置</h2>
          <p>配置会员升级规则：按累计消费金额、消费频次判定，满足条件自动升级（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增等级
          </Button>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        message="升降级规则"
        description="系统每天 02:00 统一评估会员等级：满足升级条件即升级；降级仅在连续 180 天无消费时触发。等级权益（折扣、积分倍率）在评估完成后即时生效。"
      />

      <Card>
        <Table<MemberLevelConfig>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ x: 980 }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑等级 · ${editing.name}` : '新增等级'}
        width={460}
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="level-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<MemberLevelConfig> id="level-form" form={form} layout="vertical" onFinish={(values) => void handleSave(values)}>
          <Form.Item name="name" label="等级名称" rules={[{ required: true, message: '请输入等级名称' }]}>
            <Input placeholder="如：钻石会员" maxLength={10} />
          </Form.Item>

          <Form.Item name="upgradeType" label="升级判定方式" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { label: '累计消费金额', value: 'amount' },
                { label: '消费频次', value: 'frequency' },
                { label: '满足任一', value: 'either' },
              ]}
            />
          </Form.Item>

          {upgradeType !== 'frequency' && (
            <Form.Item
              name="minAmount"
              label="累计消费门槛（元）"
              rules={[{ required: true, message: '请输入消费金额门槛' }]}
              extra="达到该累计消费金额即可升级"
            >
              <InputNumber min={0} step={500} style={{ width: '100%' }} placeholder="2000" />
            </Form.Item>
          )}

          {upgradeType !== 'amount' && (
            <Form.Item
              name="minFrequency"
              label="消费频次门槛（次）"
              rules={[{ required: true, message: '请输入消费频次门槛' }]}
              extra="达到该消费次数即可升级"
            >
              <InputNumber min={0} step={5} style={{ width: '100%' }} placeholder="15" />
            </Form.Item>
          )}

          <Space size={12} align="start">
            <Form.Item
              name="discount"
              label="会员折扣（折）"
              rules={[{ required: true, message: '请输入折扣' }]}
              style={{ width: 200 }}
              extra="10 表示不打折"
            >
              <InputNumber min={1} max={10} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="pointsRate"
              label="积分倍率"
              rules={[{ required: true, message: '请输入积分倍率' }]}
              style={{ width: 200 }}
            >
              <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="description" label="等级说明">
            <Input.TextArea rows={3} maxLength={120} showCount placeholder="描述该等级的升级条件与权益" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
