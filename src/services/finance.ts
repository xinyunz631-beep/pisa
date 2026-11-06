import { stores } from '../mock/db';
import {
  MOCK_NOW,
  MOCK_TODAY,
  statements,
  transactions,
  type Statement,
  type StatementStatus,
  type Transaction,
  type TransactionChannel,
  type TransactionStatus,
  type TransactionType,
} from '../mock/finance';
import { paginate, sleep } from '../mock/util';
import type { Paged } from '../types';

export { MOCK_NOW, MOCK_TODAY, STATEMENT_MONTHS } from '../mock/finance';
export type {
  Statement,
  StatementChannelMix,
  StatementItem,
  StatementStatus,
  Transaction,
  TransactionChannel,
  TransactionStatus,
  TransactionType,
} from '../mock/finance';

/** 交易类型展示配置：sign 表示资金方向（+ 收入 / - 支出）。 */
export const transactionTypeMeta: Record<
  TransactionType,
  { label: string; color: string; sign: 1 | -1 }
> = {
  payment: { label: '收款', color: 'green', sign: 1 },
  refund: { label: '退款', color: 'red', sign: -1 },
  recharge: { label: '充值', color: 'blue', sign: 1 },
  withdraw: { label: '提现', color: 'orange', sign: -1 },
};

/** 支付渠道展示配置。 */
export const transactionChannelMeta: Record<TransactionChannel, { label: string }> = {
  wechat: { label: '微信支付' },
  alipay: { label: '支付宝' },
  bank: { label: '银行卡' },
  cash: { label: '现金' },
  balance: { label: '会员余额' },
};

export const transactionStatusMeta: Record<TransactionStatus, { label: string; color: string }> = {
  success: { label: '成功', color: 'green' },
  processing: { label: '处理中', color: 'blue' },
  failed: { label: '失败', color: 'red' },
};

/** 账单状态展示配置：待核对 → 待结算 → 已结算。 */
export const statementStatusMeta: Record<StatementStatus, { label: string; color: string }> = {
  pending: { label: '待核对', color: 'gold' },
  unsettled: { label: '待结算', color: 'blue' },
  settled: { label: '已结算', color: 'green' },
};

/** 渠道构成展示配置。 */
export const statementChannelMeta: Record<string, { label: string; color: string }> = {
  'dine-in': { label: '堂食', color: 'volcano' },
  takeaway: { label: '自提', color: 'cyan' },
  delivery: { label: '外卖', color: 'purple' },
};

/** 带方向的金额：收款 / 充值为正，退款 / 提现为负。 */
export function transactionSignedAmount(tx: Transaction): number {
  return transactionTypeMeta[tx.type].sign * tx.amount;
}

