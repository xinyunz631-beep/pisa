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
