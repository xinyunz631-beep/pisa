import type {
  Member,
  MemberLevelConfig,
  MemberStatus,
  MemberTagConfig,
} from '../types';
import { mulberry32, pad, pick } from './util';

const rng = mulberry32(6312026);

const nicknames = [
  '小鹿',
  '吃遍街巷',
  '阿茶',
  '周末不加班',
  '锅气爱好者',
  '一碗小面',
  '南山食客',
  'Tommy',
  '甜辣控',
  '老饕张',
  '轻食主义',
  '打工人小李',
  '深夜食堂',
  '橙子汽水',
  '麻辣人生',
  '粥粥',
  '回锅肉真爱',
  '西柚',
  '早八人',
  '烤肉自由',
  'Lily',
  '干饭第一名',
  '小笼包',
  '火锅灵魂',
  '冰美式',
  '夜宵战士',
  '吴同学',
  '香菜别来',
  '两碗米饭',
  '周末探店',
  '柠檬茶',
  '老广阿强',
  '奶茶三分糖',
  '川渝小张',
  '碳水快乐',
  '王女士',
];

const levelBySpent = (totalSpent: number): string => {
  if (totalSpent >= 50_000) return '黑卡会员';
  if (totalSpent >= 10_000) return '金卡会员';
  if (totalSpent >= 2_000) return '银卡会员';
  return '普通会员';
};

const tagPool = ['高频到店', '价格敏感', '外卖偏好', '新客', '沉默会员', '生日本月', '周末消费', '亲子客群'];

const statusPool: MemberStatus[] = ['active', 'active', 'active', 'active', 'frozen'];

const TODAY = new Date(2026, 10, 4);

function daysAgo(days: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d;
}

