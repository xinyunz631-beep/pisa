export interface Paged<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type StoreStatus = 'open' | 'preparing' | 'closed';

export interface Store {
  id: string;
  name: string;
  city: string;
  address: string;
  manager: string;
  status: StoreStatus;
  turnover: number;
  orders: number;
}

export type DishStatus = 'on' | 'off';

export interface Dish {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  /** 当前库存（份）。 */
  stock: number;
  sales: number;
  status: DishStatus;
  description: string;
  updatedAt: string;
}

export type OrderChannel = 'dine-in' | 'takeaway' | 'delivery';
export type OrderStatus = 'pending' | 'serving' | 'completed' | 'refunded';

export interface OrderItem {
  dishId: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  storeId: string;
  storeName: string;
  channel: OrderChannel;
  status: OrderStatus;
  tableNo?: string;
  customer: string;
  phone: string;
  amount: number;
  items: OrderItem[];
  createdAt: string;
}

export interface Kpi {
  key: string;
  title: string;
  value: number;
  unit?: string;
  delta: number;
  hint: string;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface StoreRank {
  storeId: string;
  name: string;
  turnover: number;
  orders: number;
}

export type MemberStatus = 'active' | 'frozen';

export interface Member {
  id: string;
  memberNo: string;
  nickname: string;
  phone: string;
  level: string;
  points: number;
  totalSpent: number;
  orderCount: number;
  lastVisit: string;
  joinedAt: string;
  birthday: string;
  tags: string[];
  status: MemberStatus;
}

/** 等级升级判定方式：累计消费金额 / 消费频次 / 满足任一。 */
export type LevelUpgradeType = 'amount' | 'frequency' | 'either';

export interface MemberLevelConfig {
  id: string;
  name: string;
  order: number;
  upgradeType: LevelUpgradeType;
  minAmount: number;
  minFrequency: number;
  /** 会员折扣，10 表示不打折。 */
  discount: number;
  /** 积分倍率。 */
  pointsRate: number;
  memberCount: number;
  description: string;
}

export type TagCategory = '人群价值' | '行为' | '人口属性';
export type TagType = 'auto' | 'manual';
export type TagStatus = 'enabled' | 'disabled';

export interface TagCondition {
  field: string;
  operator: string;
  value: string;
}

export interface MemberTagConfig {
  id: string;
  name: string;
  category: TagCategory;
  type: TagType;
  conditions: TagCondition[];
  updateFrequency: 'daily' | 'weekly' | 'manual';
  coverage: number;
  updatedAt: string;
  status: TagStatus;
}
