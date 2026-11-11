import type {
  AttributeSelection,
  AttributeStatus,
  DishAttributeGroup,
  DishAttributeOption,
} from '../types';

/**
 * 业务 · 做法属性 Mock 数据。
 * 属性组是可复用的基础数据：菜品（SPU）只引用属性组，「做法属性」页面统一维护。
 * 属性组不参与售价与库存，下单时按订单快照记录，不会生成 SKU。
 */

/** 演示用“当前时间”，用于新增 / 编辑后的更新时间。 */
export const MOCK_ATTRIBUTE_NOW = '2026-11-04 18:30';

interface GroupSeed {
  name: string;
  selection: AttributeSelection;
  required: boolean;
  status: AttributeStatus;
  remark: string;
  updatedAt: string;
  options: Array<{ label: string; extraPrice: number; isDefault?: boolean }>;
}

const GROUP_SEEDS: GroupSeed[] = [
  {
    name: '辣度',
    selection: 'single',
    required: true,
    status: 'enabled',
    remark: '辣度口味，门店默认中辣',
    updatedAt: '2026-10-30 09:12',
    options: [
      { label: '微辣', extraPrice: 0 },
      { label: '中辣', extraPrice: 0, isDefault: true },
      { label: '特辣', extraPrice: 0 },
    ],
  },
  {
    name: '温度',
    selection: 'single',
    required: true,
    status: 'enabled',
    remark: '饮品 / 甜品的冷热选择',
    updatedAt: '2026-10-28 14:05',
    options: [
      { label: '常温', extraPrice: 0 },
      { label: '冰', extraPrice: 0, isDefault: true },
      { label: '热', extraPrice: 0 },
    ],
  },
  {
    name: '忌口',
    selection: 'multiple',
    required: false,
    status: 'enabled',
    remark: '制作时可备注的忌口项',
    updatedAt: '2026-10-25 16:40',
    options: [
      { label: '免葱', extraPrice: 0 },
      { label: '免香菜', extraPrice: 0 },
      { label: '少油', extraPrice: 0 },
      { label: '少盐', extraPrice: 0 },
    ],
  },
  {
    name: '加料',
    selection: 'multiple',
    required: false,
    status: 'enabled',
    remark: '可选加料，按选项加价（口味类属性不加价）',
    updatedAt: '2026-10-22 11:18',
    options: [
      { label: '加宽粉', extraPrice: 3 },
      { label: '加午餐肉', extraPrice: 5 },
      { label: '加豆皮', extraPrice: 2 },
    ],
  },
];

function seedGroups(): DishAttributeGroup[] {
  return GROUP_SEEDS.map((seed, index) => {
    const id = `A${String(index + 1).padStart(3, '0')}`;
    return {
      id,
      name: seed.name,
      selection: seed.selection,
      required: seed.required,
      status: seed.status,
      remark: seed.remark,
      updatedAt: seed.updatedAt,
      options: seed.options.map((option, optionIndex) => ({
        id: `${id}-O${optionIndex + 1}`,
        label: option.label,
        extraPrice: option.extraPrice,
        isDefault: option.isDefault ?? false,
      })),
    };
  });
}

export const attributeGroups: DishAttributeGroup[] = seedGroups();

/** 按菜品分类给初始菜品分配属性组（与餐饮实际场景对齐）。 */
const CATEGORY_GROUP_MAP: Record<string, string[]> = {
  招牌主菜: ['A001', 'A003', 'A004'],
  小炒: ['A001', 'A003'],
  凉菜: ['A001', 'A003'],
  饮品: ['A002'],
  甜品: ['A002'],
  主食: ['A003'],
};

export function attributeGroupIdsForCategory(category: string): string[] {
  return [...(CATEGORY_GROUP_MAP[category] ?? [])];
}

export function findAttributeGroup(id: string): DishAttributeGroup | undefined {
  return attributeGroups.find((group) => group.id === id);
}

export interface AttributeOptionRecordInput {
  label: string;
  extraPrice: number;
  isDefault: boolean;
}

export interface AttributeGroupRecordInput {
  name: string;
  selection: AttributeSelection;
  required: boolean;
  status: AttributeStatus;
  remark: string;
  options: AttributeOptionRecordInput[];
}

function buildOptions(groupId: string, options: AttributeOptionRecordInput[]): DishAttributeOption[] {
  return options.map((option, index) => ({
    id: `${groupId}-O${index + 1}`,
    label: option.label,
    extraPrice: option.extraPrice,
    isDefault: option.isDefault,
  }));
}

export function createAttributeGroupRecord(input: AttributeGroupRecordInput): DishAttributeGroup {
  const id = `A${String(attributeGroups.length + 1).padStart(3, '0')}`;
  const group: DishAttributeGroup = {
    id,
    name: input.name,
    selection: input.selection,
    required: input.required,
    status: input.status,
    remark: input.remark,
    updatedAt: MOCK_ATTRIBUTE_NOW,
    options: buildOptions(id, input.options),
  };
  attributeGroups.push(group);
  return { ...group };
}

export function updateAttributeGroupRecord(
  id: string,
  input: AttributeGroupRecordInput,
): DishAttributeGroup {
  const target = findAttributeGroup(id);
  if (!target) throw new Error('属性组不存在');
  Object.assign(target, {
    name: input.name,
    selection: input.selection,
    required: input.required,
    status: input.status,
    remark: input.remark,
    updatedAt: MOCK_ATTRIBUTE_NOW,
    options: buildOptions(id, input.options),
  });
  return { ...target, options: target.options.map((option) => ({ ...option })) };
}

export function setAttributeGroupStatusRecord(id: string, status: AttributeStatus): void {
  const target = findAttributeGroup(id);
  if (!target) return;
  target.status = status;
  target.updatedAt = MOCK_ATTRIBUTE_NOW;
}

export function removeAttributeGroupRecord(id: string): void {
  const index = attributeGroups.findIndex((group) => group.id === id);
  if (index >= 0) attributeGroups.splice(index, 1);
}
