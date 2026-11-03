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
  Progress,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  couponStatusMeta,
  fetchAudienceTags,
  fetchCouponOptions,
  fetchCouponTasks,
  removeCouponTask,
  saveCouponTask,
} from '../../../services/marketing';
import type { CouponTask, CouponTaskStatus } from '../../../services/marketing';
import type { Paged } from '../../../types';

const emptyPage: Paged<CouponTask> = { list: [], total: 0, page: 1, pageSize: 10 };

const couponStatusOptions: Array<{ label: string; value: CouponTaskStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '进行中', value: 'running' },
  { label: '已结束', value: 'ended' },
  { label: '已暂停', value: 'paused' },
];

interface CouponFormValues {
  name: string;
  couponName: string;
  audiences: string[];
  planned: number;
  validity: [Dayjs, Dayjs];
}

/** 发券活动：面向指定人群发放优惠券的营销任务。 */
export default function CouponPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<CouponFormValues>();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<CouponTaskStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<CouponTask>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [couponList, setCouponList] = useState<Array<{ label: string; value: string }>>([]);
  const [audienceTags, setAudienceTags] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CouponTask | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCouponTasks({ keyword, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchCouponOptions().then(setCouponList);
    void fetchAudienceTags().then(setAudienceTags);
  }, []);

  const resetFilters = () => {
    setKeyword('');
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (task: CouponTask) => {
    setEditing(task);
    form.resetFields();
    form.setFieldsValue({
      name: task.name,
      couponName: task.couponName,
      audiences: task.audiences,
      planned: task.planned,
      validity: [dayjs(task.validFrom), dayjs(task.validTo)],
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: CouponFormValues) => {
    setSaving(true);
    try {
      await saveCouponTask({
        id: editing?.id,
        name: values.name,
        couponName: values.couponName,
        audiences: values.audiences,
        planned: values.planned,
        validFrom: values.validity[0].format('YYYY-MM-DD'),
        validTo: values.validity[1].format('YYYY-MM-DD'),
      });
      message.success(editing ? '发券任务已更新' : '发券任务已创建');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (task: CouponTask) => {
    await removeCouponTask(task.id);
    message.success(`${task.name} 已删除`);
    await load();
  };

  const columns: ColumnsType<CouponTask> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      width: 190,
      render: (value: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{record.id}</div>
        </div>
      ),
    },
    { title: '券名称', dataIndex: 'couponName', width: 180 },
    {
      title: '发放人群',
      dataIndex: 'audiences',
      width: 200,
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
      title: '计划发放',
      dataIndex: 'planned',
      width: 100,
      align: 'right',
      render: (value: number) => value.toLocaleString('zh-CN'),
    },
    {
      title: '已领取',
      dataIndex: 'claimed',
      width: 100,
      align: 'right',
      render: (value: number) => value.toLocaleString('zh-CN'),
    },
    {
      title: '领取率',
      key: 'rate',
      width: 160,
      render: (_, record) => {
        const rate = record.planned ? Math.min(100, Math.round((record.claimed / record.planned) * 100)) : 0;
        return (
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 80 ? '#52c41a' : rate >= 40 ? '#1677ff' : '#fa8c16'}
          />
        );
      },
    },
    {
      title: '有效期',
      key: 'validity',
      width: 200,
      render: (_, record) => (
        <div style={{ fontSize: 12, lineHeight: 1.7 }}>
          <div>{record.validFrom}</div>
          <div style={{ color: 'var(--text-secondary)' }}>至 {record.validTo}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: CouponTaskStatus) => (
        <Tag color={couponStatusMeta[value].color}>{couponStatusMeta[value].label}</Tag>
      ),
    },
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
          <h2>发券活动</h2>
          <p>共 {data.total} 个发券任务，支持按任务名称 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建发券任务
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索任务名称 / 券名称"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={status}
            options={couponStatusOptions}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<CouponTask>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1340 }}
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
          locale={{ emptyText: '没有找到匹配的发券任务' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑发券任务 · ${editing.name}` : '新建发券任务'}
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="coupon-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<CouponFormValues>
          id="coupon-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="如：双十一新客拉新" maxLength={30} />
          </Form.Item>

          <Form.Item
            name="couponName"
            label="发放券"
            rules={[{ required: true, message: '请选择发放的券' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择券（Mock 券库）"
              options={couponList}
            />
          </Form.Item>

          <Form.Item
            name="audiences"
            label="发放人群"
            rules={[{ required: true, message: '请选择发放人群标签' }]}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="选择人群标签（可多选）"
              options={audienceTags.map((tag) => ({ label: tag, value: tag }))}
            />
          </Form.Item>

          <Form.Item
            name="planned"
            label="计划发放数量"
            rules={[{ required: true, message: '请输入计划发放数量' }]}
          >
            <InputNumber
              min={1}
              max={100_000}
              precision={0}
              style={{ width: '100%' }}
              placeholder="如：5000"
              addonAfter="张"
            />
          </Form.Item>

          <Form.Item
            name="validity"
            label="券有效期"
            rules={[{ required: true, message: '请选择券有效期' }]}
          >
            <DatePicker.RangePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
