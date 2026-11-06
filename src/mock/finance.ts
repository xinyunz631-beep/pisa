import type { Dish } from '../types';
import { TODAY, dayOffset, dishes, orders, stores } from './db';
import { mulberry32, pad, pick } from './util';

/**
 * 财务模块 Mock 数据（交易流水 / 月度对账单）。
 * 与其它模块保持一致：固定种子生成、刷新后不变、日期不超过演示日 2026-11-04。
 */

/** 演示用“今天”，与 mock/db.ts 的 TODAY 保持一致。 */
export const MOCK_TODAY = '2026-11-04';
/** 演示用“当前时间”，用于账单确认后的更新时间。 */
export const MOCK_NOW = '2026-11-04 18:30';

function formatDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ------------------------------------------------------------------ */
/* 交易流水                                                            */
/* ------------------------------------------------------------------ */

/** 交易类型：收款 / 退款 / 会员充值 / 门店提现。 */
export type TransactionType = 'payment' | 'refund' | 'recharge' | 'withdraw';
/** 支付渠道。 */
export type TransactionChannel = 'wechat' | 'alipay' | 'bank' | 'cash' | 'balance';
export type TransactionStatus = 'success' | 'processing' | 'failed';

export interface Transaction {
  /** 流水号，如 TX202611040001。 */
  id: string;
  /** 交易时间，分钟精度：2026-11-04 14:32。 */
  time: string;
  storeId: string;
  storeName: string;
  type: TransactionType;
  channel: TransactionChannel;
  /** 交易金额（正数，收入 / 支出方向由 type 决定）。 */
  amount: number;
  /** 平台手续费（元）。 */
  fee: number;
  /** 关联单号：订单号 / 会员号 / 提现单号。 */
  relatedNo: string;
  status: TransactionStatus;
  operator: string;
  remark: string;
}

const txRng = mulberry32(20261104);

const PAY_CHANNELS: TransactionChannel[] = [
  'wechat',
  'wechat',
  'alipay',
  'alipay',
  'bank',
  'cash',
  'balance',
];

const OPERATORS = ['系统自动', '系统自动', '系统自动', '财务-张敏', '周明', '李婷'];

