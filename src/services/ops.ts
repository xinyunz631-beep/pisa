import {
  afterSales,
  logs,
  positions,
  staff,
  type AfterSaleStatus,
  type AfterSaleTicket,
  type AfterSaleType,
  type LogAction,
  type Position,
  type PositionStatus,
  type Staff,
  type StaffStatus,
  type SystemLog,
} from '../mock/ops';
import { formatDate, paginate, sleep } from '../mock/util';
import type { Paged } from '../types';

// 领域类型随 Mock 数据定义在 mock/ops.ts，这里统一 re-export，页面只依赖 service 层。
export type {
  AfterSaleItem,
  AfterSaleRecord,
  AfterSaleStatus,
  AfterSaleTicket,
  AfterSaleType,
  LogAction,
  LogResult,
  Position,
  PositionStatus,
  Staff,
  StaffStatus,
  SystemLog,
} from '../mock/ops';

/**
 * 售后 / 系统模块的 Mock service：筛选 + 前端分页，增改删只改内存数组。
 * 原型里的「当前时刻」固定为 Mock 今天上午，保证操作产生的时间也不会超过 2026-11-04。
 */
const MOCK_NOW = formatDate(new Date(2026, 10, 4, 6, 30));

/* ------------------------------- 售后处理 ------------------------------- */

export interface AfterSaleQuery {
  keyword?: string;
  status?: AfterSaleStatus | 'all';
  type?: AfterSaleType | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchAfterSales(query: AfterSaleQuery = {}): Promise<Paged<AfterSaleTicket>> {
  await sleep(320);
  const { keyword, status = 'all', type = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim().toLowerCase();

  const filtered = afterSales
    .filter((ticket) => {
      if (
        kw &&
        !ticket.id.toLowerCase().includes(kw) &&
        !ticket.orderId.toLowerCase().includes(kw) &&
        !ticket.customer.includes(kw) &&
        !ticket.storeName.includes(kw)
      ) {
        return false;
      }
      if (status !== 'all' && ticket.status !== status) return false;
      if (type !== 'all' && ticket.type !== type) return false;
      return true;
    })
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));

  return paginate(filtered, page, pageSize);
}

/** 通过 / 拒绝售后工单：只改内存状态并追加一条处理记录。 */
export async function auditAfterSale(
  id: string,
  action: 'approve' | 'reject',
): Promise<AfterSaleTicket> {
  await sleep(320);
  const target = afterSales.find((ticket) => ticket.id === id);
  if (!target) throw new Error('售后工单不存在');
  if (target.status === 'done' || target.status === 'rejected') {
    throw new Error('该工单已处理完成');
  }

  target.status = action === 'approve' ? 'done' : 'rejected';
  target.records.push({
    time: MOCK_NOW,
    operator: '当前客服',
    action:
      action === 'approve'
        ? target.type === 'exchange'
          ? '审核通过，已安排换货补发'
          : '审核通过，款项已原路退回'
        : '审核拒绝，已通知客户并说明原因',
  });

  return { ...target, records: [...target.records], items: [...target.items] };
}

/* -------------------------------- 岗位管理 ------------------------------- */

