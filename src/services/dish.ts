import { attributeGroups } from '../mock/attributes';
import { categories, enabledCategoryNames } from '../mock/categories';
import { dishes } from '../mock/db';
import { paginate, sleep } from '../mock/util';
import type { Dish, DishAttributeBinding, DishStatus, Paged } from '../types';

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
  const kw = keyword?.trim().toLowerCase();

  const filtered = dishes.filter((dish) => {
    if (
      kw &&
      !dish.name.toLowerCase().includes(kw) &&
      !dish.id.toLowerCase().includes(kw) &&
      !dish.code.toLowerCase().includes(kw)
    ) {
      return false;
    }
    if (category && dish.category !== category) return false;
    if (status !== 'all' && dish.status !== status) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

/** 新增菜品时预填的商品编码（Mock 规则：取现有 SPU 编码最大值 + 1）。 */
export async function fetchNextDishCode(): Promise<string> {
  await sleep(60);
  const max = dishes.reduce((acc, dish) => {
    const num = Number(dish.code.replace(/\D/g, '')) || 0;
    return Math.max(acc, num);
  }, 0);
  return `SPU${String(max + 1).padStart(3, '0')}`;
}

export async function fetchCategories(): Promise<string[]> {
  await sleep(80);
  // 与「业务 · 分类管理」保持一致：只返回启用中的分类（默认顺序即分类排序）
  const names = enabledCategoryNames();
  // 兼容历史数据：菜品上存在但分类表里没有的名称也一并返回，避免筛选漏项
  const extra = [...new Set(dishes.map((dish) => dish.category))].filter(
    (name) => !categories.some((category) => category.name === name),
  );
  return [...names, ...extra];
}

/** 规格（SKU）入参：售价、库存都在规格维度上维护。 */
export interface DishSkuInput {
  code: string;
  specName: string;
  price: number;
  stock: number;
}

export interface DishInput {
  id?: string;
  /** 商品编码（SPU 编码）。 */
  code: string;
  name: string;
  category: string;
  /** 成本（元），用于对账单成本核算，不在菜品列表展示。 */
  cost: number;
  status: DishStatus;
  description?: string;
  /** 商品图，最多 6 张（dataURL）。 */
  images?: string[];
  /** 规格列表，至少 1 条。 */
  skus: DishSkuInput[];
  /** 做法 / 口味属性绑定（可选）：引用属性组，并可覆盖选项加价 / 隐藏选项。 */
  attributeBindings?: DishAttributeBinding[];
}

export async function saveDish(input: DishInput): Promise<Dish> {
  await sleep(300);
  const now = new Date();
  const updatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (!input.skus || input.skus.length === 0) throw new Error('至少需要保留一个规格');
  if (input.images && input.images.length > 6) throw new Error('商品图最多 6 张');

  const code = input.code.trim().toUpperCase();
  const duplicated = dishes.find((dish) => dish.id !== input.id && dish.code === code);
  if (duplicated) throw new Error(`商品编码「${code}」已存在`);

  const dishId = input.id ?? `D${String(dishes.length + 1).padStart(3, '0')}`;
  const skus = input.skus.map((sku, index) => ({
    id: `${dishId}-0${index + 1}`,
    code: sku.code.trim().toUpperCase(),
    specName: sku.specName.trim(),
    price: sku.price,
    stock: sku.stock,
  }));

  // SPU 的基础价 / 库存由 SKU 汇总推导，保证「列表展示」和「规格明细」永远一致
  const price = Math.min(...skus.map((sku) => sku.price));
  const stock = skus.reduce((sum, sku) => sum + sku.stock, 0);
  // 属性绑定规范化：丢弃不存在的属性组 / 选项，加价只保留非负数值
  const attributeBindings: DishAttributeBinding[] = [];
  (input.attributeBindings ?? []).forEach((binding) => {
    const group = attributeGroups.find((item) => item.id === binding.groupId);
    if (!group) return;
    const validOptionIds = new Set(group.options.map((option) => option.id));

    const optionPrices: Record<string, number> = {};
    Object.entries(binding.optionPrices ?? {}).forEach(([optionId, price]) => {
      if (validOptionIds.has(optionId) && typeof price === 'number' && price >= 0) {
        optionPrices[optionId] = price;
      }
    });

    const disabledOptionIds = (binding.disabledOptionIds ?? []).filter((optionId) =>
      validOptionIds.has(optionId),
    );

    attributeBindings.push({
      groupId: group.id,
      ...(binding.required === undefined ? {} : { required: binding.required }),
      ...(Object.keys(optionPrices).length > 0 ? { optionPrices } : {}),
      ...(disabledOptionIds.length > 0 ? { disabledOptionIds } : {}),
    });
  });

  if (input.id) {
    const target = dishes.find((dish) => dish.id === input.id);
    if (!target) throw new Error('菜品不存在');
    Object.assign(target, {
      code,
      name: input.name.trim(),
      category: input.category,
      price,
      cost: input.cost,
      stock,
      images: input.images ?? target.images,
      skus,
      attributeBindings,
      status: input.status,
      description: input.description ?? target.description,
      updatedAt,
    });
    return { ...target };
  }

  const dish: Dish = {
    id: dishId,
    code,
    name: input.name.trim(),
    category: input.category,
    price,
    cost: input.cost,
    stock,
    images: input.images ?? [],
    skus,
    attributeBindings,
    sales: 0,
    status: input.status,
    description: input.description ?? '',
    updatedAt,
  };
  dishes.unshift(dish);
  return { ...dish };
}

export async function updateDishStatus(id: string, status: DishStatus): Promise<void> {
  await sleep(150);
  const target = dishes.find((dish) => dish.id === id);
  if (target) target.status = status;
}

export async function removeDish(id: string): Promise<void> {
  await sleep(200);
  const index = dishes.findIndex((dish) => dish.id === id);
  if (index >= 0) dishes.splice(index, 1);
}