export interface TransactionQuery {
  keyword?: string;
  storeId?: string;
  type?: TransactionType | 'all';
  channel?: TransactionChannel | 'all';
  status?: TransactionStatus | 'all';
  /** 起始日期 YYYY-MM-DD（含）。 */
  startDate?: string;
  /** 结束日期 YYYY-MM-DD（含）。 */
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface TransactionSummary {
  /** 今日成功交易笔数。 */
  count: number;
  /** 今日收入（收款 + 充值）。 */
  income: number;
  /** 今日退款。 */
  refund: number;
  /** 今日净收入 = 收入 - 退款。 */
  net: number;
}

export async function fetchTransactionSummary(): Promise<TransactionSummary> {
  await sleep(180);
  const todayList = transactions.filter(
    (tx) => tx.time.startsWith(MOCK_TODAY) && tx.status === 'success',
  );
  const income = todayList
    .filter((tx) => tx.type === 'payment' || tx.type === 'recharge')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const refund = todayList
    .filter((tx) => tx.type === 'refund')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return { count: todayList.length, income, refund, net: income - refund };
}

export async function fetchTransactions(query: TransactionQuery = {}): Promise<Paged<Transaction>> {
  await sleep(260);
  const keyword = query.keyword?.trim().toLowerCase() ?? '';

  const list = transactions.filter((tx) => {
    if (query.storeId && query.storeId !== 'all' && tx.storeId !== query.storeId) return false;
    if (query.type && query.type !== 'all' && tx.type !== query.type) return false;
    if (query.channel && query.channel !== 'all' && tx.channel !== query.channel) return false;
    if (query.status && query.status !== 'all' && tx.status !== query.status) return false;

    const day = tx.time.slice(0, 10);
    if (query.startDate && day < query.startDate) return false;
    if (query.endDate && day > query.endDate) return false;

    if (keyword) {
      const haystack = `${tx.id} ${tx.relatedNo} ${tx.storeName} ${tx.operator}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  return paginate(list, query.page ?? 1, query.pageSize ?? 10);
}

/* ------------------------------------------------------------------ */
/* 对账单                                                              */
/* ------------------------------------------------------------------ */

/** 列表行：不含商品明细与渠道构成，明细在详情接口里返回。 */
export type StatementRow = Omit<Statement, 'items' | 'channelMix'>;

export interface StatementQuery {
  period?: string;
  storeId?: string;
  status?: StatementStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface StatementSummary {
  /** 应结金额合计。 */
  net: number;
  /** 已结算金额。 */
  settled: number;
  /** 待结算金额。 */
  unsettled: number;
  /** 待核对金额。 */
  pending: number;
  /** 账期内有账单的门店数。 */
  storeCount: number;
}

function toRow(statement: Statement): StatementRow {
  return {
    id: statement.id,
    period: statement.period,
    storeId: statement.storeId,
    storeName: statement.storeName,
    gross: statement.gross,
    discount: statement.discount,
    refund: statement.refund,
    serviceFee: statement.serviceFee,
    cost: statement.cost,
    net: statement.net,
    profit: statement.profit,
    orderCount: statement.orderCount,
    status: statement.status,
    settledAt: statement.settledAt,
    updatedAt: statement.updatedAt,
  };
}

export async function fetchStatements(query: StatementQuery = {}): Promise<Paged<StatementRow>> {
  await sleep(260);
  const list = statements
    .filter((statement) => {
      if (query.period && statement.period !== query.period) return false;
      if (query.storeId && query.storeId !== 'all' && statement.storeId !== query.storeId) {
        return false;
      }
      if (query.status && query.status !== 'all' && statement.status !== query.status) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.net - a.net)
    .map(toRow);

  return paginate(list, query.page ?? 1, query.pageSize ?? 10);
}

export async function fetchStatementSummary(params: {
  period: string;
  storeId?: string;
}): Promise<StatementSummary> {
  await sleep(200);
  const list = statements.filter((statement) => {
    if (statement.period !== params.period) return false;
    if (params.storeId && params.storeId !== 'all' && statement.storeId !== params.storeId) {
      return false;
    }
    return true;
  });

  const summary: StatementSummary = {
    net: 0,
    settled: 0,
    unsettled: 0,
    pending: 0,
    storeCount: list.length,
  };
  list.forEach((statement) => {
    summary.net += statement.net;
    if (statement.status === 'settled') summary.settled += statement.net;
    if (statement.status === 'unsettled') summary.unsettled += statement.net;
    if (statement.status === 'pending') summary.pending += statement.net;
  });
  return summary;
}

export async function fetchStatementDetail(id: string): Promise<Statement | undefined> {
  await sleep(220);
  return statements.find((statement) => statement.id === id);
}

/** 确认对账单：待核对 → 待结算（仅演示用，改内存数据）。 */
export async function confirmStatement(id: string): Promise<boolean> {
  await sleep(300);
  const target = statements.find((statement) => statement.id === id);
  if (!target || target.status !== 'pending') return false;
  target.status = 'unsettled';
  target.updatedAt = MOCK_NOW;
  return true;
}

/** 财务页面的门店下拉选项。 */
export async function fetchFinanceStoreOptions() {
  await sleep(80);
  return stores.map((store) => ({ label: store.name, value: store.id }));
}
