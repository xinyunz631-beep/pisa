import { dishes, stores, TODAY } from './db';
import { formatDate, mulberry32, pad, pick } from './util';

/**
 * 售后处理 / 系统（岗位、人员、系统日志）的 Mock 数据。
 *
 * 说明：这几个模块的领域类型直接定义在本文件 —— src/types.ts 是全队共享的只读文件，
 * 单模块类型不往里塞；页面统一从 services/ops 引用这里 re-export 的类型。
 * 所有随机数据都基于固定种子、并以 Mock 今天（2026-11-04）为锚点生成，
 * 当天只出现凌晨时间，保证不会出现未来时间。
 */

export type AfterSaleType = 'refund' | 'return' | 'exchange';
export type AfterSaleStatus = 'pending' | 'processing' | 'done' | 'rejected';

export interface AfterSaleItem {
  name: string;
  price: number;
  qty: number;
}

export interface AfterSaleRecord {
  time: string;
  operator: string;
  action: string;
}

export interface AfterSaleTicket {
  id: string;
  orderId: string;
  storeName: string;
  customer: string;
  phone: string;
  type: AfterSaleType;
  reason: string;
  amount: number;
  status: AfterSaleStatus;
  appliedAt: string;
  items: AfterSaleItem[];
  records: AfterSaleRecord[];
}

export type PositionStatus = 'active' | 'disabled';

export interface Position {
  id: string;
  name: string;
  code: string;
  department: string;
  staffCount: number;
  status: PositionStatus;
  createdAt: string;
}

export type StaffStatus = 'active' | 'disabled';

export interface Staff {
  id: string;
  name: string;
  employeeNo: string;
  phone: string;
  position: string;
  storeName: string;
  status: StaffStatus;
  joinedAt: string;
  email: string;
  role: string;
  lastLogin: string;
  loginIp: string;
}

export type LogAction = 'create' | 'update' | 'delete' | 'login' | 'export';
export type LogResult = 'success' | 'fail';

export interface SystemLog {
  id: string;
  time: string;
  operator: string;
  module: string;
  action: LogAction;
  ip: string;
  result: LogResult;
  duration: number;
}

const rng = mulberry32(20260901);

/** 以 2026-11-04 为零点的「N 天前」时间。 */
function dateDaysAgo(days: number, hour: number, minute: number): Date {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), hour, minute, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function stamp(d: Date): string {
  return formatDate(d);
}

function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

const afterSaleCustomerPool = [
  '张伟',
  '王芳',
  '李娜',
  '刘敏',
  '陈杰',
  '杨静',
  '黄磊',
  '周涛',
  '林小雨',
  '徐子涵',
  '赵强',
  '孙丽',
];

const afterSaleServicePool = ['客服-李婷', '客服-周敏', '客服-王磊', '售后专员-张宁'];
const afterSaleAuditPool = ['售后主管-陈曦', '运营经理-赵磊'];
const afterSaleTypePool: AfterSaleType[] = ['refund', 'refund', 'return', 'exchange'];
const afterSaleStatusPattern: AfterSaleStatus[] = [
  'pending',
  'processing',
  'done',
  'pending',
  'done',
  'rejected',
  'processing',
  'done',
  'pending',
  'done',
];

const afterSaleReasonPool: Record<AfterSaleType, readonly string[]> = {
  refund: ['菜品口味与描述不符', '上菜时间过长', '重复下单', '误点下单', '少送商品'],
  return: ['食材不新鲜', '包装破损', '菜品温度不足', '分量与菜单不符'],
  exchange: ['菜品撒漏', '错送菜品', '餐具缺失', '菜品与订单不符'],
};

