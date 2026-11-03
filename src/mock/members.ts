import type { Member, MemberStatus } from '../types';
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
