import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchOrders } from '../../services/order';
import { fetchStoreOptions } from '../../services/dashboard';
import type { Order, OrderChannel, OrderStatus, Paged } from '../../types';
import { channelMeta, money, orderStatusMeta } from '../../utils/format';

const emptyPage: Paged<Order> = { list: [], total: 0, page: 1, pageSize: 10 };

export default function OrdersPage() {
  const [keyword, setKeyword] = useState('');
  const [storeId, setStoreId] = useState<string>();
  const [storeName, setStoreName] = useState<string>();
  const [channel, setChannel] = useState<OrderChannel | 'all'>('all');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [range, setRange] = useState<[string, string]>();
  const [pickerValue, setPickerValue] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<Order>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [storeOptions, setStoreOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [detail, setDetail] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchOrders({ keyword, storeName, channel, status, range, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, storeName, channel, status, range, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchStoreOptions().then((options) => {
      setStoreOptions(options);
    });
  }, []);

  const resetFilters = () => {
    setKeyword('');
    setStoreId(undefined);
    setStoreName(undefined);
    setChannel('all');
    setStatus('all');
    setRange(undefined);
    setPickerValue(null);
    setPage(1);
  };

  const columns: ColumnsType<Order> = [
    { title: '订单号', dataIndex: 'id', width: 185 },
    { title: '门店', dataIndex: 'storeName', width: 130 },
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 90,
      render: (value: OrderChannel) => (
        <Tag color={channelMeta[value].color}>{channelMeta[value].label}</Tag>
      ),
    },
    {
      title: '桌号',
      dataIndex: 'tableNo',
      width: 80,
      render: (value?: string) => value ?? <span style={{ color: 'rgba(0,0,0,0.25)' }}>—</span>,
    },
    { title: '客户', dataIndex: 'customer', width: 100 },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      align: 'right',
      render: (value: number) => <span style={{ fontWeight: 600 }}>{money(value)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: OrderStatus) => (
        <Tag color={orderStatusMeta[value].color}>{orderStatusMeta[value].label}</Tag>
      ),
    },
    { title: '下单时间', dataIndex: 'createdAt', width: 150 },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, order) => (
        <Button type="link" size="small" onClick={() => setDetail(order)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>订单管理</h2>
          <p>共 {data.total} 笔订单，支持门店 / 渠道 / 状态 / 日期筛选（Mock 数据）</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索订单号 / 客户"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="全部门店"
            style={{ width: 150 }}
            options={storeOptions}
            value={storeId}
            onChange={(value) => {
              const target = storeOptions.find((item) => item.value === value);
              setStoreId(value);
              setStoreName(target?.label);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 120 }}
            value={channel}
            options={[
              { label: '全部渠道', value: 'all' },
              { label: '堂食', value: 'dine-in' },
              { label: '自提', value: 'takeaway' },
              { label: '外卖', value: 'delivery' },
            ]}
            onChange={(value) => {
              setChannel(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 120 }}
            value={status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '待接单', value: 'pending' },
              { label: '制作中', value: 'serving' },
              { label: '已完成', value: 'completed' },
              { label: '已退款', value: 'refunded' },
            ]}
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

        <Table<Order>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1120 }}
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
        />
      </Card>

      <Drawer
        title={detail ? `订单详情 · ${detail.id}` : '订单详情'}
        width={560}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        destroyOnClose
      >
        {detail && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="订单号" span={2}>
                {detail.id}
              </Descriptions.Item>
              <Descriptions.Item label="门店">{detail.storeName}</Descriptions.Item>
              <Descriptions.Item label="渠道">
                <Tag color={channelMeta[detail.channel].color}>
                  {channelMeta[detail.channel].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="桌号">{detail.tableNo ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={orderStatusMeta[detail.status].color}>
                  {orderStatusMeta[detail.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="客户">{detail.customer}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="下单时间" span={2}>
                {detail.createdAt}
              </Descriptions.Item>
            </Descriptions>

            <Table
              rowKey={(item) => item.dishId + item.name}
              size="small"
              pagination={false}
              dataSource={detail.items}
              columns={[
                { title: '菜品', dataIndex: 'name' },
                {
                  title: '单价',
                  dataIndex: 'price',
                  align: 'right',
                  width: 90,
                  render: (value: number) => money(value),
                },
                { title: '数量', dataIndex: 'qty', align: 'right', width: 70 },
                {
                  title: '小计',
                  align: 'right',
                  width: 100,
                  render: (_, item) => money(item.price * item.qty),
                },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <strong>合计</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <strong>{money(detail.amount)}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Space>
        )}
      </Drawer>
    </div>
  );
}
