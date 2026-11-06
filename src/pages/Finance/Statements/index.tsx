import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  confirmStatement,
  fetchFinanceStoreOptions,
  fetchStatementDetail,
  fetchStatements,
  fetchStatementSummary,
  MOCK_TODAY,
  statementChannelMeta,
  statementStatusMeta,
  STATEMENT_MONTHS,
  type Statement,
  type StatementChannelMix,
  type StatementItem,
  type StatementRow,
  type StatementStatus,
  type StatementSummary,
} from '../../../services/finance';
import type { Paged } from '../../../types';
import { money } from '../../../utils/format';

const DEFAULT_PERIOD = STATEMENT_MONTHS[STATEMENT_MONTHS.length - 2];

const emptyPage: Paged<StatementRow> = { list: [], total: 0, page: 1, pageSize: 10 };
const emptySummary: StatementSummary = {
  net: 0,
  settled: 0,
  unsettled: 0,
  pending: 0,
  storeCount: 0,
};

const statusOptions: Array<{ label: string; value: StatementStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '待核对', value: 'pending' },
  { label: '待结算', value: 'unsettled' },
  { label: '已结算', value: 'settled' },
];

/** 对账单：按月出具，每行 = 一个门店一个月；详情里拆到商品维度。 */
export default function StatementsPage() {
  const { message } = App.useApp();

  const [storeOptions, setStoreOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [storeId, setStoreId] = useState('all');
  const [status, setStatus] = useState<StatementStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<StatementRow>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StatementSummary>(emptySummary);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Statement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchFinanceStoreOptions().then(setStoreOptions);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchStatements({ period, storeId, status, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [period, storeId, status, page, pageSize]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await fetchStatementSummary({ period, storeId }));
    } finally {
      setSummaryLoading(false);
    }
  }, [period, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const resetFilters = () => {
    setPeriod(DEFAULT_PERIOD);
    setStoreId('all');
    setStatus('all');
    setPage(1);
  };

  const openDetail = async (row: StatementRow) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail((await fetchStatementDetail(row.id)) ?? null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!detail) return;
    setConfirming(true);
    try {
      const ok = await confirmStatement(detail.id);
      if (!ok) {
        message.warning('该账单当前状态不可确认');
        return;
      }
      message.success('账单已确认，状态更新为「待结算」');
      setDetail((await fetchStatementDetail(detail.id)) ?? null);
      await Promise.all([load(), loadSummary()]);
    } finally {
      setConfirming(false);
    }
  };

  const columns: ColumnsType<StatementRow> = [
    { title: '账单号', dataIndex: 'id', width: 150 },
    { title: '门店', dataIndex: 'storeName', width: 120, ellipsis: true },
    {
      title: '营业额',
      dataIndex: 'gross',
      width: 100,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '优惠',
      dataIndex: 'discount',
      width: 95,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '退款',
      dataIndex: 'refund',
      width: 95,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '服务费',
      dataIndex: 'serviceFee',
      width: 90,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '应结金额',
      dataIndex: 'net',
      width: 105,
      align: 'right',
      render: (value: number) => <span style={{ fontWeight: 600 }}>{money(value)}</span>,
    },
    {
      title: '结算状态',
      dataIndex: 'status',
      width: 95,
      render: (value: StatementStatus) => (
        <Tag color={statementStatusMeta[value].color}>{statementStatusMeta[value].label}</Tag>
      ),
    },
    {
      title: '结算时间',
      dataIndex: 'settledAt',
      width: 155,
      render: (value?: string) => value ?? '—',
    },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => void openDetail(record)}>
          查看明细
        </Button>
      ),
    },
  ];

  const itemColumns: ColumnsType<StatementItem> = [
    { title: '商品', dataIndex: 'name', width: 170 },
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '销量', dataIndex: 'qty', width: 80, align: 'right' },
    {
      title: '销售额',
      dataIndex: 'amount',
      width: 100,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '退款',
      dataIndex: 'refund',
      width: 90,
      align: 'right',
      render: (value: number) => (value ? money(value) : '—'),
    },
    {
      title: '商品成本',
      dataIndex: 'cost',
      width: 100,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '毛利',
      key: 'profit',
      width: 100,
      align: 'right',
      render: (_, record) => money(record.amount - record.refund - record.cost),
    },
  ];

  const channelColumns: ColumnsType<StatementChannelMix> = [
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 100,
      render: (value: string) => (
        <Tag color={statementChannelMeta[value]?.color}>{statementChannelMeta[value]?.label ?? value}</Tag>
      ),
    },
    {
      title: '销售额',
      dataIndex: 'amount',
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '占比',
      dataIndex: 'ratio',
      align: 'right',
      render: (value: number) => `${(value * 100).toFixed(1)}%`,
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>对账单</h2>
          <p>
            按账期（月）出具门店账单，统计营业额、优惠、退款、平台服务费与应结金额，明细可下钻到商品维度（Mock
            数据）
          </p>
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
          <Statistic title="应结金额合计" value={summary.net} prefix="¥" />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic title="已结算" value={summary.settled} prefix="¥" />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic title="待结算" value={summary.unsettled} prefix="¥" />
        </Card>
        <Card loading={summaryLoading}>
          <Statistic title="待核对" value={summary.pending} prefix="¥" />
        </Card>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <DatePicker
            picker="month"
            allowClear={false}
            value={dayjs(`${period}-01`)}
            style={{ width: 150 }}
            disabledDate={(current) => current.isAfter(dayjs(MOCK_TODAY), 'month')}
            onChange={(value) => {
              if (!value) return;
              setPeriod(value.format('YYYY-MM'));
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
            value={status}
            options={statusOptions}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            账期：{period} · {summary.storeCount} 家门店
            {period === STATEMENT_MONTHS[STATEMENT_MONTHS.length - 1]
              ? `（部分账期，数据截至 ${MOCK_TODAY}）`
              : ''}
          </span>
        </Space>

        <Table<StatementRow>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1095 }}
          pagination={{
            current: page,
            pageSize,
            total: data.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 份账单`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          locale={{ emptyText: '该账期没有符合条件的账单' }}
        />
      </Card>

      <Drawer
        title={detail ? `对账单 · ${detail.period} ${detail.storeName}` : '对账单明细'}
        width={940}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
        extra={
          detail ? (
            <Space>
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => message.info('演示环境：对账单导出（PDF）未接入后端')}
              >
                下载对账单
              </Button>
              {detail.status === 'pending' && (
                <Button type="primary" loading={confirming} onClick={() => void handleConfirm()}>
                  确认账单
                </Button>
              )}
            </Space>
          ) : null
        }
      >
        {detailLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
            <Spin />
          </div>
        ) : detail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={3} bordered size="small">
              <Descriptions.Item label="账单号">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="账期">{detail.period}</Descriptions.Item>
              <Descriptions.Item label="门店">
                {detail.storeName}（{detail.storeId}）
              </Descriptions.Item>
              <Descriptions.Item label="账单状态">
                <Tag color={statementStatusMeta[detail.status].color}>
                  {statementStatusMeta[detail.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="结算时间">{detail.settledAt ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{detail.updatedAt}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="金额汇总" column={4} bordered size="small">
              <Descriptions.Item label="营业额">{money(detail.gross)}</Descriptions.Item>
              <Descriptions.Item label="优惠金额">{money(detail.discount)}</Descriptions.Item>
              <Descriptions.Item label="退款金额">{money(detail.refund)}</Descriptions.Item>
              <Descriptions.Item label="平台服务费（2.5%）">
                {money(detail.serviceFee)}
              </Descriptions.Item>
              <Descriptions.Item label="应结金额">
                <span style={{ fontWeight: 600 }}>{money(detail.net)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="商品成本">{money(detail.cost)}</Descriptions.Item>
              <Descriptions.Item label="毛利">{money(detail.profit)}</Descriptions.Item>
              <Descriptions.Item label="订单数">{detail.orderCount} 单</Descriptions.Item>
            </Descriptions>

            <div>
              <h4 style={{ margin: '0 0 8px' }}>渠道构成</h4>
              <Table<StatementChannelMix>
                rowKey="channel"
                size="small"
                columns={channelColumns}
                dataSource={detail.channelMix}
                pagination={false}
              />
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px' }}>商品明细（{detail.items.length} 个商品）</h4>
              <Table<StatementItem>
                rowKey="dishId"
                size="small"
                columns={itemColumns}
                dataSource={[...detail.items].sort((a, b) => b.amount - a.amount)}
                pagination={false}
                scroll={{ x: 740 }}
              />
            </div>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
