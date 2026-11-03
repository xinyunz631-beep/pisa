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
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  assetStatusMeta,
  couponTypeMeta,
  fetchCardStats,
  fetchCoupons,
  MOCK_TODAY,
  removeCoupon,
  saveCoupon,
  updateCouponStatus,
  type AssetStatus,
  type CardStats,
  type Coupon,
  type CouponType,
} from '../../../services/assets';
import type { Paged } from '../../../types';
import { money } from '../../../utils/format';

const emptyPage: Paged<Coupon> = { list: [], total: 0, page: 1, pageSize: 10 };
const emptyStats: CardStats = { totalIssued: 0, totalClaimed: 0, totalUsed: 0, redeemRate: 0 };

const typeOptions: Array<{ label: string; value: CouponType | 'all' }> = [
  { label: '全部类型', value: 'all' },
  { label: '代金券', value: 'cash' },
  { label: '折扣券', value: 'discount' },
  { label: '兑换券', value: 'exchange' },
];

const statusOptions: Array<{ label: string; value: AssetStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '进行中', value: 'active' },
  { label: '已结束', value: 'ended' },
  { label: '已停用', value: 'disabled' },
];

/** 卡券面额 / 折扣的展示文案。 */
function couponValueText(coupon: Coupon): string {
  return coupon.type === 'discount' ? `${coupon.value} 折` : money(coupon.value);
}

interface CouponFormValues {
  name: string;
  type: CouponType;
  amount?: number;
  discount?: number;
  threshold: number;
  total: number;
  range: [Dayjs, Dayjs];
}