/** 会员 Mock 数据：会员号 / 手机号可检索。 */
export const members: Member[] = Array.from({ length: 46 }, (_, i) => {
  const totalSpent = Math.round(300 + rng() * 79_000);
  const orderCount = 1 + Math.floor(rng() * 120);
  const tags = Array.from({ length: 1 + Math.floor(rng() * 3) }, () => pick(rng, tagPool));
  const phoneTail = String(Math.floor(rng() * 90_000_000) + 10_000_000);
  const last = daysAgo(Math.floor(rng() * 45));
  return {
    id: `MB${String(i + 1).padStart(4, '0')}`,
    memberNo: `M${String(100001 + i)}`,
    nickname: nicknames[i % nicknames.length],
    phone: `1${pick(rng, ['38', '39', '86', '58', '77', '35'])}${phoneTail}`,
    level: levelBySpent(totalSpent),
    points: Math.round(totalSpent * (0.8 + rng() * 0.6)),
    totalSpent,
    orderCount,
    lastVisit: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())} ${pad(9 + Math.floor(rng() * 12))}:${pad(Math.floor(rng() * 60))}`,
    joinedAt: `2024-${pad(1 + Math.floor(rng() * 12))}-${pad(1 + Math.floor(rng() * 28))}`,
    birthday: `199${Math.floor(rng() * 10)}-${pad(1 + Math.floor(rng() * 12))}-${pad(1 + Math.floor(rng() * 28))}`,
    tags: [...new Set(tags)],
    status: pick(rng, statusPool),
  };
});

/** 等级配置：升级条件按累计消费金额 / 消费频次判定（either 表示满足任一即可）。 */
const levelCount = (name: string) => members.filter((m) => m.level === name).length;

export const memberLevelConfigs: MemberLevelConfig[] = [
  {
    id: 'LV1',
    name: '普通会员',
    order: 1,
    upgradeType: 'amount',
    minAmount: 0,
    minFrequency: 0,
    discount: 10,
    pointsRate: 1,
    memberCount: levelCount('普通会员'),
    description: '注册即成为普通会员，享受基础积分。',
  },
  {
    id: 'LV2',
    name: '银卡会员',
    order: 2,
    upgradeType: 'either',
    minAmount: 2_000,
    minFrequency: 15,
    discount: 9.5,
    pointsRate: 1.2,
    memberCount: levelCount('银卡会员'),
    description: '累计消费满 2000 元，或消费满 15 次自动升级。',
  },
  {
    id: 'LV3',
    name: '金卡会员',
    order: 3,
    upgradeType: 'either',
    minAmount: 10_000,
    minFrequency: 60,
    discount: 9,
    pointsRate: 1.5,
    memberCount: levelCount('金卡会员'),
    description: '累计消费满 10000 元，或消费满 60 次自动升级。',
  },
  {
    id: 'LV4',
    name: '黑卡会员',
    order: 4,
    upgradeType: 'either',
    minAmount: 50_000,
    minFrequency: 200,
    discount: 8.5,
    pointsRate: 2,
    memberCount: levelCount('黑卡会员'),
    description: '累计消费满 50000 元，或消费满 200 次自动升级。',
  },
];

export const tagFieldOptions = [
  '累计消费金额',
  '消费频次',
  '最近消费距今天数',
  '注册天数',
  '会员等级',
  '所在城市',
  '生日月份',
];

export const memberTagConfigs: MemberTagConfig[] = [
  {
    id: 'TG01',
    name: '高价值客户',
    category: '人群价值',
    type: 'auto',
    conditions: [{ field: '累计消费金额', operator: '≥', value: '50000' }],
    updateFrequency: 'daily',
    coverage: 1_286,
    updatedAt: '2026-11-04 03:00',
    status: 'enabled',
  },
  {
    id: 'TG02',
    name: '高潜客户',
    category: '人群价值',
    type: 'auto',
    conditions: [{ field: '累计消费金额', operator: '≥', value: '10000' }],
    updateFrequency: 'daily',
    coverage: 5_432,
    updatedAt: '2026-11-04 03:00',
    status: 'enabled',
  },
  {
    id: 'TG03',
    name: '高频到店',
    category: '行为',
    type: 'auto',
    conditions: [{ field: '消费频次', operator: '≥', value: '60' }],
    updateFrequency: 'daily',
    coverage: 3_108,
    updatedAt: '2026-11-04 03:00',
    status: 'enabled',
  },
  {
    id: 'TG04',
    name: '沉默会员',
    category: '行为',
    type: 'auto',
    conditions: [{ field: '最近消费距今天数', operator: '≥', value: '30' }],
    updateFrequency: 'weekly',
    coverage: 12_470,
    updatedAt: '2026-11-03 03:00',
    status: 'enabled',
  },
  {
    id: 'TG05',
    name: '流失预警',
    category: '行为',
    type: 'auto',
    conditions: [{ field: '最近消费距今天数', operator: '≥', value: '60' }],
    updateFrequency: 'weekly',
    coverage: 6_215,
    updatedAt: '2026-11-03 03:00',
    status: 'enabled',
  },
  {
    id: 'TG06',
    name: '新客',
    category: '行为',
    type: 'auto',
    conditions: [{ field: '注册天数', operator: '≤', value: '30' }],
    updateFrequency: 'daily',
    coverage: 2_864,
    updatedAt: '2026-11-04 03:00',
    status: 'enabled',
  },
  {
    id: 'TG07',
    name: '生日本月',
    category: '人口属性',
    type: 'auto',
    conditions: [{ field: '生日月份', operator: '=', value: '当前月' }],
    updateFrequency: 'daily',
    coverage: 1_042,
    updatedAt: '2026-11-04 03:00',
    status: 'enabled',
  },
  {
    id: 'TG08',
    name: '价格敏感',
    category: '行为',
    type: 'auto',
    conditions: [{ field: '最近消费距今天数', operator: '≥', value: '7' }],
    updateFrequency: 'weekly',
    coverage: 9_640,
    updatedAt: '2026-11-03 03:00',
    status: 'disabled',
  },
  {
    id: 'TG09',
    name: '企业客户',
    category: '人群价值',
    type: 'manual',
    conditions: [],
    updateFrequency: 'manual',
    coverage: 316,
    updatedAt: '2026-10-28 14:22',
    status: 'enabled',
  },
  {
    id: 'TG10',
    name: '亲子客群',
    category: '人口属性',
    type: 'manual',
    conditions: [],
    updateFrequency: 'manual',
    coverage: 728,
    updatedAt: '2026-10-29 10:05',
    status: 'enabled',
  },
  {
    id: 'TG11',
    name: '学生党',
    category: '人口属性',
    type: 'manual',
    conditions: [],
    updateFrequency: 'manual',
    coverage: 1_905,
    updatedAt: '2026-10-30 09:41',
    status: 'enabled',
  },
  {
    id: 'TG12',
    name: '周末消费',
    category: '行为',
    type: 'auto',
    conditions: [{ field: '消费频次', operator: '≥', value: '20' }],
    updateFrequency: 'weekly',
    coverage: 4_382,
    updatedAt: '2026-11-03 03:00',
    status: 'disabled',
  },
];
