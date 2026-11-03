import {
  couponPackages,
  coupons,
  pointRecords,
  pointRules,
  MOCK_NOW,
  type AssetStatus,
  type Coupon,
  type CouponPackage,
  type CouponType,
  type PointRecord,
  type PointRecordType,
  type PointRule,
  type PointScene,
} from '../mock/assets';
import { paginate, sleep } from '../mock/util';
import type { Paged } from '../types';

export { MOCK_NOW, MOCK_TODAY } from '../mock/assets';
export type {
  AssetStatus,
  Coupon,
  CouponPackage,
  CouponType,
  PointRecord,
  PointRecordType,
  PointRule,
  PointScene,
};

/** 卡券类型展示配置。 */
export const couponTypeMeta: Record<CouponType, { label: string; color: string }> = {
  cash: { label: '代金券', color: 'volcano' },
  discount: { label: '折扣券', color: 'blue' },
  exchange: { label: '兑换券', color: 'purple' },
};

/** 卡券 / 券包通用状态展示配置。 */
export const assetStatusMeta: Record<AssetStatus, { label: string; color: string }> = {
  active: { label: '进行中', color: 'green' },
  ended: { label: '已结束', color: 'default' },
  disabled: { label: '已停用', color: 'red' },
};

/** 积分规则触发场景展示配置。 */
export const pointSceneMeta: Record<PointScene, { label: string; color: string }> = {
  consume: { label: '消费', color: 'volcano' },
  review: { label: '评价', color: 'blue' },
  checkin: { label: '签到', color: 'cyan' },
  register: { label: '注册', color: 'purple' },
};

/** 积分变动类型展示配置。 */
export const pointRecordTypeMeta: Record<PointRecordType, { label: string; color: string }> = {
  earn: { label: '获得', color: 'green' },
  spend: { label: '消耗', color: 'orange' },
  expire: { label: '过期', color: 'default' },
};

/* ------------------------------------------------------------------ */
/* 卡券                                                                */
/* ------------------------------------------------------------------ */

export interface CardStats {
  totalIssued: number;
  totalClaimed: number;
  totalUsed: number;
  /** 核销率（%），保留一位小数。 */
  redeemRate: number;
}

export async function fetchCardStats(): Promise<CardStats> {
  await sleep(260);
  const totalIssued = coupons.reduce((sum, coupon) => sum + coupon.total, 0);
  const totalClaimed = coupons.reduce((sum, coupon) => sum + coupon.claimed, 0);
  const totalUsed = coupons.reduce((sum, coupon) => sum + coupon.used, 0);

  return {
    totalIssued,
    totalClaimed,
    totalUsed,
    redeemRate: totalClaimed ? Math.round((totalUsed / totalClaimed) * 1000) / 10 : 0,
  };
}

