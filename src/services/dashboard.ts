import { dayOffset, orders, stores, TODAY } from '../mock/db';
import { sleep } from '../mock/util';
import type { Kpi, Order, StoreRank, TrendPoint } from '../types';

const DOW = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function fmtDay(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function validOrders(list: Order[]): Order[] {
  return list.filter((o) => o.status !== 'refunded');
}

function percentDelta(current: number, previous: number): number {
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export interface DashboardData {
  kpis: Kpi[];
  trend: TrendPoint[];
  ranking: StoreRank[];
  recentOrders: Order[];
}

export async function fetchDashboard(): Promise<DashboardData> {
  await sleep(350);

  const todayKey = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;
  const yesterday = dayOffset(TODAY, 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const todayOrders = validOrders(orders).filter((o) => o.createdAt.startsWith(todayKey));
  const yesterdayOrders = validOrders(orders).filter((o) => o.createdAt.startsWith(yesterdayKey));

  const todayTurnover = todayOrders.reduce((sum, o) => sum + o.amount, 0);
  const yesterdayTurnover = yesterdayOrders.reduce((sum, o) => sum + o.amount, 0);
  const todayAvg = todayOrders.length ? todayTurnover / todayOrders.length : 0;
  const yesterdayAvg = yesterdayOrders.length ? yesterdayTurnover / yesterdayOrders.length : 0;
  const newMembers = todayOrders.length * 2 + 37;
  const yesterdayMembers = yesterdayOrders.length * 2 + 29;

  const kpis: Kpi[] = [
    {
      key: 'turnover',
      title: '今日营业额',
      value: todayTurnover,
      unit: '元',
      delta: percentDelta(todayTurnover, yesterdayTurnover),
      hint: '较昨日',
    },
    {
      key: 'orders',
      title: '今日订单量',
      value: todayOrders.length,
      unit: '单',
      delta: percentDelta(todayOrders.length, yesterdayOrders.length),
      hint: '较昨日',
    },
    {
      key: 'avg',
      title: '客单价',
      value: Math.round(todayAvg),
      unit: '元',
      delta: percentDelta(todayAvg, yesterdayAvg),
      hint: '较昨日',
    },
    {
      key: 'members',
      title: '新增会员',
      value: newMembers,
      unit: '人',
      delta: percentDelta(newMembers, yesterdayMembers),
      hint: '较昨日',
    },
  ];

  const trend: TrendPoint[] = Array.from({ length: 7 }, (_, i) => {
    const offset = 6 - i;
    const d = dayOffset(TODAY, offset);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const value = validOrders(orders)
      .filter((o) => o.createdAt.startsWith(key))
      .reduce((sum, o) => sum + o.amount, 0);
    return { label: `${fmtDay(d)} ${DOW[d.getDay()]}`, value };
  });

  const byStore = new Map<string, StoreRank>();
  todayOrders.forEach((o) => {
    const rank = byStore.get(o.storeId) ?? {
      storeId: o.storeId,
      name: o.storeName,
      turnover: 0,
      orders: 0,
    };
    rank.turnover += o.amount;
    rank.orders += 1;
    byStore.set(o.storeId, rank);
  });
  const ranking = [...byStore.values()].sort((a, b) => b.turnover - a.turnover).slice(0, 6);

  const recentOrders = [...orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return { kpis, trend, ranking, recentOrders };
}

export async function fetchStoreOptions() {
  await sleep(80);
  return stores.map((s) => ({ label: s.name, value: s.id }));
}
