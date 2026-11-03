import type { DishStatus, MemberStatus, OrderChannel, OrderStatus, StoreStatus } from '../types';

export function money(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}

export function compactMoney(value: number): string {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

export const orderStatusMeta: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待接单', color: 'gold' },
  serving: { label: '制作中', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  refunded: { label: '已退款', color: 'default' },
};

export const channelMeta: Record<OrderChannel, { label: string; color: string }> = {
  'dine-in': { label: '堂食', color: 'volcano' },
  takeaway: { label: '自提', color: 'cyan' },
  delivery: { label: '外卖', color: 'purple' },
};

export const storeStatusMeta: Record<StoreStatus, { label: string; color: string }> = {
  open: { label: '营业中', color: 'green' },
  preparing: { label: '筹备中', color: 'gold' },
  closed: { label: '已停业', color: 'default' },
};

export const dishStatusMeta: Record<DishStatus, { label: string; color: string }> = {
  on: { label: '在售', color: 'green' },
  off: { label: '已下架', color: 'default' },
};

export const memberLevelMeta: Record<string, { label: string; color: string }> = {
  普通会员: { label: '普通会员', color: 'default' },
  银卡会员: { label: '银卡会员', color: 'blue' },
  金卡会员: { label: '金卡会员', color: 'gold' },
  黑卡会员: { label: '黑卡会员', color: 'purple' },
};

export const memberStatusMeta: Record<MemberStatus, { label: string; color: string }> = {
  active: { label: '正常', color: 'green' },
  frozen: { label: '已冻结', color: 'red' },
};