/** 售后工单：24 条，含订单商品明细与处理记录（Timeline 用）。 */
export const afterSales: AfterSaleTicket[] = Array.from({ length: 24 }, (_, i) => {
  const status = afterSaleStatusPattern[i % afterSaleStatusPattern.length];
  const type = pick(rng, afterSaleTypePool);
  const isToday = status === 'pending' && i < 4;
  const daysAgo = isToday ? 0 : 1 + Math.floor(rng() * 60);
  const hour = daysAgo === 0 ? 1 + Math.floor(rng() * 4) : 8 + Math.floor(rng() * 12);
  const applied = dateDaysAgo(daysAgo, hour, Math.floor(rng() * 60));

  const itemCount = 1 + Math.floor(rng() * 3);
  const items: AfterSaleItem[] = [];
  const usedDish = new Set<string>();
  while (items.length < itemCount) {
    const dish = pick(rng, dishes);
    if (usedDish.has(dish.name)) continue;
    usedDish.add(dish.name);
    items.push({ name: dish.name, price: dish.price, qty: 1 + Math.floor(rng() * 2) });
  }
  const amount = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const customer = pick(rng, afterSaleCustomerPool);
  const records: AfterSaleRecord[] = [
    { time: stamp(applied), operator: customer, action: '客户提交售后申请' },
  ];
  let cursor = applied;
  if (status !== 'pending') {
    cursor = addMinutes(applied, 20 + Math.floor(rng() * 90));
    records.push({
      time: stamp(cursor),
      operator: pick(rng, afterSaleServicePool),
      action: '客服已受理，正在核实订单信息',
    });
  }
  if (status === 'done') {
    cursor = addMinutes(cursor, 40 + Math.floor(rng() * 160));
    records.push({
      time: stamp(cursor),
      operator: pick(rng, afterSaleAuditPool),
      action: type === 'exchange' ? '审核通过，已安排换货补发' : '审核通过，款项已原路退回',
    });
  }
  if (status === 'rejected') {
    cursor = addMinutes(cursor, 40 + Math.floor(rng() * 160));
    records.push({
      time: stamp(cursor),
      operator: pick(rng, afterSaleAuditPool),
      action: '审核拒绝：不符合售后条件',
    });
  }

  const compact = stamp(applied).slice(0, 10).replace(/-/g, '');
  return {
    id: `AS${compact}${pad(i + 1, 4)}`,
    orderId: `BS${compact}${pad(2001 + i, 4)}`,
    storeName: pick(rng, stores).name,
    customer,
    phone: `1${pick(rng, ['38', '39', '86', '58', '77'])}****${pad(
      Math.floor(rng() * 9000) + 1000,
      4,
    )}`,
    type,
    reason: pick(rng, afterSaleReasonPool[type]),
    amount,
    status,
    appliedAt: stamp(applied),
    items,
    records,
  };
});

/** 岗位种子：名称 + 所属部门，固定顺序保证 Mock 数据可复现。 */
const positionSeed: Array<[string, string]> = [
  ['区域经理', '运营中心'],
  ['门店店长', '门店运营部'],
  ['副店长', '门店运营部'],
  ['值班经理', '门店运营部'],
  ['前厅主管', '门店运营部'],
  ['后厨主管', '门店运营部'],
  ['收银员', '门店运营部'],
  ['服务员', '门店运营部'],
  ['传菜员', '门店运营部'],
  ['厨师长', '后厨中心'],
  ['炒锅厨师', '后厨中心'],
  ['切配厨师', '后厨中心'],
  ['面点师', '后厨中心'],
  ['洗碗工', '后厨中心'],
  ['采购专员', '供应链中心'],
  ['仓储管理员', '供应链中心'],
  ['财务专员', '财务部'],
  ['出纳', '财务部'],
  ['招聘专员', '人力资源部'],
  ['培训专员', '人力资源部'],
  ['数据分析师', '信息技术部'],
  ['运维工程师', '信息技术部'],
];

const staffNamePool = [
  '张伟',
  '王芳',
  '李娜',
  '刘敏',
  '陈杰',
  '杨静',
  '黄磊',
  '周涛',
  '林小雨',
  '徐子涵',
  '赵强',
  '孙丽',
  '吴磊',
  '郑爽',
  '冯雪',
  '蒋涛',
  '韩梅',
  '曹阳',
  '邓超',
  '许静',
  '傅强',
  '沈梦',
  '卢婷',
  '姜浩',
  '崔颖',
  '谭凯',
  '陆敏',
  '范磊',
  '汪洋',
  '任洁',
];

const staffStatusPattern: StaffStatus[] = ['active', 'active', 'active', 'active', 'disabled'];
const staffRolePool = ['总部管理员', '门店管理员', '门店员工', '财务专员', '客服专员'];

