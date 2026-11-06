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
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  fetchFinanceStoreOptions,
  fetchTransactionSummary,
  fetchTransactions,
  MOCK_TODAY,
  transactionChannelMeta,
  transactionSignedAmount,
  transactionStatusMeta,
  transactionTypeMeta,
  type Transaction,
  type TransactionChannel,
  type TransactionStatus,
  type TransactionSummary,
  type TransactionType,
} from '../../../services/finance';
import type { Paged } from '../../../types';
import { money } from '../../../utils/format';

const emptyPage: Paged<Transaction> = { list: [], total: 0, page: 1, pageSize: 10 };
const emptySummary: TransactionSummary = { count: 0, income: 0, refund: 0, net: 0 };

const typeOptions: Array<{ label: string; value: TransactionType | 'all' }> = [
  { label: '全部类型', value: 'all' },
  { label: '收款', value: 'payment' },
  { label: '退款', value: 'refund' },
  { label: '充值', value: 'recharge' },
  { label: '提现', value: 'withdraw' },
];

const channelOptions: Array<{ label: string; value: TransactionChannel | 'all' }> = [
  { label: '全部渠道', value: 'all' },
  { label: '微信支付', value: 'wechat' },
  { label: '支付宝', value: 'alipay' },
  { label: '银行卡', value: 'bank' },
  { label: '现金', value: 'cash' },
  { label: '会员余额', value: 'balance' },
];

const statusOptions: Array<{ label: string; value: TransactionStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '成功', value: 'success' },
  { label: '处理中', value: 'processing' },
  { label: '失败', value: 'failed' },
];

/** 交易流水：按门店 / 类型 / 渠道 / 状态 / 时间筛选，看明细。 */
export default function TransactionsPage() {
  const [storeOptions, setStoreOptions] = useState<Array<{ label: string; value: string }>>([]);

  const [keyword, setKeyword] = useState('');
  const [storeId, setStoreId] = useState('all');
  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [channel, setChannel] = useState<TransactionChannel | 'all'>('all');
  const [status, setStatus] = useState<TransactionStatus | 'all'>('all');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<Transaction>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TransactionSummary>(emptySummary);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [detail, setDetail] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchFinanceStoreOptions().then(setStoreOptions);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await fetchTransactions({
          keyword,
          storeId,
          type,
          channel,
          status,
          startDate: range?.[0].format('YYYY-MM-DD'),
          endDate: range?.[1].format('YYYY-MM-DD'),
          page,
          pageSize,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, storeId, type, channel, status, range, page, pageSize]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await fetchTransactionSummary());
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const resetFilters = () => {
    setKeyword('');
    setStoreId('all');
    setType('all');
    setChannel('all');
    setStatus('all');
    setRange(null);
    setPage(1);
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: '流水号',
      dataIndex: 'id',
      width: 150,
    },
    {
      title: '交易时间',
      dataIndex: 'time',
      width: 155,
    },
    {
      title: '门店',
      dataIndex: 'storeName',
      width: 110,
      ellipsis: true,
    },
    {
      title: '交易类型',
      dataIndex: 'type',
      width: 90,
      render: (value: TransactionType) => (
        <Tag color={transactionTypeMeta[value].color}>{transactionTypeMeta[value].label}</Tag>
      ),
    },
    {
      title: '支付渠道',
      dataIndex: 'channel',
      width: 100,
      render: (value: TransactionChannel) => transactionChannelMeta[value].label,
    },
    {
      title: '关联单号',
      dataIndex: 'relatedNo',
      width: 150,
      ellipsis: true,
      render: (value: string) => value || '—',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      align: 'right',
      render: (value: number, record) => {
        const signed = transactionSignedAmount(record);
        return (
          <span className={signed >= 0 ? 'amount-in' : 'amount-out'}>
            {signed >= 0 ? '+' : '-'}
            {money(value)}
          </span>
        );
      },
    },
    {
      title: '手续费',
      dataIndex: 'fee',
      width: 75,
      align: 'right',
      render: (value: number) => (value ? money(value) : '—'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: TransactionStatus) => (
        <Tag color={transactionStatusMeta[value].color}>{transactionStatusMeta[value].label}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 70,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => setDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>交易流水</h2>
          <p>共 {data.total} 笔交易，覆盖最近 30 天，支持按门店 / 类型 / 渠道 / 状态 / 时间段筛选（Mock 数据）</p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={loading || summaryLoading}
            onClick={() => {
              void load();
              void loadSummary();
            }}
          >
            刷新
          </Button>
        </Space>
      </div>

      <div className="kpi-grid">
        <Card loading={summaryLoading}>
          <Statistic
            title="今日交易笔数"
            value={summary.count}
            suffix={<span style={{ fontSize: 13 }}>笔</span>}
          />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic title="今日收入" value={summary.income} prefix="¥" />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic title="今日退款" value={summary.refund} prefix="¥" />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic
            title="今日净收入"
            value={summary.net}
            prefix="¥"
            valueStyle={{ color: summary.net >= 0 ? undefined : '#cf1322' }}
          />
        </Card>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索流水号 / 关联单号 / 门店"
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 150 }}
            value={storeId}
            options={[{ label: '全部门店', value: 'all' }, ...storeOptions]}
            onChange={(value) => {
              setStoreId(value);
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
            value={channel}
            options={channelOptions}
            onChange={(value) => {
              setChannel(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 120 }}
            value={status}
            options={statusOptions}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <DatePicker.RangePicker
            value={range}
            style={{ width: 250 }}
            disabledDate={(current) => current.isAfter(dayjs(MOCK_TODAY), 'day')}
            onChange={(values) => {
              setRange(values && values[0] && values[1] ? [values[0], values[1]] : null);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<Transaction>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1090 }}
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
          locale={{ emptyText: '没有符合条件的交易流水' }}
        />
      </Card>

      <Drawer
        title="交易流水详情"
        width={520}
        open={detail !== null}
        onClose={() => setDetail(null)}
        destroyOnClose
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="流水号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="交易时间">{detail.time}</Descriptions.Item>
            <Descriptions.Item label="门店">
              {detail.storeName}（{detail.storeId}）
            </Descriptions.Item>
            <Descriptions.Item label="交易类型">
              <Tag color={transactionTypeMeta[detail.type].color}>
                {transactionTypeMeta[detail.type].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="支付渠道">
              {transactionChannelMeta[detail.channel].label}
            </Descriptions.Item>
            <Descriptions.Item label="金额">
              <span className={transactionSignedAmount(detail) >= 0 ? 'amount-in' : 'amount-out'}>
                {transactionSignedAmount(detail) >= 0 ? '+' : '-'}
                {money(detail.amount)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="手续费">
              {detail.fee ? money(detail.fee) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="交易状态">
              <Tag color={transactionStatusMeta[detail.status].color}>
                {transactionStatusMeta[detail.status].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="关联单号">{detail.relatedNo || '—'}</Descriptions.Item>
            <Descriptions.Item label="操作人">{detail.operator}</Descriptions.Item>
            <Descriptions.Item label="备注">{detail.remark}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
