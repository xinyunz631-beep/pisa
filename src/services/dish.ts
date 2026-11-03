import { dishes } from '../mock/db';
import { paginate, sleep } from '../mock/util';
import type { Dish, DishStatus, Paged } from '../types';

export interface DishQuery {
  keyword?: string;
  category?: string;
  status?: DishStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchDishes(query: DishQuery = {}): Promise<Paged<Dish>> {
  await sleep(300);
  const { keyword, category, status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  const filtered = dishes.filter((dish) => {
    if (kw && !dish.name.includes(kw) && !dish.id.toLowerCase().includes(kw.toLowerCase())) {
      return false;
    }
    if (category && dish.category !== category) return false;
    if (status !== 'all' && dish.status !== status) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

export async function fetchCategories(): Promise<string[]> {
  await sleep(80);
  return [...new Set(dishes.map((d) => d.category))];
}

export interface DishInput {
  id?: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  status: DishStatus;
  description?: string;
}

export async function saveDish(input: DishInput): Promise<Dish> {
  await sleep(300);
  const now = new Date();
  const updatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (input.id) {
    const target = dishes.find((d) => d.id === input.id);
    if (!target) throw new Error('菜品不存在');
    Object.assign(target, { ...input, updatedAt });
    return { ...target };
  }

  const dish: Dish = {
    id: `D${String(dishes.length + 1).padStart(3, '0')}`,
    name: input.name,
    category: input.category,
    price: input.price,
    cost: input.cost,
    status: input.status,
    description: input.description ?? '',
    sales: 0,
    updatedAt,
  };
  dishes.unshift(dish);
  return { ...dish };
}

export async function updateDishStatus(id: string, status: DishStatus): Promise<void> {
  await sleep(150);
  const target = dishes.find((d) => d.id === id);
  if (target) target.status = status;
}

export async function removeDish(id: string): Promise<void> {
  await sleep(200);
  const index = dishes.findIndex((d) => d.id === id);
  if (index >= 0) dishes.splice(index, 1);
}
