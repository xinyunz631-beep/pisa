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
  /** 做法 / 口味属性绑定：引用属性组，并可按本商品覆盖选项加价 / 隐藏选项。 */
  attributeBindings: DishAttributeBinding[];
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

/* ------------------------------------------------------------------ */
/* 做法 / 口味属性组                                                   */
/* ------------------------------------------------------------------ */

/** 属性组选择方式：单选 / 多选。 */
export type AttributeSelection = 'single' | 'multiple';
export type AttributeStatus = 'enabled' | 'disabled';

export interface DishAttributeOption {
  id: string;
  /** 选项名称，如「微辣」「免葱」。 */
  label: string;
  /** 选项加价（元）；口味 / 辣度类恒为 0，加料类才会 > 0。 */
  extraPrice: number;
  isDefault: boolean;
}

/** 商品对属性组的引用配置：加价可在商品级覆盖（A 商品 +3 元、B 商品 0 元）。 */
export interface DishAttributeBinding {
  groupId: string;
  /** 覆盖属性组的「是否必选」；缺省继承属性组配置。 */
  required?: boolean;
  /** 本商品选项加价覆盖：optionId -> 加价（元）；缺省继承属性组的默认加价。 */
  optionPrices?: Record<string, number>;
  /** 本商品不提供的选项 ID。 */
  disabledOptionIds?: string[];
}

/** 做法 / 口味属性组：不参与售价与库存，下单时选择并按订单快照保存。 */
export interface DishAttributeGroup {
  id: string;
  name: string;
  selection: AttributeSelection;
  /** 是否必选（点单时必须选择）。 */
  required: boolean;
  options: DishAttributeOption[];
  status: AttributeStatus;
  remark: string;
  updatedAt: string;
}