/** 人员：26 条，岗位取自岗位种子，门店取自已有的门店 Mock 数据。 */
export const staff: Staff[] = Array.from({ length: 26 }, (_, i) => {
  const joined = dateDaysAgo(5 + Math.floor(rng() * 58), 9 + Math.floor(rng() * 8), Math.floor(rng() * 60));
  const status = staffStatusPattern[i % staffStatusPattern.length];
  const loginDaysAgo = Math.floor(rng() * 21);
  const login =
    loginDaysAgo === 0
      ? dateDaysAgo(0, 1 + Math.floor(rng() * 4), Math.floor(rng() * 60))
      : dateDaysAgo(loginDaysAgo, 8 + Math.floor(rng() * 12), Math.floor(rng() * 60));

  return {
    id: `S${pad(i + 1, 3)}`,
    name: staffNamePool[i % staffNamePool.length],
    employeeNo: `EMP${pad(1001 + i, 4)}`,
    phone: `1${pick(rng, ['38', '39', '86', '58', '77', '35'])}${pad(
      Math.floor(rng() * 90_000_000) + 10_000_000,
      8,
    )}`,
    position: pick(
      rng,
      positionSeed.map(([name]) => name),
    ),
    storeName: pick(rng, stores).name,
    status,
    joinedAt: stamp(joined).slice(0, 10),
    email: `staff${pad(i + 1, 3)}@bisas.com`,
    role: pick(rng, staffRolePool),
    lastLogin: status === 'disabled' ? '账号已停用' : stamp(login),
    loginIp:
      status === 'disabled'
        ? '—'
        : `192.168.${1 + Math.floor(rng() * 20)}.${1 + Math.floor(rng() * 250)}`,
  };
});

/** 岗位：22 条，在岗人数与人员 Mock 数据保持大致一致。 */
export const positions: Position[] = positionSeed.map(([name, department], i) => {
  const created = dateDaysAgo(4 + Math.floor(rng() * 60), 9 + Math.floor(rng() * 9), Math.floor(rng() * 60));
  return {
    id: `P${pad(i + 1, 3)}`,
    name,
    code: `POS${pad(i + 1, 3)}`,
    department,
    staffCount: 1 + Math.floor(rng() * 12) + staff.filter((item) => item.position === name).length,
    status: i === 9 || i === 16 ? 'disabled' : 'active',
    createdAt: stamp(created).slice(0, 10),
  };
});

const logOperatorPool = [
  '张明',
  '李婷',
  '王强',
  '赵雪',
  '陈磊',
  '刘洋',
  '孙倩',
  '吴昊',
  '郑楠',
  '何静',
  '马超',
  '沈悦',
];

const logModulePool = [
  '订单管理',
  '售后处理',
  '会员管理',
  '菜品管理',
  '营销活动',
  '资产中心',
  '门店管理',
  '岗位管理',
  '人员管理',
  '系统设置',
];

const logActionPattern: LogAction[] = [
  'create',
  'update',
  'delete',
  'login',
  'export',
  'update',
  'login',
  'update',
  'create',
  'export',
];

const logIpPool = [
  '192.168.1.23',
  '192.168.1.88',
  '10.0.12.45',
  '10.0.8.102',
  '116.228.66.31',
  '58.246.120.18',
  '121.40.73.9',
];

/** 系统日志：60 条，按时间倒序返回。 */
export const logs: SystemLog[] = Array.from({ length: 60 }, (_, i) => {
  const isRecent = i < 5;
  const daysAgo = isRecent ? 0 : 1 + Math.floor(rng() * 63);
  const hour = daysAgo === 0 ? 1 + Math.floor(rng() * 4) : 8 + Math.floor(rng() * 13);
  const time = dateDaysAgo(daysAgo, hour, Math.floor(rng() * 60));
  const action = logActionPattern[i % logActionPattern.length];
  const result: LogResult = rng() < 0.1 ? 'fail' : 'success';

  return {
    id: `LOG${pad(i + 1, 3)}`,
    time: stamp(time),
    operator: pick(rng, logOperatorPool),
    module: pick(rng, logModulePool),
    action,
    ip: pick(rng, logIpPool),
    result,
    duration: result === 'fail' ? 800 + Math.floor(rng() * 900) : 20 + Math.floor(rng() * 480),
  };
}).sort((a, b) => b.time.localeCompare(a.time));
