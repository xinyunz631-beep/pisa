import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  fetchMemberTags,
  removeMemberTag,
  saveMemberTag,
  updateMemberTagStatus,
} from '../../services/member';
import type { MemberTagConfig, TagCondition, TagStatus } from '../../types';

const TAG_FIELDS = [
  '累计消费金额',
  '消费频次',
  '最近消费距今天数',
  '注册天数',
  '会员等级',
  '所在城市',
  '生日月份',
];
const OPERATORS = ['≥', '≤', '=', '≠'];
const CATEGORIES: MemberTagConfig['category'][] = ['人群价值', '行为', '人口属性'];
const FREQUENCY_LABEL: Record<MemberTagConfig['updateFrequency'], string> = {
  daily: '每日自动更新',
  weekly: '每周自动更新',
  manual: '手动维护',
};

function conditionText(tag: MemberTagConfig): string {
  if (tag.type === 'manual' || tag.conditions.length === 0) return '手动打标';
  return tag.conditions
    .map((item: TagCondition) => `${item.field} ${item.operator} ${item.value}`)
    .join(' 且 ');
}

export default function MemberTagsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<MemberTagConfig>();

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>();
  const [type, setType] = useState<string>();
  const [status, setStatus] = useState<TagStatus | 'all'>('all');
  const [data, setData] = useState<MemberTagConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MemberTagConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const tagType = Form.useWatch('type', form);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchMemberTags({ keyword, category, type, status }));
    } finally {
      setLoading(false);
    }
  }, [keyword, category, type, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'auto', category: '行为', updateFrequency: 'daily', conditions: [] } as Partial<MemberTagConfig>);
    setOpen(true);
  };

  const openEdit = (tag: MemberTagConfig) => {
    setEditing(tag);
    form.resetFields();
    form.setFieldsValue(tag);
    setOpen(true);
  };

  const handleSave = async (values: MemberTagConfig) => {
    setSaving(true);
    try {
      const now = new Date();
      const updatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const isAuto = values.type === 'auto';
      await saveMemberTag({
        ...values,
        id: editing?.id ?? `TG${Date.now() % 100000}`,
        conditions: isAuto ? (values.conditions ?? []) : [],
        updateFrequency: isAuto ? values.updateFrequency : 'manual',
        coverage: editing?.coverage ?? 0,
        updatedAt,
        status: editing?.status ?? 'enabled',
      });
      message.success(editing ? '标签已更新' : '标签已创建');
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (tag: MemberTagConfig, checked: boolean) => {
    await updateMemberTagStatus(tag.id, checked ? 'enabled' : 'disabled');
    message.success(`标签「${tag.name}」已${checked ? '启用' : '停用'}`);
    await load();
  };

  const handleRemove = async (tag: MemberTagConfig) => {
    await removeMemberTag(tag.id);
    message.success(`标签「${tag.name}」已删除`);
    await load();
  };

  const columns: ColumnsType<MemberTagConfig> = [
    {
      title: '标签名称',
      dataIndex: 'name',
      width: 180,
      render: (value: string, tag) => (
        <Space size={6}>
          <span style={{ fontWeight: 500 }}>{value}</span>
          <Tag color={tag.type === 'auto' ? 'blue' : 'default'} style={{ marginInlineEnd: 0 }}>
            {tag.type === 'auto' ? '自动' : '手动'}
          </Tag>
        </Space>
      ),
    },
    { title: '标签分类', dataIndex: 'category', width: 120 },
    {
      title: '打标条件',
      key: 'conditions',
      render: (_, tag) => (
        <span style={{ color: tag.type === 'manual' ? 'rgba(0,0,0,0.45)' : undefined }}>
          {conditionText(tag)}
        </span>
      ),
    },
    {
      title: '更新方式',
      dataIndex: 'updateFrequency',
      width: 140,
      render: (value: MemberTagConfig['updateFrequency']) => FREQUENCY_LABEL[value],
    },
    {
      title: '覆盖人数',
      dataIndex: 'coverage',
      width: 110,
      align: 'right',
      render: (value: number) => value.toLocaleString('zh-CN'),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 150 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: TagStatus, tag) => (
        <Switch
          size="small"
          checked={value === 'enabled'}
          onChange={(checked) => void handleStatusChange(tag, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, tag) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(tag)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除标签「${tag.name}」？`}
            description="删除后不再参与人群计算（仅影响 Mock 数据）"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRemove(tag)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
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
          <h2>标签管理</h2>
          <p>
            基于 ClickHouse 引擎进行人群打标：支持人群价值 / 行为 / 人口属性标签，手动打标与
            定时自动更新（Mock 数据）
          </p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建标签
          </Button>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        message="数据源：ClickHouse"
        description="自动标签按设定频率从数仓重算人群包（当前 Mock 为每日 03:00 / 每周一 03:00）；手动标签由运营人工维护，不参与定时计算。"
      />

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索标签名称"
            style={{ width: 220 }}
            onSearch={(value) => setKeyword(value)}
          />
          <Select
            allowClear
            placeholder="全部分类"
            style={{ width: 140 }}
            options={CATEGORIES.map((item) => ({ label: item, value: item }))}
            value={category}
            onChange={setCategory}
          />
          <Select
            allowClear
            placeholder="全部类型"
            style={{ width: 130 }}
            options={[
              { label: '自动标签', value: 'auto' },
              { label: '手动标签', value: 'manual' },
            ]}
            value={type}
            onChange={setType}
          />
          <Select
            style={{ width: 130 }}
            value={status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '启用', value: 'enabled' },
              { label: '停用', value: 'disabled' },
            ]}
            onChange={setStatus}
          />
          <Button
            onClick={() => {
              setKeyword('');
              setCategory(undefined);
              setType(undefined);
              setStatus('all');
            }}
          >
            重置
          </Button>
        </Space>

        <Table<MemberTagConfig>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 1120 }}
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 个标签` }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑标签 · ${editing.name}` : '新建标签'}
        width={480}
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="tag-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<MemberTagConfig> id="tag-form" form={form} layout="vertical" onFinish={(values) => void handleSave(values)}>
          <Form.Item name="name" label="标签名称" rules={[{ required: true, message: '请输入标签名称' }]}>
            <Input placeholder="如：高价值客户" maxLength={20} />
          </Form.Item>

          <Form.Item name="category" label="标签分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select options={CATEGORIES.map((item) => ({ label: item, value: item }))} />
          </Form.Item>

          <Form.Item name="type" label="标签类型" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { label: '自动标签（按条件计算）', value: 'auto' },
                { label: '手动标签（人工维护）', value: 'manual' },
              ]}
            />
          </Form.Item>

          {tagType === 'auto' && (
            <>
              <Form.Item
                label="打标条件"
                required
                extra="多个条件之间为「且」关系；建议条件值填写数字或枚举值"
              >
                <Form.List
                  name="conditions"
                  rules={[
                    {
                      validator: async (_, value: TagCondition[] | undefined) => {
                        if (!value || value.length === 0) {
                          throw new Error('至少添加一个打标条件');
                        }
                      },
                    },
                  ]}
                >
                  {(fields, { add, remove }, { errors }) => (
                    <>
                      {fields.map((field) => (
                        <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                          <Form.Item
                            name={[field.name, 'field']}
                            rules={[{ required: true, message: '选择指标' }]}
                            style={{ marginBottom: 0, width: 150 }}
                          >
                            <Select placeholder="指标" options={TAG_FIELDS.map((f) => ({ label: f, value: f }))} />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'operator']}
                            rules={[{ required: true, message: '运算符' }]}
                            style={{ marginBottom: 0, width: 80 }}
                          >
                            <Select placeholder="运算" options={OPERATORS.map((op) => ({ label: op, value: op }))} />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'value']}
                            rules={[{ required: true, message: '条件值' }]}
                            style={{ marginBottom: 0, width: 120 }}
                          >
                            <Input placeholder="值" />
                          </Form.Item>
                          <Button type="link" danger onClick={() => remove(field.name)}>
                            删除
                          </Button>
                        </Space>
                      ))}
                      <Button type="dashed" block onClick={() => add({ field: TAG_FIELDS[0], operator: '≥', value: '' })}>
                        + 添加条件
                      </Button>
                      <Form.ErrorList errors={errors} />
                    </>
                  )}
                </Form.List>
              </Form.Item>

              <Form.Item name="updateFrequency" label="更新频率" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: '每日自动更新', value: 'daily' },
                    { label: '每周自动更新', value: 'weekly' },
                  ]}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Drawer>
    </div>
  );
}
