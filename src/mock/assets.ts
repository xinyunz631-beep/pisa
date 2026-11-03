import { mulberry32, pad, pick } from './util';

/**
 * 资产模块 Mock 数据（卡券 / 积分 / 券包）。
 * 数据全部由固定种子生成，刷新后保持一致；日期范围 2026-09-01 ~ 2026-11-04，不出现未来时间。
 */

/** 演示用“今天”，与 mock/db.ts 的 TODAY 保持一致。 */
export const MOCK_TODAY = '2026-11-04';
/** 演示用“当前时间”，用于新增 / 编辑后的更新时间。 */
export const MOCK_NOW = '2026-11-04 18:30';

const rng = mulberry32(20260901);

function dateFrom(base: string, offsetDays: number): string {
  const [year, month, day] = base.split('-').map(Number);
  const d = new Date(year, month - 1, day + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function clampDate(value: string, max: string): string {
  return value > max ? max : value;
}

function dateTime(day: string, hour: number, minute: number): string {
  return `${day} ${pad(hour)}:${pad(minute)}`;
}

/* ------------------------------------------------------------------ */
/* 卡券                                                                */
/* ------------------------------------------------------------------ */

export type CouponType = 'cash' | 'discount' | 'exchange';
export type AssetStatus = 'active' | 'ended' | 'disabled';

export interface Coupon {
  id: string;
  name: string;
  type: CouponType;
  /** 代金券 / 兑换券为面额（元），折扣券为折扣（8.8 表示 8.8 折）。 */
  value: number;
  /** 使用门槛（元），0 表示无门槛。 */
  threshold: number;
  validFrom: string;
  validTo: string;
  total: number;
  claimed: number;
  used: number;
  status: AssetStatus;
}

/** [券名称, 券类型, 面额/折扣, 使用门槛, 状态] */
const couponSeed: Array<[string, CouponType, number, number, AssetStatus]> = [
  ['新客立减券', 'cash', 10, 30, 'active'],
  ['满 100 减 20 券', 'cash', 20, 100, 'active'],
  ['满 200 减 50 券', 'cash', 50, 200, 'active'],
  ['周末堂食 9 折券', 'discount', 9, 80, 'active'],
  ['会员日 8.5 折券', 'discount', 8.5, 100, 'active'],
  ['双人套餐 8 折券', 'discount', 8, 150, 'active'],
  ['招牌酸菜鱼兑换券', 'exchange', 78, 0, 'active'],
  ['杨枝甘露兑换券', 'exchange', 26, 0, 'active'],
  ['满 50 减 8 券', 'cash', 8, 50, 'active'],
  ['下午茶 8.8 折券', 'discount', 8.8, 60, 'active'],
  ['冰粉兑换券', 'exchange', 12, 0, 'active'],
  ['午餐减 15 券', 'cash', 15, 68, 'active'],
  ['学生专享 9.5 折券', 'discount', 9.5, 50, 'disabled'],
  ['生日月 8 折券', 'discount', 8, 0, 'active'],
  ['夜宵满 120 减 30 券', 'cash', 30, 120, 'ended'],
  ['国庆欢聚 7.8 折券', 'discount', 7.8, 200, 'ended'],
  ['中秋月饼兑换券', 'exchange', 88, 0, 'ended'],
  ['咖啡第二杯半价券', 'discount', 5, 30, 'ended'],
  ['外卖满 60 减 12 券', 'cash', 12, 60, 'ended'],
  ['亲子套餐 8.5 折券', 'discount', 8.5, 180, 'ended'],
  ['老客回馈 20 元券', 'cash', 20, 100, 'disabled'],
  ['会员专属 9 折券', 'discount', 9, 0, 'disabled'],
  ['招牌毛血旺兑换券', 'exchange', 72, 0, 'disabled'],
  ['周年庆满 300 减 80 券', 'cash', 80, 300, 'active'],
];

const totalPool = [500, 800, 1000, 1500, 2000, 3000, 5000, 8000];
const validFromPool = [
  '2026-09-01',
  '2026-09-08',
  '2026-09-15',
  '2026-09-22',
  '2026-10-01',
  '2026-10-10',
  '2026-10-18',
];

export const coupons: Coupon[] = couponSeed.map(
  ([name, type, value, threshold, status], index) => {
    const total = pick(rng, totalPool);
    const claimedRate =
      status === 'ended'
        ? 0.65 + rng() * 0.3
        : status === 'disabled'
          ? 0.2 + rng() * 0.3
          : 0.35 + rng() * 0.5;
    const claimed = Math.min(total, Math.round(total * claimedRate));
    const usedRate = status === 'ended' ? 0.55 + rng() * 0.35 : 0.25 + rng() * 0.45;
    const used = Math.min(claimed, Math.round(claimed * usedRate));
    const validFrom = pick(rng, validFromPool);
    const validTo =
      status === 'ended'
        ? clampDate(dateFrom(validFrom, 25 + Math.floor(rng() * 25)), '2026-10-31')
        : status === 'disabled'
          ? '2026-10-31'
          : MOCK_TODAY;

    return {
      id: `CP${String(index + 1).padStart(3, '0')}`,
      name,
      type,
      value,
      threshold,
      validFrom,
      validTo,
      total,
      claimed,
      used,
      status,
    };
  },
);

/* ------------------------------------------------------------------ */
/* 积分                                                                */
/* ------------------------------------------------------------------ */

export type PointScene = 'consume' | 'review' | 'checkin' | 'register';

export interface PointRule {
  id: string;
  name: string;
  scene: PointScene;
  points: number;
  enabled: boolean;
  updatedAt: string;
}

/** [规则名称, 触发场景, 积分值, 是否启用, 更新时间] */
const pointRuleSeed: Array<[string, PointScene, number, boolean, string]> = [
  ['消费 1 元得 1 积分', 'consume', 1, true, '2026-11-02 10:20'],
  ['消费满 50 元额外奖励', 'consume', 20, true, '2026-10-28 14:05'],
  ['首次注册奖励', 'register', 100, true, '2026-09-10 09:30'],
  ['完善个人资料奖励', 'register', 30, false, '2026-09-18 16:42'],
  ['每日签到', 'checkin', 5, true, '2026-11-03 08:15'],
  ['连续签到 7 天额外奖励', 'checkin', 50, true, '2026-10-30 11:40'],
  ['完成订单评价', 'review', 10, true, '2026-11-01 13:25'],
  ['带图评价额外奖励', 'review', 20, true, '2026-10-22 17:10'],
  ['生日当月消费积分翻倍', 'consume', 2, false, '2026-09-25 10:05'],
  ['老客回归签到奖励', 'checkin', 30, false, '2026-10-08 15:55'],
];

export const pointRules: PointRule[] = pointRuleSeed.map(
  ([name, scene, points, enabled, updatedAt], index) => ({
    id: `PR${String(index + 1).padStart(3, '0')}`,
    name,
    scene,
    points,
    enabled,
    updatedAt,
  }),
);

export type PointRecordType = 'earn' | 'spend' | 'expire';

export interface PointRecord {
  id: string;
  nickname: string;
  type: PointRecordType;
  points: number;
  createdAt: string;
  remark: string;
}

const nicknames = [
  '小鹿',
  '吃遍街巷',
  '阿茶',
  '周末不加班',
  '锅气爱好者',
  '一碗小面',
  '南山食客',
  '甜辣控',
  '老饕张',
  '轻食主义',
  '打工人小李',
  '深夜食堂',
  '橙子汽水',
  '麻辣人生',
  '粥粥',
  '西柚',
  '早八人',
  '烤肉自由',
  '干饭第一名',
  '小笼包',
];

const earnRemarks = [
  '消费订单获得',
  '完成订单评价获得',
  '每日签到获得',
  '首次注册奖励',
  '消费满额奖励',
  '生日月双倍积分',
];
const spendRemarks = [
  '积分抵扣订单金额',
  '兑换招牌酸菜鱼兑换券',
  '兑换杨枝甘露兑换券',
  '兑换冰粉兑换券',
  '积分商城兑换周边',
];
const expireRemarks = ['上月批次积分到期清零', '2026 年 9 月批次积分过期'];

const recordTypePool: PointRecordType[] = [
  'earn',
  'earn',
  'earn',
  'earn',
  'earn',
  'earn',
  'spend',
  'spend',
  'spend',
  'expire',
];

export const pointRecords: PointRecord[] = Array.from({ length: 40 }, (_, index) => {
  const type = pick(rng, recordTypePool);
  const points =
    type === 'earn'
      ? 50 + Math.floor(rng() * 350)
      : type === 'spend'
        ? 30 + Math.floor(rng() * 170)
        : 10 + Math.floor(rng() * 90);
  const day = dateFrom('2026-09-01', Math.floor(rng() * 64));
  const createdAt = dateTime(day, 8 + Math.floor(rng() * 13), Math.floor(rng() * 60));
  const remark =
    type === 'earn'
      ? pick(rng, earnRemarks)
      : type === 'spend'
        ? pick(rng, spendRemarks)
        : pick(rng, expireRemarks);

  return {
    id: `PT${String(index + 1).padStart(4, '0')}`,
    nickname: pick(rng, nicknames),
    type,
    points,
    createdAt,
    remark,
  };
}).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

/* ------------------------------------------------------------------ */
/* 券包                                                                */
/* ------------------------------------------------------------------ */

export interface CouponPackage {
  id: string;
  name: string;
  couponIds: string[];
  validFrom: string;
  validTo: string;
  total: number;
  claimed: number;
  status: AssetStatus;
  updatedAt: string;
}

/** [券包名称, 状态] */
const packageSeed: Array<[string, AssetStatus]> = [
  ['新客礼包', 'active'],
  ['周末畅吃券包', 'active'],
  ['会员日专享包', 'active'],
  ['早餐组合包', 'active'],
  ['节日双人餐券包', 'active'],
  ['甜品控福利包', 'active'],
  ['外卖满减包', 'active'],
  ['生日礼遇包', 'active'],
  ['学生党省钱包', 'ended'],
  ['亲子家庭套餐包', 'active'],
  ['夜宵专场包', 'ended'],
  ['咖啡下午茶包', 'active'],
  ['火锅爱好者包', 'disabled'],
  ['轻食健康包', 'disabled'],
  ['国庆欢聚包', 'ended'],
  ['中秋团圆包', 'ended'],
  ['门店专享包', 'active'],
  ['老客回馈包', 'disabled'],
];

const activeCouponIds = coupons.filter((coupon) => coupon.status === 'active').map((c) => c.id);

/** 从可用卡券中不重复抽取若干张，保证券包内不会出现重复券。 */
function pickCouponIds(count: number): string[] {
  const pool = [...activeCouponIds];
  const chosen: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return chosen;
}

const packageValidFromPool = [
  '2026-09-01',
  '2026-09-10',
  '2026-09-20',
  '2026-10-01',
  '2026-10-12',
];
const updatedDayPool = [
  '2026-09-08',
  '2026-09-19',
  '2026-10-05',
  '2026-10-16',
  '2026-10-27',
  '2026-11-02',
];

export const couponPackages: CouponPackage[] = packageSeed.map(([name, status], index) => {
  const total = pick(rng, [200, 500, 800, 1000, 1500, 2000, 3000]);
  const claimedRate =
    status === 'ended'
      ? 0.6 + rng() * 0.3
      : status === 'disabled'
        ? 0.15 + rng() * 0.3
        : 0.3 + rng() * 0.55;
  const claimed = Math.min(total, Math.round(total * claimedRate));
  const validFrom = pick(rng, packageValidFromPool);
  const validTo =
    status === 'ended'
      ? clampDate(dateFrom(validFrom, 30), '2026-10-31')
      : status === 'disabled'
        ? '2026-10-31'
        : MOCK_TODAY;
  const updatedAt = dateTime(
    pick(rng, updatedDayPool),
    9 + Math.floor(rng() * 10),
    Math.floor(rng() * 60),
  );

  return {
    id: `PG${String(index + 1).padStart(3, '0')}`,
    name,
    couponIds: pickCouponIds(2 + Math.floor(rng() * 3)),
    validFrom,
    validTo,
    total,
    claimed,
    status,
    updatedAt,
  };
});
