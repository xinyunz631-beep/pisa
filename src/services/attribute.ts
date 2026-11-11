import {
  attributeGroups,
  createAttributeGroupRecord,
  findAttributeGroup,
  removeAttributeGroupRecord,
  setAttributeGroupStatusRecord,
  updateAttributeGroupRecord,
  type AttributeGroupRecordInput,
} from '../mock/attributes';
import { dishes } from '../mock/db';
import { paginate, sleep } from '../mock/util';
import type {
  AttributeSelection,
  AttributeStatus,
  DishAttributeGroup,
  Paged,
} from '../types';

/** 属性组 + 关联菜品数 / 选项数。 */
export type AttributeGroupRow = DishAttributeGroup & {
  dishCount: number;
  optionCount: number;
};

export const attributeSelectionMeta: Record<AttributeSelection, { label: string; color: string }> = {
  single: { label: '单选', color: 'blue' },
  multiple: { label: '多选', color: 'purple' },
};

export const attributeStatusMeta: Record<AttributeStatus, { label: string; color: string }> = {
  enabled: { label: '启用中', color: 'green' },
  disabled: { label: '已停用', color: 'default' },
};

function dishCountOf(groupId: string): number {
  return dishes.filter((dish) => dish.attributeGroupIds.includes(groupId)).length;
}

function toRow(group: DishAttributeGroup): AttributeGroupRow {
  return { ...group, dishCount: dishCountOf(group.id), optionCount: group.options.length };
}

export interface AttributeGroupQuery {
  keyword?: string;
  selection?: AttributeSelection | 'all';
  status?: AttributeStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchAttributeGroups(
  query: AttributeGroupQuery = {},
): Promise<Paged<AttributeGroupRow>> {
  await sleep(240);
  const keyword = query.keyword?.trim().toLowerCase() ?? '';

  const list = attributeGroups
    .filter((group) => {
      if (query.selection && query.selection !== 'all' && group.selection !== query.selection) {
        return false;
      }
      if (query.status && query.status !== 'all' && group.status !== query.status) return false;
      if (keyword && !group.name.toLowerCase().includes(keyword)) return false;
      return true;
    })
    .map(toRow);

  return paginate(list, query.page ?? 1, query.pageSize ?? 10);
}

export interface AttributeSummary {
  total: number;
  enabled: number;
  optionTotal: number;
  dishRefTotal: number;
}

export async function fetchAttributeSummary(): Promise<AttributeSummary> {
  await sleep(160);
  const enabled = attributeGroups.filter((group) => group.status === 'enabled').length;
  return {
    total: attributeGroups.length,
    enabled,
    optionTotal: attributeGroups.reduce((sum, group) => sum + group.options.length, 0),
    // 各菜品引用的属性组数量之和（同一菜品引用多个属性组各计一次）
    dishRefTotal: dishes.reduce((sum, dish) => sum + dish.attributeGroupIds.length, 0),
  };
}

export interface AttributeOptionInput {
  label: string;
  extraPrice: number;
  isDefault: boolean;
}

export interface AttributeGroupInput {
  id?: string;
  name: string;
  selection: AttributeSelection;
  required: boolean;
  status: AttributeStatus;
  remark?: string;
  options: AttributeOptionInput[];
}

function validate(input: AttributeGroupInput): void {
  const name = input.name.trim();
  if (!name) throw new Error('请输入属性组名称');

  const duplicated = attributeGroups.find(
    (group) => group.id !== input.id && group.name === name,
  );
  if (duplicated) throw new Error(`属性组「${name}」已存在`);

  if (!input.options || input.options.length === 0) throw new Error('至少添加一个选项');

  const labels = input.options.map((option) => option.label.trim());
  if (labels.some((label) => !label)) throw new Error('选项名称不能为空');
  if (new Set(labels).size !== labels.length) throw new Error('选项名称不能重复');

  if (input.options.some((option) => option.extraPrice < 0)) throw new Error('加价金额不能为负数');

  if (input.selection === 'single' && input.required) {
    const defaultCount = input.options.filter((option) => option.isDefault).length;
    if (defaultCount !== 1) throw new Error('必选的单选属性组需要且只能设置一个默认选项');
  }
}

/** 新增 / 编辑属性组。 */
export async function saveAttributeGroup(input: AttributeGroupInput): Promise<DishAttributeGroup> {
  await sleep(300);
  validate(input);

  const record: AttributeGroupRecordInput = {
    name: input.name.trim(),
    selection: input.selection,
    required: input.required,
    status: input.status,
    remark: (input.remark ?? '').trim(),
    options: input.options.map((option) => ({
      label: option.label.trim(),
      extraPrice: option.extraPrice,
      isDefault: option.isDefault,
    })),
  };

  return input.id
    ? updateAttributeGroupRecord(input.id, record)
    : createAttributeGroupRecord(record);
}

export async function updateAttributeGroupStatus(
  id: string,
  status: AttributeStatus,
): Promise<void> {
  await sleep(180);
  setAttributeGroupStatusRecord(id, status);
}

/** 删除属性组：已被菜品引用时不允许删除。 */
export async function removeAttributeGroup(id: string): Promise<void> {
  await sleep(240);
  const target = findAttributeGroup(id);
  if (!target) throw new Error('属性组不存在');
  const count = dishCountOf(id);
  if (count > 0) throw new Error(`该属性组已被 ${count} 道菜品引用，请先在菜品中取消引用`);
  removeAttributeGroupRecord(id);
}

/** 菜品编辑抽屉使用的属性组选项（仅启用中的）。 */
export async function fetchAttributeGroupOptions(): Promise<DishAttributeGroup[]> {
  await sleep(120);
  return attributeGroups
    .filter((group) => group.status === 'enabled')
    .map((group) => ({ ...group, options: group.options.map((option) => ({ ...option })) }));
}
