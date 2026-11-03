import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { MinusCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  ALL_STORES_COUNT,
  activityStatusMeta,
  fetchFullReductions,
  fetchStoreOptions,
  removeFullReduction,
  saveFullReduction,
  updateFullReductionStatus,
} from '../../../services/marketing';
import type { ActivityStatus, FullReductionActivity, ReductionRule } from '../../../services/marketing';
import type { Paged } from '../../../types';

const emptyPage: Paged<FullReductionActivity> = { list: [], total: 0, page: 1, pageSize: 10 };

const statusOptions = (Object.keys(activityStatusMeta) as ActivityStatus[]).map((value) => ({
  value,
  label: activityStatusMeta[value].label,
}));

interface ReductionFormValues {
  name: string;
  timeRange: [Dayjs, Dayjs];
  storeNames: string[];
  rules: ReductionRule[];
  status: ActivityStatus;
}

/** 满减活动：按「满 X 减 Y」多档规则配置的营销活动。 */
export default function FullReductionPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<ReductionFormValues>();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ActivityStatus | 'all'>('all');
  const [range, setRange] = useState<[string, string]>();
  const [pickerValue, setPickerValue] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [storeOptions, setStoreOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [data, setData] = useState<Paged<FullReductionActivity>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FullReductionActivity | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchFullReductions({ keyword, status, range, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, status, range, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchStoreOptions().then(setStoreOptions);
  }, []);

  const resetFilters = () => {
    setKeyword('');
    setStatus('all');
    setRange(undefined);
    setPickerValue(null);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'notStarted',
      rules: [{ threshold: 100, reduce: 20 }],
    });
    setDrawerOpen(true);
  };

  const openEdit = (activity: FullReductionActivity) => {
    setEditing(activity);
    form.resetFields();
    form.setFieldsValue({
      name: activity.name,
      timeRange: [dayjs(activity.startAt), dayjs(activity.endAt)],
      storeNames: activity.storeNames,
      rules: activity.rules.map((rule) => ({ ...rule })),
      status: activity.status,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: ReductionFormValues) => {
    setSaving(true);
    try {
      await saveFullReduction({
        id: editing?.id,
        name: values.name,
        storeNames: values.storeNames,
        startAt: values.timeRange[0].format('YYYY-MM-DD HH:mm'),
        endAt: values.timeRange[1].format('YYYY-MM-DD HH:mm'),
        rules: values.rules,
        status: values.status,
      });
      message.success(editing ? '满减活动已更新' : '满减活动已创建');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (activity: FullReductionActivity) => {
    const enabled = activity.status === 'disabled';
    await updateFullReductionStatus(activity.id, enabled);
    message.success(`${activity.name} 已${enabled ? '启用' : '停用'}`);
    await load();
  };

  const handleRemove = async (activity: FullReductionActivity) => {
    await removeFullReduction(activity.id);
    message.success(`${activity.name} 已删除`);
    await load();
  };

  const columns: ColumnsType<FullReductionActivity> = [
    {
      title: '活动名称',
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
      title: '适用门店',
      dataIndex: 'storeNames',
      width: 190,
      render: (value: string[]) =>
        value.length >= ALL_STORES_COUNT ? (
          <Tag color="geekblue">全部门店</Tag>
        ) : (
          <Space size={4} wrap>
            {value.slice(0, 2).map((name) => (
              <Tag key={name}>{name}</Tag>
            ))}
            {value.length > 2 && <Tag>+{value.length - 2}</Tag>}
          </Space>
        ),
    },
    {
      title: '活动时间',
      key: 'period',
      width: 200,
      render: (_, record) => (
        <div style={{ fontSize: 12, lineHeight: 1.7 }}>
          <div>{record.startAt}</div>
          <div style={{ color: 'rgba(0,0,0,0.45)' }}>至 {record.endAt}</div>
        </div>
      ),
    },
    {
      title: '规则',
      dataIndex: 'rules',
      width: 160,
      render: (rules: ReductionRule[]) => (
        <div style={{ lineHeight: 1.7 }}>
          {rules.slice(0, 2).map((rule) => (
            <div key={rule.threshold}>
              满 {rule.threshold} 减 {rule.reduce}
            </div>
          ))}
          {rules.length > 2 && (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>剩余 {rules.length - 2} 档</div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: ActivityStatus) => (
        <Tag color={activityStatusMeta[value].color}>{activityStatusMeta[value].label}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 150 },
    {
      title: '操作',
      key: 'actions',
      width: 175,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => void handleToggle(record)}>
            {record.status === 'disabled' ? '启用' : '停用'}
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
          <h2>满减活动</h2>
          <p>共 {data.total} 个满减活动，支持按名称 / 状态 / 活动时间筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建活动
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索活动名称"
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
            options={[{ label: '全部状态', value: 'all' }, ...statusOptions]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <DatePicker.RangePicker
            value={pickerValue}
            onChange={(dates) => {
              setPickerValue(dates);
              const next =
                dates && dates[0] && dates[1]
                  ? ([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] as [string, string])
                  : undefined;
              setRange(next);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<FullReductionActivity>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1180 }}
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
          locale={{ emptyText: '没有找到匹配的满减活动' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑满减活动 · ${editing.name}` : '新建满减活动'}
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="full-reduction-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<ReductionFormValues>
          id="full-reduction-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input placeholder="如：周末满减日" maxLength={30} />
          </Form.Item>

          <Form.Item
            name="timeRange"
            label="活动时间"
            rules={[{ required: true, message: '请选择活动时间范围' }]}
          >
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="storeNames"
            label="适用门店"
            rules={[{ required: true, message: '请选择适用门店' }]}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="选择适用门店（可多选）"
              options={storeOptions}
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item label="满减规则" required>
            <Form.List
              name="rules"
              rules={[
                {
                  validator: async (_, value: ReductionRule[] | undefined) => {
                    if (!value || value.length < 1) {
                      throw new Error('至少添加一档满减规则');
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  {fields.map((field) => (
                    <Space key={field.key} align="baseline" style={{ display: 'flex' }}>
                      <Form.Item
                        name={[field.name, 'threshold']}
                        rules={[{ required: true, message: '请输入门槛金额' }]}
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          min={1}
                          precision={0}
                          addonBefore="满"
                          addonAfter="元"
                          style={{ width: 180 }}
                          placeholder="门槛"
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'reduce']}
                        dependencies={[['rules', field.name, 'threshold']]}
                        rules={[
                          { required: true, message: '请输入减免金额' },
                          ({ getFieldValue }) => ({
                            validator: async (_, value: number | undefined) => {
                              const threshold = getFieldValue(['rules', field.name, 'threshold']);
                              if (value && threshold && value >= threshold) {
                                throw new Error('减免金额应小于门槛金额');
                              }
                            },
                          }),
                        ]}
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          min={1}
                          precision={0}
                          addonBefore="减"
                          addonAfter="元"
                          style={{ width: 180 }}
                          placeholder="减免"
                        />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                        />
                      )}
                    </Space>
                  ))}
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => add({ threshold: 200, reduce: 30 })}
                  >
                    添加档位
                  </Button>
                  <Form.ErrorList errors={errors} />
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item
            name="status"
            label="活动状态"
            rules={[{ required: true, message: '请选择活动状态' }]}
          >
            <Select options={statusOptions} placeholder="选择活动状态" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
