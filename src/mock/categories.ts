import { dishes } from './db';
import { pad } from './util';

/**
 * 业务 · 分类管理 Mock 数据（菜品分类）。
 * 分类名称直接取自现有菜品数据，保证「分类管理」与「菜品管理」口径一致；
 * 新增 / 编辑 / 停用 / 删除只改内存，刷新页面恢复初始数据。
 */

/** 演示用“当前时间”，用于新增 / 编辑后的更新时间。 */
export const MOCK_CATEGORY_NOW = '2026-11-04 18:30';

export type CategoryStatus = 'enabled' | 'disabled';

export interface DishCategory {
  /** 分类 ID，如 CAT001。 */
  id: string;
  /** 分类名称，菜品通过该名称归类。 */
  name: string;
  /** 分类编码（大写字母 + 下划线）。 */
  code: string;
  /** 排序值，越小越靠前。 */
  sort: number;
  status: CategoryStatus;
  remark: string;
  updatedAt: string;
}

/** 初始分类的编码与备注（按名称匹配）。 */
const CATEGORY_META: Record<string, { code: string; remark: string }> = {
  招牌主菜: { code: 'SIGNATURE', remark: '门店主打、毛利较高的招牌菜' },
  小炒: { code: 'STIR_FRY', remark: '现炒热菜，出餐较快' },
  主食: { code: 'STAPLE', remark: '米饭 / 面食 / 点心类主食' },
  汤羹: { code: 'SOUP', remark: '汤类与羹类' },
  饮品: { code: 'DRINK', remark: '瓶装与现制饮品' },
  甜品: { code: 'DESSERT', remark: '甜品与冰品' },
  凉菜: { code: 'COLD_DISH', remark: '凉拌类开胃菜' },
};

const SEED_UPDATED_AT = [
  '2026-10-28 10:12',
  '2026-10-26 15:40',
  '2026-10-22 09:18',
  '2026-10-19 16:05',
  '2026-10-15 11:32',
  '2026-10-12 14:26',
  '2026-10-08 17:48',
];

function seedCategories(): DishCategory[] {
  const names: string[] = [];
  dishes.forEach((dish) => {
    if (!names.includes(dish.category)) names.push(dish.category);
  });

  const seeded = names.map((name, index) => ({
    id: `CAT${pad(index + 1, 3)}`,
    name,
    code: CATEGORY_META[name]?.code ?? `CATEGORY_${index + 1}`,
    sort: (index + 1) * 10,
    status: 'enabled' as CategoryStatus,
    remark: CATEGORY_META[name]?.remark ?? '',
    updatedAt: SEED_UPDATED_AT[index % SEED_UPDATED_AT.length],
  }));

  // 预置一个「还没挂菜品」的分类，方便演示删除 / 空分类状态
  seeded.push({
    id: `CAT${pad(seeded.length + 1, 3)}`,
    name: '套餐',
    code: 'COMBO',
    sort: (seeded.length + 1) * 10,
    status: 'enabled',
    remark: '组合套餐（双人餐 / 家庭餐），暂未挂菜品',
    updatedAt: '2026-09-30 10:05',
  });

  return seeded;
}

export const categories: DishCategory[] = seedCategories();

/** 某个分类下的菜品数量（动态统计，菜品增删后自动变化）。 */
export function categoryDishCount(name: string): number {
  return dishes.filter((dish) => dish.category === name).length;
}

/** 全部启用分类的名称（菜品筛选 / 表单下拉使用）。 */
export function enabledCategoryNames(): string[] {
  return categories.filter((category) => category.status === 'enabled').map((category) => category.name);
}

export function findCategory(id: string): DishCategory | undefined {
  return categories.find((category) => category.id === id);
}

export interface CategoryRecordInput {
  name: string;
  code: string;
  sort: number;
  status: CategoryStatus;
  remark: string;
}

/** 新增分类（排序值由页面传入）。 */
export function createCategoryRecord(input: CategoryRecordInput): DishCategory {
  const category: DishCategory = {
    id: `CAT${pad(categories.length + 1, 3)}`,
    ...input,
    updatedAt: MOCK_CATEGORY_NOW,
  };
  categories.push(category);
  return { ...category };
}

/** 编辑分类；改名时同步把该分类下的菜品挂到新名称上，避免菜品游离。 */
export function updateCategoryRecord(id: string, input: CategoryRecordInput): DishCategory {
  const target = findCategory(id);
  if (!target) throw new Error('分类不存在');

  if (target.name !== input.name) {
    dishes.forEach((dish) => {
      if (dish.category === target.name) dish.category = input.name;
    });
  }

  Object.assign(target, { ...input, updatedAt: MOCK_CATEGORY_NOW });
  return { ...target };
}

export function setCategoryStatusRecord(id: string, status: CategoryStatus): void {
  const target = findCategory(id);
  if (!target) return;
  target.status = status;
  target.updatedAt = MOCK_CATEGORY_NOW;
}

/** 删除分类：分类下还有菜品时不允许删除（与真实后台一致）。 */
export function removeCategoryRecord(id: string): void {
  const index = categories.findIndex((category) => category.id === id);
  if (index < 0) return;
  const count = categoryDishCount(categories[index].name);
  if (count > 0) {
    throw new Error(`该分类下还有 ${count} 道菜，请先调整菜品分类再删除`);
  }
  categories.splice(index, 1);
}