function buildTransactions(): Transaction[] {
  const list: Transaction[] = [];

  // 最近 7 天有订单数据，收款 / 退款直接关联系到真实订单（订单号、门店、金额、时间都对得上）。
  const ordersByDay = new Map<string, typeof orders>();
  orders.forEach((order) => {
    const key = order.createdAt.slice(0, 10);
    const bucket = ordersByDay.get(key);
    if (bucket) bucket.push(order);
    else ordersByDay.set(key, [order]);
  });

  // 最近 30 天，越近的日期交易越多（符合真实经营节奏）。
  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = dayOffset(TODAY, offset);
    const dayStr = formatDay(day);
    const compact = dayStr.replace(/-/g, '');
    // 演示时刻是 18:30，今天只关联 18:30 之前产生的订单，避免出现“未来流水”。
    const dayOrders = (ordersByDay.get(dayStr) ?? []).filter(
      (order) => offset !== 0 || order.createdAt.slice(11) <= '18:30',
    );
    const refundedOrders = dayOrders.filter((order) => order.status === 'refunded');
    const count = 4 + Math.floor(txRng() * 6);
    let hasRefund = false;

    for (let i = 1; i <= count; i += 1) {
      const store = pick(txRng, stores);
      let storeId = store.id;
      let storeName = store.name;

      const roll = txRng();
      let type: TransactionType =
        roll < 0.78 ? 'payment' : roll < 0.86 ? 'refund' : roll < 0.94 ? 'recharge' : 'withdraw';

      // 保证「今日」至少有一笔退款，看板数据更有代表性。
      if (offset === 0 && i === count && !hasRefund) type = 'refund';

      const hour = offset === 0 ? 10 + Math.floor(txRng() * 8) : 10 + Math.floor(txRng() * 12);
      const minute = Math.floor(txRng() * 60);

      const statusRoll = txRng();
      const status: TransactionStatus =
        offset === 0 && type === 'refund'
          ? 'success'
          : statusRoll < 0.945
            ? 'success'
            : statusRoll < 0.98
              ? 'processing'
              : 'failed';

      let channel: TransactionChannel = pick(txRng, PAY_CHANNELS);
      let amount = 0;
      let fee = 0;
      let relatedNo = '';
      let remark = '';
      let operator = pick(txRng, OPERATORS);
      let time = `${dayStr} ${pad(hour)}:${pad(minute)}`;

      switch (type) {
        case 'payment': {
          const order = dayOrders.length > 0 ? pick(txRng, dayOrders) : undefined;
          if (order) {
            storeId = order.storeId;
            storeName = order.storeName;
            amount = order.amount;
            relatedNo = order.id;
            time = order.createdAt;
          } else {
            amount = 28 + Math.floor(txRng() * 700);
            relatedNo = `BS${compact}${pad(i, 4)}`;
          }
          remark = pick(txRng, ['扫码收款', '堂食结账', '外卖订单收款', '自提订单收款']);
          fee = channel === 'cash' || channel === 'balance' ? 0 : Math.round(amount * 0.006);
          break;
        }
        case 'refund': {
          hasRefund = true;
          const order = refundedOrders.length > 0 ? pick(txRng, refundedOrders) : undefined;
          if (order) {
            storeId = order.storeId;
            storeName = order.storeName;
            amount = order.amount;
            relatedNo = order.id;
            time = order.createdAt;
          } else {
            amount = 15 + Math.floor(txRng() * 280);
            relatedNo = `BS${compact}${pad(1 + Math.floor(txRng() * 40), 4)}`;
          }
          channel = pick(txRng, ['wechat', 'alipay'] as const);
          remark = pick(txRng, ['订单退款', '售后部分退款', '会员投诉退款']);
          break;
        }
        case 'recharge':
          amount = pick(txRng, [100, 200, 300, 500, 800, 1000]);
          channel = pick(txRng, ['wechat', 'alipay', 'balance'] as const);
          relatedNo = `M100${pad(1 + Math.floor(txRng() * 99), 3)}`;
          remark = '会员余额充值';
          break;
        case 'withdraw':
          amount = Math.round((2000 + txRng() * 28000) / 100) * 100;
          channel = 'bank';
          relatedNo = `WD${compact}${pad(i, 4)}`;
          remark = pick(txRng, ['门店结算提现', '店长备用金提取']);
          operator = '财务-张敏';
          fee = Math.round(amount * 0.001);
          break;
      }

      list.push({
        id: `TX${compact}${pad(i, 4)}`,
        time,
        storeId,
        storeName,
        type,
        channel,
        amount,
        fee,
        relatedNo,
        status,
        operator,
        remark,
      });
    }
  }

  // 最新的流水排在最前面。
  return list.sort((a, b) => b.time.localeCompare(a.time));
}

export const transactions: Transaction[] = buildTransactions();

/* ------------------------------------------------------------------ */
/* 月度对账单                                                          */
/* ------------------------------------------------------------------ */

/** 账单状态：待核对（当月）→ 待结算 → 已结算。 */
export type StatementStatus = 'pending' | 'unsettled' | 'settled';
export type StatementChannel = 'dine-in' | 'takeaway' | 'delivery';

/** 对账单里的单个商品行（商品维度）。 */
export interface StatementItem {
  dishId: string;
  name: string;
  category: string;
  qty: number;
  /** 销售额（元）。 */
  amount: number;
  /** 退款金额（元）。 */
  refund: number;
  /** 商品成本（元）。 */
  cost: number;
}

export interface StatementChannelMix {
  channel: StatementChannel;
  amount: number;
  /** 占营业额比例（0~1）。 */
  ratio: number;
}

export interface Statement {
  /** 账单号，如 BILL202610001。 */
  id: string;
  /** 账期，如 2026-10。 */
  period: string;
  storeId: string;
  storeName: string;
  /** 营业额（按商品明细汇总）。 */
  gross: number;
  /** 优惠金额。 */
  discount: number;
  /** 退款金额。 */
  refund: number;
  /** 平台服务费（按 2.5% 计）。 */
  serviceFee: number;
  /** 商品成本。 */
  cost: number;
  /** 应结金额 = 营业额 - 优惠 - 退款 - 平台服务费。 */
  net: number;
  /** 毛利 = 营业额 - 优惠 - 退款 - 商品成本。 */
  profit: number;
  orderCount: number;
  status: StatementStatus;
  settledAt?: string;
  updatedAt: string;
  /** 商品维度明细。 */
  items: StatementItem[];
  /** 渠道构成。 */
  channelMix: StatementChannelMix[];
}

/** 有账单的账期（当月为部分账期，按演示日 11-04 截止）。 */
export const STATEMENT_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

const stRng = mulberry32(20260915);

function nextMonthOf(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
}

