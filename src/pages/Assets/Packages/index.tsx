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
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  assetStatusMeta,
  couponTypeMeta,
  fetchCouponOptions,
  fetchPackages,
  MOCK_TODAY,
  removePackage,
  savePackage,
  type AssetStatus,
  type CouponOption,
  type CouponPackage,
} from '../../../services/assets';
import type { Paged } from '../../../types';

const emptyPage: Paged<CouponPackage> = { list: [], total: 0, page: 1, pageSize: 10 };

const statusOptions: Array<{ label: string; value: AssetStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '进行中', value: 'active' },
  { label: '已结束', value: 'ended' },
  { label: '已停用', value: 'disabled' },
];

const formStatusOptions: Array<{ label: string; value: AssetStatus }> = [
  { label: '进行中', value: 'active' },
  { label: '已结束', value: 'ended' },
  { label: '已停用', value: 'disabled' },
];

const dateDisabled = (current: Dayjs) =>
  current.isBefore(dayjs('2026-09-01')) || current.isAfter(dayjs(MOCK_TODAY));

interface PackageFormValues {
  name: string;
  couponIds: string[];
  range: [Dayjs, Dayjs];
  total: number;
  status: AssetStatus;
}

/** 券包管理：组合多张卡券打包发行。 */
export default function PackagesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<PackageFormValues>();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<AssetStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<CouponPackage>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [couponOptions, setCouponOptions] = useState<CouponOption[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CouponPackage | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPackages({ keyword, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchCouponOptions().then(setCouponOptions);
  }, []);

  const couponNameMap = new Map(couponOptions.map((option) => [option.id, option.name]));

  const resetFilters = () => {
    setKeyword('');
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      couponIds: [],
      total: 500,
      status: 'active',
      range: [dayjs(MOCK_TODAY).subtract(30, 'day'), dayjs(MOCK_TODAY)],
    });
    setDrawerOpen(true);
  };

  const openEdit = (item: CouponPackage) => {
    setEditing(item);
    form.resetFields();
    form.setFieldsValue({
      name: item.name,
      couponIds: item.couponIds,
      total: item.total,
      status: item.status,
      range: [dayjs(item.validFrom), dayjs(item.validTo)],
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: PackageFormValues) => {
    setSaving(true);
    try {
      await savePackage({
        id: editing?.id,
        name: values.name,
        couponIds: values.couponIds,
        validFrom: values.range[0].format('YYYY-MM-DD'),
        validTo: values.range[1].format('YYYY-MM-DD'),
        total: values.total,
        status: values.status,
      });
      message.success(editing ? '券包已更新' : '券包已新增');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (item: CouponPackage) => {
    try {
      await removePackage(item.id);
      message.success(`「${item.name}」已删除`);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const columns: ColumnsType<CouponPackage> = [
    {
      title: '券包名称',
      dataIndex: 'name',
      width: 180,
      render: (value: string, item) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{item.id}</div>
        </div>
      ),
    },
    {
      title: '包含券',
      dataIndex: 'couponIds',
      minWidth: 280,
      render: (couponIds: string[]) => {
        const names = couponIds.map((id) => couponNameMap.get(id) ?? id);
        return (
          <Space size={4} wrap>
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              共 {names.length} 张
            </Tag>
            {names.slice(0, 2).map((name) => (
              <Tag key={name} style={{ marginInlineEnd: 0 }}>
                {name}
              </Tag>
            ))}
            {names.length > 2 && <Tag style={{ marginInlineEnd: 0 }}>+{names.length - 2}</Tag>}
          </Space>
        );
      },
    },
    {
      title: '有效期',
      dataIndex: 'validFrom',
      width: 200,
      render: (_value: string, item) => (
        <span style={{ color: 'rgba(0,0,0,0.65)' }}>
          {item.validFrom} ~ {item.validTo}
        </span>
      ),
    },
    { title: '发行量', dataIndex: 'total', width: 100, align: 'right' },
    { title: '已领取', dataIndex: 'claimed', width: 100, align: 'right' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: AssetStatus) => (
        <Tag color={assetStatusMeta[value].color}>{assetStatusMeta[value].label}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, item) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(item)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除「${item.name}」？`}
            description="删除后不可恢复（原型阶段仅影响内存 Mock 数据）"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRemove(item)}
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
          <h2>券包管理</h2>
          <p>共 {data.total} 个券包，支持按名称 / 状态筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建券包
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索券包名称 / 编号"
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
            options={statusOptions}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<CouponPackage>
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
          locale={{ emptyText: '没有符合条件的券包' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑券包 · ${editing.name}` : '新建券包'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" form="package-form" loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form<PackageFormValues>
          id="package-form"
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSave(values)}
        >
          <Form.Item
            name="name"
            label="券包名称"
            rules={[{ required: true, message: '请输入券包名称' }]}
          >
            <Input placeholder="如：新客礼包" maxLength={30} />
          </Form.Item>

          <Form.Item
            name="couponIds"
            label="包含券"
            rules={[
              { required: true, message: '请选择至少一张卡券' },
              {
                validator: (_, value: string[] | undefined) =>
                  value && value.length > 0
                    ? Promise.resolve()
                    : Promise.reject(new Error('请选择至少一张卡券')),
              },
            ]}
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="从卡券列表中选择"
              options={couponOptions.map((option) => ({
                label: `${option.name}（${couponTypeMeta[option.type].label}）`,
                value: option.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="range"
            label="有效期"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} disabledDate={dateDisabled} />
          </Form.Item>

          <Form.Item
            name="total"
            label="发行量（份）"
            rules={[{ required: true, message: '请输入发行量' }]}
          >
            <InputNumber
              min={1}
              max={100_000}
              precision={0}
              style={{ width: '100%' }}
              placeholder="500"
            />
          </Form.Item>

          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select placeholder="选择状态" options={formStatusOptions} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