/** 卡券管理：卡券的新增、编辑、停用与删除。 */
export default function CardsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<CouponFormValues>();
  const couponType = Form.useWatch('type', form);

  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<CouponType | 'all'>('all');
  const [status, setStatus] = useState<AssetStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<Coupon>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CardStats>(emptyStats);
  const [statsLoading, setStatsLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCoupons({ keyword, type, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, type, status, page, pageSize]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await fetchCardStats());
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const refreshAll = async () => {
    await Promise.all([load(), loadStats()]);
  };

  const resetFilters = () => {
    setKeyword('');
    setType('all');
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'cash',
      amount: 10,
      threshold: 0,
      total: 1000,
      range: [dayjs(MOCK_TODAY).subtract(30, 'day'), dayjs(MOCK_TODAY)],
    });
    setDrawerOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    form.resetFields();
    form.setFieldsValue({
      name: coupon.name,
      type: coupon.type,
      amount: coupon.type === 'discount' ? undefined : coupon.value,
      discount: coupon.type === 'discount' ? coupon.value : undefined,
      threshold: coupon.threshold,
      total: coupon.total,
      range: [dayjs(coupon.validFrom), dayjs(coupon.validTo)],
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: CouponFormValues) => {
    const value = values.type === 'discount' ? values.discount : values.amount;
    if (value === undefined) return;

    setSaving(true);
    try {
      await saveCoupon({
        id: editing?.id,
        name: values.name,
        type: values.type,
        value,
        threshold: values.threshold ?? 0,
        validFrom: values.range[0].format('YYYY-MM-DD'),
        validTo: values.range[1].format('YYYY-MM-DD'),
        total: values.total,
      });
      message.success(editing ? '卡券已更新' : '卡券已新增');
      setDrawerOpen(false);
      await refreshAll();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (coupon: Coupon) => {
    try {
      await updateCouponStatus(coupon.id, 'disabled');
      message.success(`「${coupon.name}」已停用`);
      await refreshAll();
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const handleRemove = async (coupon: Coupon) => {
    try {
      await removeCoupon(coupon.id);
      message.success(`「${coupon.name}」已删除`);
      await refreshAll();
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const columns: ColumnsType<Coupon> = [
    {
      title: '券名称',
      dataIndex: 'name',
      width: 190,
      render: (value: string, coupon) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{coupon.id}</div>
        </div>
      ),
    },
    {
      title: '券类型',
      dataIndex: 'type',
      width: 100,
      render: (value: CouponType) => (
        <Tag color={couponTypeMeta[value].color}>{couponTypeMeta[value].label}</Tag>
      ),
    },
    {
      title: '面额 / 折扣',
      dataIndex: 'value',
      width: 110,
      align: 'right',
      render: (_value: number, coupon) => (
        <span style={{ fontWeight: 600 }}>{couponValueText(coupon)}</span>
      ),
    },
    {
      title: '有效期',
      dataIndex: 'validFrom',
      width: 200,
      render: (_value: string, coupon) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {coupon.validFrom} ~ {coupon.validTo}
        </span>
      ),
    },
    {
      title: '发行量',
      dataIndex: 'total',
      width: 100,
      align: 'right',
    },
    {
      title: '已领取',
      dataIndex: 'claimed',
      width: 100,
      align: 'right',
    },
    {
      title: '已核销',
      dataIndex: 'used',
      width: 100,
      align: 'right',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: AssetStatus) => (
        <Tag color={assetStatusMeta[value].color}>{assetStatusMeta[value].label}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_, coupon) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(coupon)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            disabled={coupon.status !== 'active'}
            onClick={() => void handleDisable(coupon)}
          >
            停用
          </Button>
          <Popconfirm
            title={`删除「${coupon.name}」？`}
            description="删除后不可恢复（原型阶段仅影响内存 Mock 数据）"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRemove(coupon)}
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
          <h2>卡券管理</h2>
          <p>共 {data.total} 张卡券，支持按券名称 / 类型 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={loading || statsLoading}
            onClick={() => void refreshAll()}
          >
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建卡券
          </Button>
        </Space>
      </div>

      <div className="kpi-grid">
        <Card loading={statsLoading}>
          <Statistic title="总发行量" value={stats.totalIssued} suffix={<span style={{ fontSize: 13 }}>张</span>} />
        </Card>
        <Card loading={statsLoading}>
          <Statistic title="已领取" value={stats.totalClaimed} suffix={<span style={{ fontSize: 13 }}>张</span>} />
        </Card>
        <Card loading={statsLoading}>
          <Statistic title="已核销" value={stats.totalUsed} suffix={<span style={{ fontSize: 13 }}>张</span>} />
        </Card>
        <Card loading={statsLoading}>
          <Statistic
            title="核销率"
            value={stats.redeemRate}
            precision={1}
            suffix={<span style={{ fontSize: 13 }}>%</span>}
          />
        </Card>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索券名称 / 编号"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={type}
            options={typeOptions}
            onChange={(value) => {
              setType(value);
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

        <Table<Coupon>
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
          locale={{ emptyText: '没有符合条件的卡券' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑卡券 · ${editing.name}` : '新建卡券'}
        width={460}
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
            label="券名称"
            rules={[{ required: true, message: '请输入券名称' }]}
          >
            <Input placeholder="如：满 100 减 20 券" maxLength={30} />
          </Form.Item>

          <Form.Item name="type" label="券类型" rules={[{ required: true, message: '请选择券类型' }]}>
            <Select
              placeholder="选择券类型"
              options={[
                { label: '代金券', value: 'cash' },
                { label: '折扣券', value: 'discount' },
                { label: '兑换券', value: 'exchange' },
              ]}
            />
          </Form.Item>

          {couponType === 'discount' ? (
            <Form.Item
              name="discount"
              label="折扣（折）"
              rules={[{ required: true, message: '请输入折扣' }]}
              extra="如 8.5 表示按 8.5 折结算"
            >
              <InputNumber min={1} max={9.9} precision={1} style={{ width: '100%' }} placeholder="8.5" />
            </Form.Item>
          ) : (
            <Form.Item
              name="amount"
              label="面额（元）"
              rules={[{ required: true, message: '请输入面额' }]}
            >
              <InputNumber min={1} max={1000} precision={0} style={{ width: '100%' }} placeholder="20" />
            </Form.Item>
          )}

          <Form.Item
            name="threshold"
            label="使用门槛（元）"
            extra="0 表示无门槛"
            rules={[{ required: true, message: '请输入使用门槛' }]}
          >
            <InputNumber min={0} max={10_000} precision={0} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>

          <Form.Item
            name="range"
            label="有效期"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              disabledDate={(current) =>
                current.isBefore(dayjs('2026-09-01')) || current.isAfter(dayjs(MOCK_TODAY))
              }
            />
          </Form.Item>

          <Form.Item
            name="total"
            label="发行量（张）"
            rules={[{ required: true, message: '请输入发行量' }]}
          >
            <InputNumber min={1} max={100_000} precision={0} style={{ width: '100%' }} placeholder="1000" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