function buildStatement(period: string, monthIndex: number, storeIndex: number): Statement {
  const store = stores[storeIndex];
  const isCurrentMonth = monthIndex === STATEMENT_MONTHS.length - 1;

  // 当月只统计到演示日（11-04），按 4/30 折算；越近的月份营业额略高。
  const partial = isCurrentMonth ? 4 / 30 : 1;
  const monthFactor = 1 + (monthIndex - 2) * 0.03;
  const storeFactor = store.status === 'preparing' ? 0.55 : store.status === 'closed' ? 0.3 : 1;
  const target = store.turnover * storeFactor * monthFactor * partial * (0.92 + stRng() * 0.16);

  // 商品维度：8~14 道菜，按目标营业额反推销量，保证「汇总 = 明细之和」。
  const itemCount = 8 + Math.floor(stRng() * 7);
  const pool: Dish[] = [...dishes];
  const picked: Dish[] = [];
  while (picked.length < itemCount && pool.length > 0) {
    picked.push(pool.splice(Math.floor(stRng() * pool.length), 1)[0]);
  }

  const weights = picked.map((dish) => dish.price * (0.5 + stRng() * 1.5));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  const items: StatementItem[] = picked.map((dish, i) => {
    const spent = target * (weights[i] / weightSum);
    const qty = Math.max(1, Math.round(spent / dish.price));
    const amount = qty * dish.price;
    const refund = stRng() < 0.12 ? Math.round(amount * (0.1 + stRng() * 0.4)) : 0;
    return {
      dishId: dish.id,
      name: dish.name,
      category: dish.category,
      qty,
      amount,
      refund,
      cost: qty * dish.cost,
    };
  });

  const gross = items.reduce((sum, item) => sum + item.amount, 0);
  const refundTotal = items.reduce((sum, item) => sum + item.refund, 0);
  const discount = Math.round(gross * (0.05 + stRng() * 0.08));
  const serviceFee = Math.round((gross - discount - refundTotal) * 0.025);
  const cost = items.reduce((sum, item) => sum + item.cost, 0);
  const net = gross - discount - refundTotal - serviceFee;
  const profit = gross - discount - refundTotal - cost;
  const orderCount = Math.max(1, Math.round(gross / (52 + stRng() * 70)));

  // 渠道构成：堂食 42%~60%、自提 18%~30%，其余为外卖。
  const dineInRatio = 0.42 + stRng() * 0.18;
  const takeawayRatio = 0.18 + stRng() * 0.12;
  const dineInAmount = Math.round(gross * dineInRatio);
  const takeawayAmount = Math.round(gross * takeawayRatio);
  const deliveryAmount = gross - dineInAmount - takeawayAmount;
  const channelMix: StatementChannelMix[] = [
    { channel: 'dine-in', amount: dineInAmount, ratio: gross ? dineInAmount / gross : 0 },
    { channel: 'takeaway', amount: takeawayAmount, ratio: gross ? takeawayAmount / gross : 0 },
    {
      channel: 'delivery',
      amount: deliveryAmount,
      ratio: gross ? deliveryAmount / gross : 0,
    },
  ];

  // 历史账期已结算；上一月部分已结算；当月待核对。
  let status: StatementStatus;
  if (monthIndex <= 2) {
    status = 'settled';
  } else if (monthIndex === 3) {
    status = stRng() < 0.7 ? 'settled' : 'unsettled';
  } else {
    status = 'pending';
  }

  const nextPeriod = nextMonthOf(period);
  const settledAt =
    status === 'settled'
      ? `${nextPeriod}-03 ${pad(9 + Math.floor(stRng() * 6))}:${pad(Math.floor(stRng() * 60))}`
      : undefined;
  const updatedAt =
    status === 'settled'
      ? `${nextPeriod}-03 18:00`
      : status === 'unsettled'
        ? `${nextPeriod}-01 02:00`
        : MOCK_NOW;

  return {
    id: `BILL${period.replace('-', '')}${pad(storeIndex + 1, 3)}`,
    period,
    storeId: store.id,
    storeName: store.name,
    gross,
    discount,
    refund: refundTotal,
    serviceFee,
    cost,
    net,
    profit,
    orderCount,
    status,
    settledAt,
    updatedAt,
    items,
    channelMix,
  };
}

export const statements: Statement[] = STATEMENT_MONTHS.flatMap((period, monthIndex) =>
  stores.map((_store, storeIndex) => buildStatement(period, monthIndex, storeIndex)),
);
