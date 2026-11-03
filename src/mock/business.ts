import type { DishStatus, StoreStatus } from '../types';
import { dayOffset, dishes, stores as baseStores, TODAY } from './db';
import { formatDate, mulberry32, pad, pick } from './util';

/**
 * 业务模块 Mock 数据：菜单管理 / 门店管理 / 配送管理。
 * 固定随机种子（20260901），每次刷新数据一致；
 * 所有「更新时间」落在 2026-09-21 ~ 2026-11-03 之间，不会出现未来时间。
 */
const rng = mulberry32(20260901);

/** 生成一条历史更新时间（TODAY 之前的 1 ~ 44 天，即 2026-09-21 ~ 2026-11-03）。 */
function recentTime(): string {
  const day = dayOffset(TODAY, 1 + Math.floor(rng() * 44));
  const hour = 8 + Math.floor(rng() * 13);
  const minute = Math.floor(rng() * 60);
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())} ${pad(hour)}:${pad(minute)}`;
}

/* ------------------------------------------------------------------ */
/* 门店管理                                                            */
/* ------------------------------------------------------------------ */

/** 门店管理页使用的门店数据：在既有门店基础上补齐电话 / 营业时间 / 开业时间。 */
export interface BusinessStore {
  id: string;
  name: string;
  city: string;
  address: string;
  manager: string;
  phone: string;
  businessHours: string;
  status: StoreStatus;
  openedAt: string;
}

const hoursPool = ['09:30-21:30', '10:00-22:00', '10:30-22:30', '11:00-23:00', '08:30-20:30'];
const openedYearPool = ['2022', '2023', '2024', '2025'];
const phonePrefixPool = ['37', '38', '39', '58', '86', '88'];

/** 在既有 12 家门店之外补充的门店，凑齐 22 条。 */
const extraStoreSeed: Array<[string, string, string, string, StoreStatus]> = [
  ['重庆解放碑店', '重庆', '渝中区民族路 166 号', '谭勇', 'open'],
  ['长沙五一广场店', '长沙', '芙蓉区黄兴中路 88 号', '周琳', 'open'],
  ['天津和平路店', '天津', '和平区和平路 188 号', '高翔', 'open'],
  ['青岛台东店', '青岛', '市北区台东三路 56 号', '于洋', 'preparing'],
  ['郑州二七店', '郑州', '二七区德化街 100 号', '冯磊', 'open'],
  ['合肥淮河路店', '合肥', '庐阳区淮河路 199 号', '蒋雯', 'open'],
  ['福州三坊七巷店', '福州', '鼓楼区南后街 66 号', '林峰', 'open'],
  ['昆明南屏街店', '昆明', '五华区南屏街 78 号', '代云', 'open'],
  ['无锡崇安寺店', '无锡', '梁溪区崇安寺 21 号', '钱进', 'closed'],
  ['宁波天一店', '宁波', '海曙区中山东路 188 号', '柳青', 'open'],
];

function buildStore(
  id: string,
  name: string,
  city: string,
  address: string,
  manager: string,
  status: StoreStatus,
): BusinessStore {
  const phone = `1${pick(rng, phonePrefixPool)}${String(Math.floor(rng() * 90_000_000) + 10_000_000)}`;
  return {
    id,
    name,
    city,
    address,
    manager,
    phone,
    businessHours: pick(rng, hoursPool),
    status,
    openedAt: `${pick(rng, openedYearPool)}-${pad(1 + Math.floor(rng() * 12))}-${pad(1 + Math.floor(rng() * 28))}`,
  };
}

/** 门店管理数据：前 12 条复用全局门店（与其城市 / 地址 / 店长 / 状态保持一致）。 */
export const businessStores: BusinessStore[] = [
  ...baseStores.map((store) =>
    buildStore(store.id, store.name, store.city, store.address, store.manager, store.status),
  ),
  ...extraStoreSeed.map(([name, city, address, manager, status], index) =>
    buildStore(`ST${pad(13 + index, 3)}`, name, city, address, manager, status),
  ),
];

/* ------------------------------------------------------------------ */
/* 菜单管理                                                            */
/* ------------------------------------------------------------------ */

export type MenuPeriod = 'morning' | 'noon' | 'evening' | 'all';
export type MenuStatus = 'online' | 'offline';

export interface MenuDish {
  id: string;
  name: string;
  category: string;
  price: number;
  status: DishStatus;
}

export interface Menu {
  id: string;
  name: string;
  storeId: string;
  storeName: string;
  dishCount: number;
  period: MenuPeriod;
  status: MenuStatus;
  updatedAt: string;
}

/** 字符串哈希：保证同一菜单每次生成的菜品清单一致。 */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** 菜单菜品数量：8 ~ 12 道，由菜单 id 决定。 */
export function menuDishCount(menuId: string): number {
  return 8 + (hashString(menuId) % 5);
}

/** 按菜单 id 确定性生成菜品清单（从全局菜品中取，状态与菜品管理保持一致）。 */
export function buildMenuDishes(menuId: string): MenuDish[] {
  const localRng = mulberry32(hashString(menuId));
  const pool = [...dishes];
  const count = menuDishCount(menuId);
  const result: MenuDish[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const [dish] = pool.splice(Math.floor(localRng() * pool.length), 1);
    result.push({
      id: dish.id,
      name: dish.name,
      category: dish.category,
      price: dish.price,
      status: dish.status,
    });
  }
  return result;
}

const menuSeed: Array<[string, number, MenuPeriod, MenuStatus]> = [
  ['午市套餐', 0, 'noon', 'online'],
  ['秋季新品', 1, 'all', 'online'],
  ['早市轻食', 2, 'morning', 'online'],
  ['晚市家庭套餐', 3, 'evening', 'online'],
  ['工作日双人餐', 4, 'noon', 'online'],
  ['招牌川味套餐', 8, 'all', 'online'],
  ['单人快餐', 5, 'noon', 'offline'],
  ['亲子套餐', 6, 'evening', 'online'],
  ['夜宵专场', 7, 'evening', 'offline'],
  ['下午茶甜品', 9, 'all', 'online'],
  ['节日团圆宴', 10, 'evening', 'online'],
  ['商务简餐', 11, 'noon', 'online'],
  ['学生优惠餐', 12, 'noon', 'offline'],
  ['门店招牌菜', 13, 'all', 'online'],
  ['养生轻食', 14, 'morning', 'online'],
  ['冬季暖锅', 15, 'evening', 'online'],
  ['招牌面食', 16, 'morning', 'online'],
  ['特调饮品', 17, 'all', 'offline'],
];

/** 菜单数据 18 条。 */
export const menus: Menu[] = menuSeed.map(([name, storeIndex, period, status], index) => {
  const store = businessStores[storeIndex];
  const id = `MN${pad(index + 1, 3)}`;
  return {
    id,
    name,
    storeId: store.id,
    storeName: store.name,
    dishCount: menuDishCount(id),
    period,
    status,
    updatedAt: recentTime(),
  };
});

/* ------------------------------------------------------------------ */
/* 配送管理                                                            */
/* ------------------------------------------------------------------ */

export type DeliveryStatus = 'enabled' | 'disabled';

export interface DeliveryRule {
  id: string;
  name: string;
  storeId: string;
  storeName: string;
  rangeKm: number;
  minAmount: number;
  fee: number;
  etaMinutes: number;
  status: DeliveryStatus;
  updatedAt: string;
}

const deliverySeed: Array<[string, number, number, number, number, number, DeliveryStatus]> = [
  ['静安店标准配送', 0, 3, 20, 5, 30, 'enabled'],
  ['徐汇店商圈配送', 1, 2.5, 18, 4, 28, 'enabled'],
  ['朝阳店夜间配送', 2, 4, 25, 6, 35, 'enabled'],
  ['海淀店校园配送', 3, 3, 20, 5, 32, 'enabled'],
  ['天河店标准配送', 4, 3.5, 22, 5, 30, 'enabled'],
  ['南山店科技园配送', 5, 2.8, 20, 4, 28, 'enabled'],
  ['西湖店景区配送', 6, 3, 20, 5, 30, 'enabled'],
  ['春熙店核心圈配送', 7, 2.5, 18, 4, 27, 'enabled'],
  ['新街口店标准配送', 8, 3, 20, 5, 29, 'enabled'],
  ['江汉路店标准配送', 9, 3, 20, 5, 31, 'disabled'],
  ['钟楼店景区配送', 10, 2.5, 18, 4, 28, 'enabled'],
  ['观前店标准配送', 11, 3, 20, 5, 30, 'disabled'],
  ['解放碑店夜间配送', 12, 3.5, 22, 5, 33, 'enabled'],
  ['五一广场店标准配送', 13, 3, 20, 5, 31, 'enabled'],
  ['和平路店商圈配送', 14, 2.5, 18, 4, 29, 'enabled'],
  ['台东店标准配送', 15, 3, 20, 5, 32, 'enabled'],
];

/** 配送规则数据 16 条。 */
export const deliveryRules: DeliveryRule[] = deliverySeed.map(
  ([name, storeIndex, rangeKm, minAmount, fee, etaMinutes, status], index) => {
    const store = businessStores[storeIndex];
    return {
      id: `DR${pad(index + 1, 3)}`,
      name,
      storeId: store.id,
      storeName: store.name,
      rangeKm,
      minAmount,
      fee,
      etaMinutes,
      status,
      updatedAt: recentTime(),
    };
  },
);

/** 供服务层在保存时复用：今天（演示当天）的时间戳，绝不晚于演示时间。 */
export const DEMO_NOW = formatDate(TODAY);
