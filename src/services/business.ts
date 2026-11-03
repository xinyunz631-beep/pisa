import {
  businessStores,
  buildMenuDishes,
  DEMO_NOW,
  deliveryRules,
  menuDishCount,
  menus,
  type BusinessStore,
  type DeliveryRule,
  type DeliveryStatus,
  type Menu,
  type MenuDish,
  type MenuPeriod,
  type MenuStatus,
} from '../mock/business';
import { orders } from '../mock/db';
import { mulberry32, paginate, sleep } from '../mock/util';
import type { Paged, StoreStatus } from '../types';

export type {
  BusinessStore,
  DeliveryRule,
  DeliveryStatus,
  Menu,
  MenuDish,
  MenuPeriod,
  MenuStatus,
};

type IdPrefix = 'MN' | 'ST' | 'DR';

function nextId(prefix: IdPrefix, ids: string[]): string {
  const max = ids.reduce((acc, id) => Math.max(acc, Number(id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/* ------------------------------------------------------------------ */
/* 菜单管理                                                            */
/* ------------------------------------------------------------------ */

export interface MenuQuery {
  keyword?: string;
  storeId?: string;
  status?: MenuStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchMenus(query: MenuQuery = {}): Promise<Paged<Menu>> {
  await sleep(320);
  const { keyword, storeId, status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  // 门店改名后，菜单里冗余的门店名按 storeId 实时解析，保证两页展示一致。
  const resolved = menus.map((menu) => {
    const store = businessStores.find((item) => item.id === menu.storeId);
    return store && store.name !== menu.storeName ? { ...menu, storeName: store.name } : menu;
  });

  const filtered = resolved.filter((menu) => {
    if (kw && !menu.name.includes(kw) && !menu.storeName.includes(kw)) return false;
    if (storeId && menu.storeId !== storeId) return false;
    if (status !== 'all' && menu.status !== status) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

/** 菜单下的菜品清单：按菜单 id 确定性生成 8 ~ 12 道菜。 */
export async function fetchMenuDishes(menuId: string): Promise<MenuDish[]> {
  await sleep(280);
  return buildMenuDishes(menuId);
}

export interface MenuInput {
  id?: string;
  name: string;
  storeId: string;
  period: MenuPeriod;
  status: MenuStatus;
}

export async function saveMenu(input: MenuInput): Promise<Menu> {
  await sleep(320);
  const store = businessStores.find((item) => item.id === input.storeId);
  if (!store) throw new Error('门店不存在，请重新选择');

  if (input.id) {
    const target = menus.find((item) => item.id === input.id);
    if (!target) throw new Error('菜单不存在或已被删除');
    Object.assign(target, {
      name: input.name,
      storeId: store.id,
      storeName: store.name,
      period: input.period,
      status: input.status,
      updatedAt: DEMO_NOW,
    });
    return { ...target };
  }

  const id = nextId('MN', menus.map((item) => item.id));
  const menu: Menu = {
    id,
    name: input.name,
    storeId: store.id,
    storeName: store.name,
    dishCount: menuDishCount(id),
    period: input.period,
    status: input.status,
    updatedAt: DEMO_NOW,
  };
  menus.unshift(menu);
  return { ...menu };
}

export async function removeMenu(id: string): Promise<void> {
  await sleep(220);
  const index = menus.findIndex((item) => item.id === id);
  if (index >= 0) menus.splice(index, 1);
}

/* ------------------------------------------------------------------ */
/* 门店管理                                                            */
/* ------------------------------------------------------------------ */

/** 门店下拉选项：菜单 / 配送页筛选与表单共用，保证引用的是同一份门店数据。 */
export async function fetchBusinessStoreOptions(): Promise<Array<{ label: string; value: string }>> {
  await sleep(120);
  return businessStores.map((store) => ({ label: store.name, value: store.id }));
}

export interface BusinessStoreQuery {
  keyword?: string;
  status?: StoreStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchBusinessStores(query: BusinessStoreQuery = {}): Promise<Paged<BusinessStore>> {
  await sleep(320);
  const { keyword, status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  const filtered = businessStores.filter((store) => {
    if (
      kw &&
      !store.name.includes(kw) &&
      !store.city.includes(kw) &&
      !store.id.toLowerCase().includes(kw.toLowerCase())
    ) {
      return false;
    }
    if (status !== 'all' && store.status !== status) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

export interface BusinessStoreInput {
  id?: string;
  name: string;
  city: string;
  address: string;
  manager: string;
  phone: string;
  businessHours: string;
  status: StoreStatus;
}

export async function saveBusinessStore(input: BusinessStoreInput): Promise<BusinessStore> {
  await sleep(320);

  if (input.id) {
    const target = businessStores.find((item) => item.id === input.id);
    if (!target) throw new Error('门店不存在或已被删除');
    Object.assign(target, {
      name: input.name,
      city: input.city,
      address: input.address,
      manager: input.manager,
      phone: input.phone,
      businessHours: input.businessHours,
      status: input.status,
    });
    return { ...target };
  }

  const store: BusinessStore = {
    id: nextId('ST', businessStores.map((item) => item.id)),
    name: input.name,
    city: input.city,
    address: input.address,
    manager: input.manager,
    phone: input.phone,
    businessHours: input.businessHours,
    status: input.status,
    openedAt: DEMO_NOW.slice(0, 10),
  };
  businessStores.unshift(store);
  return { ...store };
}

export async function removeBusinessStore(id: string): Promise<void> {
  await sleep(220);
  const index = businessStores.findIndex((item) => item.id === id);
  if (index >= 0) businessStores.splice(index, 1);
}

/* ------------------------------------------------------------------ */
/* 配送管理                                                            */
/* ------------------------------------------------------------------ */

export interface DeliveryRuleQuery {
  storeId?: string;
  status?: DeliveryStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchDeliveryRules(
  query: DeliveryRuleQuery = {},
): Promise<Paged<DeliveryRule>> {
  await sleep(320);
  const { storeId, status = 'all', page = 1, pageSize = 10 } = query;

  // 同样按 storeId 解析门店名，门店改名后配送列表同步更新。
  const resolved = deliveryRules.map((rule) => {
    const store = businessStores.find((item) => item.id === rule.storeId);
    return store && store.name !== rule.storeName ? { ...rule, storeName: store.name } : rule;
  });

  const filtered = resolved.filter((rule) => {
    if (storeId && rule.storeId !== storeId) return false;
    if (status !== 'all' && rule.status !== status) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

export interface DeliveryRuleInput {
  id?: string;
  name: string;
  storeId: string;
  rangeKm: number;
  minAmount: number;
  fee: number;
  etaMinutes: number;
  status: DeliveryStatus;
}

export async function saveDeliveryRule(input: DeliveryRuleInput): Promise<DeliveryRule> {
  await sleep(320);
  const store = businessStores.find((item) => item.id === input.storeId);
  if (!store) throw new Error('门店不存在，请重新选择');

  if (input.id) {
    const target = deliveryRules.find((item) => item.id === input.id);
    if (!target) throw new Error('配送规则不存在或已被删除');
    Object.assign(target, {
      name: input.name,
      storeId: store.id,
      storeName: store.name,
      rangeKm: input.rangeKm,
      minAmount: input.minAmount,
      fee: input.fee,
      etaMinutes: input.etaMinutes,
      status: input.status,
      updatedAt: DEMO_NOW,
    });
    return { ...target };
  }

  const rule: DeliveryRule = {
    id: nextId('DR', deliveryRules.map((item) => item.id)),
    name: input.name,
    storeId: store.id,
    storeName: store.name,
    rangeKm: input.rangeKm,
    minAmount: input.minAmount,
    fee: input.fee,
    etaMinutes: input.etaMinutes,
    status: input.status,
    updatedAt: DEMO_NOW,
  };
  deliveryRules.unshift(rule);
  return { ...rule };
}

export async function removeDeliveryRule(id: string): Promise<void> {
  await sleep(220);
  const index = deliveryRules.findIndex((item) => item.id === id);
  if (index >= 0) deliveryRules.splice(index, 1);
}

export interface DeliveryOverview {
  /** 今日配送单量（单） */
  todayOrders: number;
  /** 平均配送时长（分钟） */
  avgMinutes: number;
  /** 准时率（%） */
  onTimeRate: number;
}

/** 配送概览：单量取今天的外卖订单，时长取启用规则均值，准时率用固定种子生成。 */
export async function fetchDeliveryOverview(): Promise<DeliveryOverview> {
  await sleep(260);
  const todayKey = DEMO_NOW.slice(0, 10);
  const todayOrders = orders.filter(
    (order) => order.channel === 'delivery' && order.createdAt.startsWith(todayKey),
  ).length;

  const enabledRules = deliveryRules.filter((rule) => rule.status === 'enabled');
  const avgMinutes = enabledRules.length
    ? Math.round(
        (enabledRules.reduce((sum, rule) => sum + rule.etaMinutes, 0) / enabledRules.length) * 10,
      ) / 10
    : 0;
  const localRng = mulberry32(20261104);
  const onTimeRate = Math.round((92 + localRng() * 7) * 10) / 10;

  return { todayOrders, avgMinutes, onTimeRate };
}
