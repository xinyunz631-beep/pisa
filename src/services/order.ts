import { orders } from '../mock/db';
import { paginate, sleep } from '../mock/util';
import type { Order, OrderChannel, OrderStatus, Paged } from '../types';

export interface OrderQuery {
  keyword?: string;
  storeName?: string;
  channel?: OrderChannel | 'all';
  status?: OrderStatus | 'all';
  range?: [string, string];
  page?: number;
  pageSize?: number;
}

export async function fetchOrders(query: OrderQuery = {}): Promise<Paged<Order>> {
  await sleep(300);
  const { keyword, storeName, channel = 'all', status = 'all', range, page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim().toLowerCase();

  const filtered = orders
    .filter((order) => {
      if (kw && !order.id.toLowerCase().includes(kw) && !order.customer.includes(kw)) return false;
      if (storeName && order.storeName !== storeName) return false;
      if (channel !== 'all' && order.channel !== channel) return false;
      if (status !== 'all' && order.status !== status) return false;
      if (range) {
        const day = order.createdAt.slice(0, 10);
        if (day < range[0] || day > range[1]) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return paginate(filtered, page, pageSize);
}

export async function fetchOrderById(id: string): Promise<Order | undefined> {
  await sleep(200);
  return orders.find((o) => o.id === id);
}