export interface CouponQuery {
  keyword?: string;
  type?: CouponType | 'all';
  status?: AssetStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchCoupons(query: CouponQuery = {}): Promise<Paged<Coupon>> {
  await sleep(320);
  const { keyword, type = 'all', status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  const filtered = coupons.filter((coupon) => {
    if (kw && !coupon.name.includes(kw) && !coupon.id.toLowerCase().includes(kw.toLowerCase())) {
      return false;
    }
    if (type !== 'all' && coupon.type !== type) return false;
    if (status !== 'all' && coupon.status !== status) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

export interface CouponInput {
  id?: string;
  name: string;
  type: CouponType;
  value: number;
  threshold: number;
  validFrom: string;
  validTo: string;
  total: number;
}

export async function saveCoupon(input: CouponInput): Promise<Coupon> {
  await sleep(340);

  if (input.id) {
    const target = coupons.find((coupon) => coupon.id === input.id);
    if (!target) throw new Error('卡券不存在');
    target.name = input.name;
    target.type = input.type;
    target.value = input.value;
    target.threshold = input.threshold;
    target.validFrom = input.validFrom;
    target.validTo = input.validTo;
    target.total = input.total;
    return { ...target };
  }

  const created: Coupon = {
    id: `CP${String(coupons.length + 1).padStart(3, '0')}`,
    name: input.name,
    type: input.type,
    value: input.value,
    threshold: input.threshold,
    validFrom: input.validFrom,
    validTo: input.validTo,
    total: input.total,
    claimed: 0,
    used: 0,
    status: 'active',
  };
  coupons.unshift(created);
  return { ...created };
}

export async function updateCouponStatus(id: string, status: AssetStatus): Promise<void> {
  await sleep(220);
  const target = coupons.find((coupon) => coupon.id === id);
  if (!target) throw new Error('卡券不存在');
  target.status = status;
}

export async function removeCoupon(id: string): Promise<void> {
  await sleep(250);
  const index = coupons.findIndex((coupon) => coupon.id === id);
  if (index >= 0) coupons.splice(index, 1);
}

/* ------------------------------------------------------------------ */
/* 积分                                                                */
/* ------------------------------------------------------------------ */

export interface PointOverview {
  /** 累计发放积分。 */
  issued: number;
  /** 累计消耗积分。 */
  consumed: number;
  /** 当前流通积分。 */
  circulating: number;
}

export async function fetchPointOverview(): Promise<PointOverview> {
  await sleep(280);
  const issued = pointRecords
    .filter((record) => record.type === 'earn')
    .reduce((sum, record) => sum + record.points, 0);
  const consumed = pointRecords
    .filter((record) => record.type === 'spend')
    .reduce((sum, record) => sum + record.points, 0);
  const expired = pointRecords
    .filter((record) => record.type === 'expire')
    .reduce((sum, record) => sum + record.points, 0);

  return { issued, consumed, circulating: issued - consumed - expired };
}

export interface PointRuleQuery {
  keyword?: string;
  scene?: PointScene;
  page?: number;
  pageSize?: number;
}

export async function fetchPointRules(query: PointRuleQuery = {}): Promise<Paged<PointRule>> {
  await sleep(280);
  const { keyword, scene, page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  const filtered = pointRules.filter((rule) => {
    if (kw && !rule.name.includes(kw)) return false;
    if (scene && rule.scene !== scene) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

export interface PointRuleInput {
  id?: string;
  name: string;
  scene: PointScene;
  points: number;
  enabled: boolean;
}

export async function savePointRule(input: PointRuleInput): Promise<PointRule> {
  await sleep(320);

  if (input.id) {
    const target = pointRules.find((rule) => rule.id === input.id);
    if (!target) throw new Error('积分规则不存在');
    target.name = input.name;
    target.scene = input.scene;
    target.points = input.points;
    target.enabled = input.enabled;
    target.updatedAt = MOCK_NOW;
    return { ...target };
  }

  const created: PointRule = {
    id: `PR${String(pointRules.length + 1).padStart(3, '0')}`,
    name: input.name,
    scene: input.scene,
    points: input.points,
    enabled: input.enabled,
    updatedAt: MOCK_NOW,
  };
  pointRules.unshift(created);
  return { ...created };
}

export interface PointRecordQuery {
  keyword?: string;
  type?: PointRecordType | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchPointRecords(
  query: PointRecordQuery = {},
): Promise<Paged<PointRecord>> {
  await sleep(340);
  const { keyword, type = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  const filtered = pointRecords.filter((record) => {
    if (kw && !record.nickname.includes(kw) && !record.remark.includes(kw)) return false;
    if (type !== 'all' && record.type !== type) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

/* ------------------------------------------------------------------ */
/* 券包                                                                */
/* ------------------------------------------------------------------ */

export interface CouponOption {
  id: string;
  name: string;
  type: CouponType;
}

/** 券包表单「包含券」多选数据源。 */
export async function fetchCouponOptions(): Promise<CouponOption[]> {
  await sleep(200);
  return coupons.map((coupon) => ({ id: coupon.id, name: coupon.name, type: coupon.type }));
}

export interface PackageQuery {
  keyword?: string;
  status?: AssetStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchPackages(query: PackageQuery = {}): Promise<Paged<CouponPackage>> {
  await sleep(300);
  const { keyword, status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  const filtered = couponPackages.filter((item) => {
    if (kw && !item.name.includes(kw) && !item.id.toLowerCase().includes(kw.toLowerCase())) {
      return false;
    }
    if (status !== 'all' && item.status !== status) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

export interface PackageInput {
  id?: string;
  name: string;
  couponIds: string[];
  validFrom: string;
  validTo: string;
  total: number;
  status: AssetStatus;
}

export async function savePackage(input: PackageInput): Promise<CouponPackage> {
  await sleep(350);

  if (input.id) {
    const target = couponPackages.find((item) => item.id === input.id);
    if (!target) throw new Error('券包不存在');
    target.name = input.name;
    target.couponIds = input.couponIds;
    target.validFrom = input.validFrom;
    target.validTo = input.validTo;
    target.total = input.total;
    target.status = input.status;
    target.updatedAt = MOCK_NOW;
    return { ...target };
  }

  const created: CouponPackage = {
    id: `PG${String(couponPackages.length + 1).padStart(3, '0')}`,
    name: input.name,
    couponIds: input.couponIds,
    validFrom: input.validFrom,
    validTo: input.validTo,
    total: input.total,
    claimed: 0,
    status: input.status,
    updatedAt: MOCK_NOW,
  };
  couponPackages.unshift(created);
  return { ...created };
}

export async function removePackage(id: string): Promise<void> {
  await sleep(260);
  const index = couponPackages.findIndex((item) => item.id === id);
  if (index >= 0) couponPackages.splice(index, 1);
}
