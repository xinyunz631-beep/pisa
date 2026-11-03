import { Card, Progress, Table, Tag, Button, Space, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import KpiCard from '../../components/KpiCard';
import TrendChart from '../../components/TrendChart';
import { fetchDashboard, type DashboardData } from '../../services/dashboard';
import type { Order, OrderStatus } from '../../types';
import { money, orderStatusMeta } from '../../utils/format';

const columns: ColumnsType<Order> = [
  { title: '订单号', dataIndex: 'id', width: 190 },
  { title: '门店', dataIndex: 'storeName' },
  {
    title: '金额',
    dataIndex: 'amount',
    align: 'right',
    width: 110,
    render: (value: number) => <span style={{ fontWeight: 600 }}>{money(value)}</span>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (status: OrderStatus) => (
      <Tag color={orderStatusMeta[status].color}>{orderStatusMeta[status].label}</Tag>
    ),
  },
  { title: '下单时间', dataIndex: 'createdAt', width: 150 },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchDashboard());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 360 }}>
        <Spin size="large" />
      </div>
    );
  }

  const maxTurnover = data.ranking[0]?.turnover ?? 1;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>仪表盘</h2>
          <p>2026-11-04 · 全部门店 · 数据每 5 分钟刷新（当前为 Mock 数据）</p>
        </div>
        <Space>
          <Tag color="red">实时</Tag>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            刷新
          </Button>
        </Space>
      </div>

      <div className="kpi-grid">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </div>

      <div className="dashboard-row">
        <Card title="近 7 日营业额趋势" extra={<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>单位：元</span>}>
          <TrendChart data={data.trend} />
        </Card>

        <Card title="今日门店营业额 TOP 6">
          {data.ranking.map((rank, index) => (
            <div key={rank.storeId} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '7px 0' }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  background: index < 3 ? 'rgba(212,56,13,0.15)' : 'var(--border-color)',
                  color: index < 3 ? '#d4380d' : 'var(--text-secondary)',
                }}
              >
                {index + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                  <span>{rank.name}</span>
                  <span style={{ fontWeight: 600 }}>{money(rank.turnover)}</span>
                </div>
                <Progress
                  percent={Math.round((rank.turnover / maxTurnover) * 100)}
                  showInfo={false}
                  strokeColor="#d4380d"
                  size="small"
                />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card title="最近订单">
        <Table<Order>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={data.recentOrders}
          pagination={false}
        />
      </Card>
    </div>
  );
}
