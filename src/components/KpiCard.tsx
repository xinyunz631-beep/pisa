import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Statistic } from 'antd';
import type { Kpi } from '../types';

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  const up = kpi.delta >= 0;
  return (
    <Card styles={{ body: { padding: '18px 20px' } }}>
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>{kpi.title}</div>
      <Statistic
        value={kpi.value}
        suffix={<span style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>{kpi.unit}</span>}
        valueStyle={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
        <span style={{ color: up ? '#cf1322' : '#389e0d' }}>
          {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(kpi.delta)}%
        </span>{' '}
        {kpi.hint}
      </div>
    </Card>
  );
}
