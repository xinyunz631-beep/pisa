import {
  categories,
  categoryDishCount,
  createCategoryRecord,
  findCategory,
  removeCategoryRecord,
  setCategoryStatusRecord,
  updateCategoryRecord,
  type CategoryStatus,
  type DishCategory,
} from '../mock/categories';
import { paginate, sleep } from '../mock/util';
import type { Paged } from '../types';

export type { CategoryStatus, DishCategory } from '../mock/categories';

/** 分类状态展示配置。 */
export const categoryStatusMeta: Record<CategoryStatus, { label: string; color: string }> = {
  enabled: { label: '启用中', color: 'green' },
  disabled: { label: '已停用', color: 'default' },
};

/** 列表行：分类 + 动态统计的关联菜品数。 */
export type CategoryRow = DishCategory & { dishCount: number };

export interface CategoryQuery {
  keyword?: string;
  status?: CategoryStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface CategorySummary {
  /** 分类总数。 */
  total: number;
  enabled: number;
  disabled: number;
  /** 已归类的菜品总数。 */
  dishTotal: number;
}

function toRow(category: DishCategory): CategoryRow {
  return { ...category, dishCount: categoryDishCount(category.name) };
}

export async function fetchCategoryList(query: CategoryQuery = {}): Promise<Paged<CategoryRow>> {
  await sleep(240);
  const keyword = query.keyword?.trim().toLowerCase() ?? '';

  const list = categories
    .filter((category) => {
      if (query.status && query.status !== 'all' && category.status !== query.status) return false;
      if (keyword && !`${category.name} ${category.code}`.toLowerCase().includes(keyword)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
    .map(toRow);

  return paginate(list, query.page ?? 1, query.pageSize ?? 10);
}

export async function fetchCategorySummary(): Promise<CategorySummary> {
  await sleep(160);
  const enabled = categories.filter((category) => category.status === 'enabled').length;
  return {
    total: categories.length,
    enabled,
    disabled: categories.length - enabled,
    dishTotal: categories.reduce((sum, category) => sum + categoryDishCount(category.name), 0),
  };
}

export interface CategoryInput {
  id?: string;
  name: string;
  code: string;
  sort: number;
  status: CategoryStatus;
  remark?: string;
}

export interface CategoryRecordInput {
  name: string;
  code: string;
  sort: number;
  status: CategoryStatus;
  remark: string;
}

/** 新增 / 编辑分类：名称、编码不允许重复；改名会同步更新菜品归属。 */
export async function saveCategory(input: CategoryInput): Promise<DishCategory> {
  await sleep(300);
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();

  const duplicated = categories.find(
    (category) => category.id !== input.id && (category.name === name || category.code === code),
  );
  if (duplicated) {
    throw new Error(
      duplicated.name === name ? `分类名称「${name}」已存在` : `分类编码「${code}」已存在`,
    );
  }

  const record: CategoryRecordInput = {
    name,
    code,
    sort: input.sort,
    status: input.status,
    remark: (input.remark ?? '').trim(),
  };

  return input.id ? updateCategoryRecord(input.id, record) : createCategoryRecord(record);
}

export async function updateCategoryStatus(id: string, status: CategoryStatus): Promise<void> {
  await sleep(180);
  setCategoryStatusRecord(id, status);
}

/** 删除分类：分类下仍有菜品时抛出错误，由页面提示。 */
export async function removeCategory(id: string): Promise<void> {
  await sleep(240);
  if (!findCategory(id)) throw new Error('分类不存在');
  removeCategoryRecord(id);
}

/** 菜品表单 / 筛选使用的分类选项（仅启用中的分类）。 */
export async function fetchCategoryOptions(): Promise<string[]> {
  await sleep(80);
  return categories
    .filter((category) => category.status === 'enabled')
    .sort((a, b) => a.sort - b.sort)
    .map((category) => category.name);
}