export interface PositionQuery {
  keyword?: string;
  status?: PositionStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchPositions(query: PositionQuery = {}): Promise<Paged<Position>> {
  await sleep(300);
  const { keyword, status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  const filtered = positions.filter((position) => {
    if (kw && !position.name.includes(kw)) return false;
    if (status !== 'all' && position.status !== status) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

export async function fetchPositionDepartments(): Promise<string[]> {
  await sleep(80);
  return [...new Set(positions.map((position) => position.department))];
}

export interface PositionInput {
  id?: string;
  name: string;
  code: string;
  department: string;
  status: PositionStatus;
}

let positionSeq = positions.length;

export async function savePosition(input: PositionInput): Promise<Position> {
  await sleep(320);
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (positions.some((item) => item.code === code && item.id !== input.id)) {
    throw new Error('岗位编码已存在，请更换');
  }

  if (input.id) {
    const target = positions.find((item) => item.id === input.id);
    if (!target) throw new Error('岗位不存在');
    Object.assign(target, {
      name,
      code,
      department: input.department,
      status: input.status,
    });
    return { ...target };
  }

  const created: Position = {
    id: `P${String(positionSeq + 1).padStart(3, '0')}`,
    name,
    code,
    department: input.department,
    staffCount: 0,
    status: input.status,
    createdAt: formatDate(new Date(2026, 10, 4, 6, 30)).slice(0, 10),
  };
  positionSeq += 1;
  positions.unshift(created);
  return { ...created };
}

export async function removePosition(id: string): Promise<void> {
  await sleep(250);
  const index = positions.findIndex((item) => item.id === id);
  if (index >= 0) positions.splice(index, 1);
}

/* -------------------------------- 人员管理 ------------------------------- */

export interface StaffQuery {
  keyword?: string;
  position?: string;
  storeName?: string;
  status?: StaffStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchStaff(query: StaffQuery = {}): Promise<Paged<Staff>> {
  await sleep(300);
  const { keyword, position, storeName, status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim().toLowerCase();

  const filtered = staff.filter((item) => {
    if (
      kw &&
      !item.name.includes(kw) &&
      !item.employeeNo.toLowerCase().includes(kw) &&
      !item.phone.includes(kw)
    ) {
      return false;
    }
    if (position && item.position !== position) return false;
    if (storeName && item.storeName !== storeName) return false;
    if (status !== 'all' && item.status !== status) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

export interface StaffFormOptions {
  positions: string[];
  stores: string[];
  roles: string[];
}

export async function fetchStaffFormOptions(): Promise<StaffFormOptions> {
  await sleep(80);
  return {
    positions: [...new Set(positions.map((item) => item.name))],
    stores: [...new Set(staff.map((item) => item.storeName))],
    roles: [...new Set(staff.map((item) => item.role))],
  };
}

export interface StaffInput {
  id?: string;
  name: string;
  employeeNo: string;
  phone: string;
  position: string;
  storeName: string;
  status: StaffStatus;
  joinedAt: string;
}

let staffSeq = staff.length;

export async function saveStaff(input: StaffInput): Promise<Staff> {
  await sleep(320);
  const name = input.name.trim();
  const employeeNo = input.employeeNo.trim().toUpperCase();
  if (staff.some((item) => item.employeeNo === employeeNo && item.id !== input.id)) {
    throw new Error('工号已存在，请更换');
  }

  if (input.id) {
    const target = staff.find((item) => item.id === input.id);
    if (!target) throw new Error('人员不存在');
    Object.assign(target, {
      name,
      employeeNo,
      phone: input.phone,
      position: input.position,
      storeName: input.storeName,
      status: input.status,
      joinedAt: input.joinedAt,
    });
    return { ...target };
  }

  const seq = staffSeq + 1;
  const created: Staff = {
    id: `S${String(seq).padStart(3, '0')}`,
    name,
    employeeNo,
    phone: input.phone,
    position: input.position,
    storeName: input.storeName,
    status: input.status,
    joinedAt: input.joinedAt,
    email: `staff${String(seq).padStart(3, '0')}@bisas.com`,
    role: '门店员工',
    lastLogin: '—',
    loginIp: '—',
  };
  staffSeq = seq;
  staff.unshift(created);
  return { ...created };
}

/* -------------------------------- 系统日志 ------------------------------- */

export interface LogQuery {
  keyword?: string;
  action?: LogAction | 'all';
  range?: [string, string];
  page?: number;
  pageSize?: number;
}

export async function fetchLogs(query: LogQuery = {}): Promise<Paged<SystemLog>> {
  await sleep(300);
  const { keyword, action = 'all', range, page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  const filtered = logs.filter((log) => {
    if (kw && !log.operator.includes(kw) && !log.module.includes(kw)) return false;
    if (action !== 'all' && log.action !== action) return false;
    if (range) {
      const day = log.time.slice(0, 10);
      if (day < range[0] || day > range[1]) return false;
    }
    return true;
  });

  return paginate(filtered, page, pageSize);
}
