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

/** 商品规格（SKU）：一个菜品（SPU）下可以有多个规格，各自独立售价与库存。 */
export interface DishSku {
  id: string;
  /** SKU 编码，如 SPU001-01。 */
  code: string;
  /** 规格名称，如「小份」「大杯」。 */
  specName: string;
  price: number;
  stock: number;
}

export interface Dish {
  id: string;
  /** 商品编码（SPU 编码），商家可自定义。 */
  code: string;
  name: string;
  category: string;
  /** 基础售价 = 全部 SKU 中的最低价（订单快照、对账单按它计算）。 */
  price: number;
  cost: number;
  /** 当前库存 = 全部 SKU 库存合计。 */
  stock: number;
  /** 商品图，最多 6 张；Mock 用内联 SVG 占位。 */
  images: string[];
  /** 规格（SKU）列表，至少 1 条。 */
  skus: DishSku[];
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
