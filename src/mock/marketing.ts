import { stores } from './db';
import { mulberry32, pad, pick } from './util';

/**
 * 营销模块 Mock 数据（内存）。
 * 统一以 2026-11-04 09:00 作为“当前时间”，固定随机种子保证每次刷新数据一致，
 * 所有日期都落在 2026-09-01 ~ 2026-11-04 之间，不出现未来日期。
 */
export const MARKETING_NOW = new Date(2026, 10, 4, 9, 0);

/** 新建记录时展示的创建时间。 */
export const MARKETING_NOW_TEXT = '2026-11-04 09:30';

export type ActivityStatus = 'notStarted' | 'running' | 'ended' | 'disabled';
export type CouponTaskStatus = 'running' | 'ended' | 'paused';
export type MarketingChannel = 'sms' | 'wechat' | 'inbox';
export type NotifyMethod = 'template' | 'text' | 'rich';
export type TriggerType = 'scheduled' | 'event';
export type AutomationStatus = 'enabled' | 'paused';
export type NotificationScene = 'activityStart' | 'couponArrived' | 'orderStatus' | 'memberUpgrade';
export type NotificationStatus = 'enabled' | 'disabled';
export type MarketingActivityType = '满减活动' | '满折活动' | '发券活动';

export interface ReductionRule {
  /** 门槛金额（元） */
  threshold: number;
  /** 减免金额（元） */
  reduce: number;
}

export interface DiscountRule {
  /** 门槛金额（元） */
  threshold: number;
  /** 折扣，如 8.5 表示 8.5 折 */
  discount: number;
}

export interface FullReductionActivity {
  id: string;
  name: string;
  storeNames: string[];
  startAt: string;
  endAt: string;
  rules: ReductionRule[];
  status: ActivityStatus;
  createdAt: string;
}

export interface FullDiscountActivity {
  id: string;
  name: string;
  storeNames: string[];
  startAt: string;
  endAt: string;
  rules: DiscountRule[];
  status: ActivityStatus;
  createdAt: string;
}

export interface CouponTask {
  id: string;
  name: string;
  couponName: string;
  audiences: string[];
  planned: number;
  claimed: number;
  validFrom: string;
  validTo: string;
  status: CouponTaskStatus;
  createdAt: string;
}

export interface MarketingActivityOption {
  value: string;
  label: string;
  activityType: MarketingActivityType;
}

export interface AutomationPlan {
  id: string;
  name: string;
  activityId: string;
  activityName: string;
  activityType: MarketingActivityType;
  audiences: string[];
  triggerType: TriggerType;
  triggerRule: string;
  channels: MarketingChannel[];
  notifyMethod: NotifyMethod;
  status: AutomationStatus;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  scene: NotificationScene;
  channel: MarketingChannel;
  notifyMethod: NotifyMethod;
  content: string;
  summary: string;
  sendCount: number;
  status: NotificationStatus;
  updatedAt: string;
}

export const activityStatusMeta: Record<ActivityStatus, { label: string; color: string }> = {
  notStarted: { label: '未开始', color: 'blue' },
  running: { label: '进行中', color: 'green' },
  ended: { label: '已结束', color: 'default' },
  disabled: { label: '已停用', color: 'red' },
};

export const couponStatusMeta: Record<CouponTaskStatus, { label: string; color: string }> = {
  running: { label: '进行中', color: 'green' },
  ended: { label: '已结束', color: 'default' },
  paused: { label: '已暂停', color: 'orange' },
};

export const marketingChannelMeta: Record<MarketingChannel, { label: string; color: string }> = {
  sms: { label: '短信', color: 'blue' },
  wechat: { label: '微信', color: 'green' },
  inbox: { label: '站内信', color: 'purple' },
};

export const notifyMethodMeta: Record<NotifyMethod, { label: string; color: string }> = {
  template: { label: '模板消息', color: 'blue' },
  text: { label: '文本消息', color: 'default' },
  rich: { label: '图文卡片', color: 'purple' },
};

export const triggerTypeMeta: Record<TriggerType, { label: string; color: string }> = {
  scheduled: { label: '定时', color: 'gold' },
  event: { label: '事件', color: 'cyan' },
};

export const automationStatusMeta: Record<AutomationStatus, { label: string; color: string }> = {
  enabled: { label: '启用中', color: 'green' },
  paused: { label: '已暂停', color: 'default' },
};

export const notificationSceneMeta: Record<NotificationScene, { label: string; color: string }> = {
  activityStart: { label: '活动开始', color: 'volcano' },
  couponArrived: { label: '发券到账', color: 'green' },
  orderStatus: { label: '订单状态', color: 'blue' },
  memberUpgrade: { label: '会员升级', color: 'gold' },
};

export const notificationStatusMeta: Record<NotificationStatus, { label: string; color: string }> = {
  enabled: { label: '启用', color: 'green' },
  disabled: { label: '停用', color: 'default' },
};

/** 适用门店下拉 / 展示统一取自门店 Mock，保证与业务模块一致。 */
export const marketingStoreNames: string[] = stores.map((store) => store.name);

export const marketingAudienceTags: string[] = [
  '全部会员',
  '新客',
  '高频到店',
  '沉默会员',
  '价格敏感',
  '外卖偏好',
  '周末消费',
  '生日本月',
  '亲子客群',
  '学生客群',
  '企业客户',
  '金卡会员',
];

const couponNamePool = [
  '新客立减 10 元券',
  '满 50 减 8 元券',
  '满 100 减 20 元券',
  '会员专享 9 折券',
  '生日 5 元券',
  '下午茶 8 折券',
  '外卖免配送券',
  '工作日午餐券',
  '第二份半价券',
  '满 200 减 50 元券',
  '积分翻倍券',
  '指定菜品券',
];

export const couponOptions: Array<{ label: string; value: string }> = couponNamePool.map((label) => ({
  label,
  value: label,
}));

/** 日期文案：以 2026-11-04 为基准往前推 daysAgo 天，保证不出现未来日期。 */
function dateTimeText(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date(MARKETING_NOW);
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(hour)}:${pad(minute)}`;
}

function dateText(daysAgo: number): string {
  return dateTimeText(daysAgo, 0).slice(0, 10);
}

/** 根据时间窗口与停用标记推导活动状态（启用 / 停用按钮复用同一套规则）。 */
export function resolveActivityStatus(
  startAt: string,
  endAt: string,
  disabled = false,
): ActivityStatus {
  if (disabled) return 'disabled';
  const now = MARKETING_NOW.getTime();
  const start = new Date(startAt.replace(' ', 'T')).getTime();
  const end = new Date(endAt.replace(' ', 'T')).getTime();
  if (now < start) return 'notStarted';
  if (now > end) return 'ended';
  return 'running';
}

/** 从候选池里无重复抽取 count 个元素（固定种子驱动，结果可复现）。 */
function pickMany<T>(source: readonly T[], count: number, rng: () => number): T[] {
  const pool = [...source];
  const picked: T[] = [];
  const target = Math.min(count, pool.length);
  while (picked.length < target) {
    picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return picked;
}

function storeSelection(rng: () => number): string[] {
  if (rng() < 0.2) return [...marketingStoreNames];
  return pickMany(marketingStoreNames, 1 + Math.floor(rng() * 3), rng);
}

interface ActivityWindow {
  startAt: string;
  endAt: string;
  startDaysAgo: number;
}

/**
 * 按目标状态生成活动时间窗口：
 * - 已结束：结束于过去，开始更早；
 * - 未开始：今日晚些时候开始（仍是 2026-11-04，不出现未来日期）；
 * - 进行中 / 已停用：开始于过去，截止到今天。
 */
function buildWindow(status: ActivityStatus, rng: () => number): ActivityWindow {
  if (status === 'ended') {
    const endDaysAgo = 3 + Math.floor(rng() * 25);
    const duration = 5 + Math.floor(rng() * 25);
    const startDaysAgo = endDaysAgo + duration;
    return {
      startAt: dateTimeText(startDaysAgo, 0),
      endAt: dateTimeText(endDaysAgo, 23, 59),
      startDaysAgo,
    };
  }
  if (status === 'notStarted') {
    const startHour = 14 + Math.floor(rng() * 6);
    return {
      startAt: dateTimeText(0, startHour),
      endAt: dateTimeText(0, 23, 59),
      startDaysAgo: 0,
    };
  }
  const startDaysAgo = 4 + Math.floor(rng() * 50);
  return {
    startAt: dateTimeText(startDaysAgo, 0),
    endAt: dateTimeText(0, 23, 59),
    startDaysAgo,
  };
}

function createdBefore(startDaysAgo: number, rng: () => number): string {
  const daysAgo = Math.min(64, startDaysAgo + 1 + Math.floor(rng() * 10));
  return dateTimeText(daysAgo, 9 + Math.floor(rng() * 9), Math.floor(rng() * 60));
}

const reductionThresholds = [99, 129, 159, 199, 259, 299, 399, 499];

function buildReductionRules(rng: () => number): ReductionRule[] {
  const count = 2 + (rng() > 0.55 ? 1 : 0);
  return pickMany(reductionThresholds, count, rng)
    .sort((a, b) => a - b)
    .map((threshold) => ({
      threshold,
      reduce: Math.max(5, Math.round((threshold * (0.08 + rng() * 0.14)) / 5) * 5),
    }));
}

const discountThresholds = [99, 199, 299, 499, 699, 999];
const discountValues = [9.5, 9, 8.8, 8.5, 8, 7.5];

function buildDiscountRules(rng: () => number): DiscountRule[] {
  const count = 2 + (rng() > 0.5 ? 1 : 0);
  return pickMany(discountThresholds, count, rng)
    .sort((a, b) => a - b)
    .map((threshold, index) => ({
      threshold,
      discount: discountValues[Math.min(discountValues.length - 1, index + Math.floor(rng() * 2))],
    }));
}

const reductionNamePool = [
  '国庆满减狂欢',
  '周末满减日',
  '老客回馈满减',
  '新店开业满减',
  '会员日满减',
  '双十一预热满减',
  '秋季暖食满减',
  '午餐时段满减',
  '晚市满减',
  '堂食满减',
  '自提满减',
  '家庭套餐满减',
  '情侣套餐满减',
  '学生党满减',
  '充值回馈满减',
  '周三会员满减',
  '感恩回馈满减',
  '暖冬满减',
  '麻辣季满减',
  '烧烤季满减',
  '夜宵满减',
  '下午茶满减',
  '周年庆满减',
  '节日限定满减',
];

const reductionStatusPlan: ActivityStatus[] = [
  'running',
  'running',
  'ended',
  'running',
  'notStarted',
  'running',
  'ended',
  'disabled',
  'running',
  'ended',
  'running',
  'notStarted',
  'ended',
  'running',
  'disabled',
  'running',
  'ended',
  'running',
  'notStarted',
  'ended',
  'running',
  'disabled',
  'running',
  'ended',
];

const reductionRng = mulberry32(20260901);

/** 满减活动：24 条，覆盖未开始 / 进行中 / 已结束 / 已停用。 */
export const fullReductionActivities: FullReductionActivity[] = Array.from(
  { length: 24 },
  (_, index) => {
    const status = reductionStatusPlan[index];
    const window = buildWindow(status, reductionRng);
    return {
      id: `FR${String(index + 1).padStart(3, '0')}`,
      name: reductionNamePool[index],
      storeNames: storeSelection(reductionRng),
      startAt: window.startAt,
      endAt: window.endAt,
      rules: buildReductionRules(reductionRng),
      status,
      createdAt: createdBefore(window.startDaysAgo, reductionRng),
    };
  },
);

const discountNamePool = [
  '中秋满折特惠',
  '国庆满折',
  '会员满折日',
  '周末双倍满折',
  '老客满折回馈',
  '新店满折开业',
  '秋季满折季',
  '午餐满折',
  '晚市满折',
  '堂食满折',
  '自提满折',
  '家庭满折',
  '亲子满折',
  '学生满折',
  '白领满折',
  '暖冬满折',
  '麻辣季满折',
  '夜宵满折',
  '下午茶满折',
  '周年庆满折',
];

const discountStatusPlan: ActivityStatus[] = [
  'running',
  'ended',
  'running',
  'notStarted',
  'running',
  'disabled',
  'ended',
  'running',
  'running',
  'notStarted',
  'ended',
  'running',
  'disabled',
  'running',
  'ended',
  'running',
  'notStarted',
  'ended',
  'disabled',
  'running',
];

const discountRng = mulberry32(20260902);

/** 满折活动：20 条。 */
export const fullDiscountActivities: FullDiscountActivity[] = Array.from(
  { length: 20 },
  (_, index) => {
    const status = discountStatusPlan[index];
    const window = buildWindow(status, discountRng);
    return {
      id: `FD${String(index + 1).padStart(3, '0')}`,
      name: discountNamePool[index],
      storeNames: storeSelection(discountRng),
      startAt: window.startAt,
      endAt: window.endAt,
      rules: buildDiscountRules(discountRng),
      status,
      createdAt: createdBefore(window.startDaysAgo, discountRng),
    };
  },
);

const couponTaskNamePool = [
  '双十一新客拉新',
  '会员生日关怀',
  '沉默会员唤醒',
  '周末到店激励',
  '外卖渠道拉新',
  '老客复购券',
  '国庆发券活动',
  '双十一预热发券',
  '新店开业发券',
  '会员日发券',
  '早餐时段发券',
  '下午茶发券',
  '夜宵时段发券',
  '亲子客群发券',
  '学生客群发券',
  '企业客户发券',
  '充值赠送券',
  '积分兑换券',
  '社群专属券',
  '短信渠道发券',
];

const couponStatusPlan: CouponTaskStatus[] = [
  'running',
  'ended',
  'running',
  'paused',
  'running',
  'ended',
  'running',
  'paused',
  'ended',
  'running',
  'running',
  'ended',
  'paused',
  'running',
  'ended',
  'running',
  'paused',
  'running',
  'ended',
  'running',
];

const couponRng = mulberry32(20260903);

/** 发券任务：20 条。 */
export const couponTasks: CouponTask[] = Array.from({ length: 20 }, (_, index) => {
  const status = couponStatusPlan[index];
  const planned = (2 + Math.floor(couponRng() * 18)) * 1000;
  const claimedRate =
    status === 'ended' ? 0.55 + couponRng() * 0.4 : 0.15 + couponRng() * 0.7;
  const claimed = Math.min(planned, Math.round(planned * claimedRate));

  // 有效期：进行中 / 已暂停的券今天到期，已结束的券在近期失效；
  // 任务创建时间早于券生效时间，保证数据前后自洽。
  const ended = status === 'ended';
  const validToDaysAgo = ended ? 3 + Math.floor(couponRng() * 12) : 0;
  const validFromDaysAgo = validToDaysAgo + 5 + Math.floor(couponRng() * 25);
  const createdDaysAgo = Math.min(64, validFromDaysAgo + 1 + Math.floor(couponRng() * 10));

  return {
    id: `CP${String(index + 1).padStart(3, '0')}`,
    name: couponTaskNamePool[index],
    couponName: pick(couponRng, couponNamePool),
    audiences: pickMany(marketingAudienceTags, 1 + Math.floor(couponRng() * 3), couponRng),
    planned,
    claimed,
    validFrom: dateText(validFromDaysAgo),
    validTo: dateText(validToDaysAgo),
    status,
    createdAt: dateTimeText(
      createdDaysAgo,
      9 + Math.floor(couponRng() * 9),
      Math.floor(couponRng() * 60),
    ),
  };
});

/** 自动化营销可选关联活动：来自满减 / 满折 / 发券的 Mock 数据。 */
export const marketingActivityOptions: MarketingActivityOption[] = [
  ...fullReductionActivities.map((item) => ({
    value: item.id,
    label: item.name,
    activityType: '满减活动' as const,
  })),
  ...fullDiscountActivities.map((item) => ({
    value: item.id,
    label: item.name,
    activityType: '满折活动' as const,
  })),
  ...couponTasks.map((item) => ({
    value: item.id,
    label: item.name,
    activityType: '发券活动' as const,
  })),
];

const scheduledRules = [
  '每天 10:00',
  '每天 18:00',
  '每周一 09:00',
  '每周五 17:30',
  '每月 1 日 10:00',
  '每月 15 日 12:00',
];

const eventRules = [
  '用户完成订单后 30 分钟',
  '用户注册后 1 小时',
  '会员升级时立即触发',
  '券到账后 10 分钟',
  '连续 30 天未到店时',
];

const channelPool: MarketingChannel[] = ['sms', 'wechat', 'inbox'];
const notifyMethodPool: NotifyMethod[] = ['template', 'text', 'rich'];

const automationNamePool = [
  '新客 24 小时欢迎计划',
  '订单完成回访',
  '会员生日关怀',
  '沉默会员唤醒',
  '周末到店提醒',
  '发券到账提醒',
  '积分到期提醒',
  '会员升级礼遇',
  '外卖复购激励',
  '午市套餐推荐',
  '晚市时段推送',
  '双十一预热计划',
  '国庆活动通知',
  '新店开业通知',
  '充值活动通知',
  '企业客户回馈',
  '亲子客群推荐',
  '学生客群优惠',
  '金卡会员专属',
  '周年庆回馈计划',
];

const automationRng = mulberry32(20260904);

/** 自动化营销计划：20 条。 */
export const automationPlans: AutomationPlan[] = Array.from({ length: 20 }, (_, index) => {
  const activity = pick(automationRng, marketingActivityOptions);
  const triggerType: TriggerType = automationRng() > 0.5 ? 'scheduled' : 'event';
  const channels = pickMany(channelPool, 1 + (automationRng() > 0.45 ? 1 : 0), automationRng).sort(
    (a, b) => channelPool.indexOf(a) - channelPool.indexOf(b),
  );
  return {
    id: `AT${String(index + 1).padStart(3, '0')}`,
    name: automationNamePool[index],
    activityId: activity.value,
    activityName: activity.label,
    activityType: activity.activityType,
    audiences: pickMany(marketingAudienceTags, 1 + Math.floor(automationRng() * 3), automationRng),
    triggerType,
    triggerRule: pick(
      automationRng,
      triggerType === 'scheduled' ? scheduledRules : eventRules,
    ),
    channels,
    notifyMethod: pick(automationRng, notifyMethodPool),
    status: automationRng() > 0.3 ? 'enabled' : 'paused',
    createdAt: dateTimeText(
      1 + Math.floor(automationRng() * 50),
      9 + Math.floor(automationRng() * 9),
      Math.floor(automationRng() * 60),
    ),
  };
});

const notificationSeed: Array<[string, NotificationScene]> = [
  ['活动开始提醒', 'activityStart'],
  ['活动即将结束提醒', 'activityStart'],
  ['新券到账通知', 'couponArrived'],
  ['优惠券到期提醒', 'couponArrived'],
  ['订单支付成功通知', 'orderStatus'],
  ['订单出餐完成通知', 'orderStatus'],
  ['订单退款通知', 'orderStatus'],
  ['会员升级通知', 'memberUpgrade'],
  ['生日祝福通知', 'memberUpgrade'],
  ['积分到账通知', 'memberUpgrade'],
  ['积分即将过期提醒', 'memberUpgrade'],
  ['储值成功通知', 'memberUpgrade'],
  ['余额不足提醒', 'orderStatus'],
  ['排队叫号提醒', 'orderStatus'],
  ['外卖配送通知', 'orderStatus'],
  ['活动报名成功通知', 'activityStart'],
  ['券包到账通知', 'couponArrived'],
  ['会员权益变更通知', 'memberUpgrade'],
  ['签到成功提醒', 'memberUpgrade'],
  ['邀请好友奖励通知', 'memberUpgrade'],
  ['评价邀请通知', 'orderStatus'],
  ['活动中奖通知', 'activityStart'],
];

const notificationContentPool: Record<NotificationScene, string[]> = {
  activityStart: [
    '尊敬的{会员昵称}，您关注的「{活动名称}」将在 {开始时间} 开始，满 100 减 20，限时 3 天，欢迎到店品尝～',
    '【比萨斯】「{活动名称}」已开启！全场满 200 减 50，会员额外赠甜品券，活动截止 {结束时间}，快来参与吧。',
    '您好，{活动名称} 报名成功，活动期间到店消费满 129 元即可享受满减，详情可咨询门店服务员。',
  ],
  couponArrived: [
    '【比萨斯】您有一张「{券名称}」已到账，有效期至 {失效时间}，可在门店消费时出示核销，逾期作废。',
    '亲爱的{会员昵称}，{券名称} 已放入您的卡券包，消费满 100 元即可使用，本券不与其他优惠同享。',
    '【券到账提醒】「{券名称}」已发放至您的账户，请在 {失效时间} 前使用，过期不补。',
  ],
  orderStatus: [
    '【比萨斯】您的订单 {订单号} 已支付成功，厨房正在准备，预计 20 分钟内出餐，请耐心等待。',
    '您的订单 {订单号} 已出餐完成，请凭取餐号 {取餐号} 到取餐台领取，祝您用餐愉快！',
    '订单 {订单号} 退款申请已受理，退款将在 1-3 个工作日内原路退回，请注意查收。',
  ],
  memberUpgrade: [
    '恭喜您升级为 {会员等级}！专属折扣、生日礼遇等权益已生效，感谢您对 {门店名称} 的支持。',
    '亲爱的{会员昵称}，生日月专属礼遇已送达：生日当天到店消费享 8 折，并赠长寿面一份。',
    '【积分提醒】您有 {积分数} 积分即将于 {过期时间} 过期，快来积分商城兑换心仪好礼吧。',
  ],
};

const notificationRng = mulberry32(20260905);

/** 消息通知模板：22 条，覆盖 4 类场景与 3 个渠道。 */
export const notificationTemplates: NotificationTemplate[] = notificationSeed.map(
  ([name, scene], index) => {
    const content = pick(notificationRng, notificationContentPool[scene]);
    return {
      id: `NT${String(index + 1).padStart(3, '0')}`,
      name,
      scene,
      channel: pick(notificationRng, channelPool),
      notifyMethod: pick(notificationRng, notifyMethodPool),
      content,
      summary: content.length > 34 ? `${content.slice(0, 34)}…` : content,
      sendCount: 800 + Math.floor(notificationRng() * 120_000),
      status: notificationRng() > 0.25 ? 'enabled' : 'disabled',
      updatedAt: dateTimeText(
        Math.floor(notificationRng() * 30),
        9 + Math.floor(notificationRng() * 9),
        Math.floor(notificationRng() * 60),
      ),
    };
  },
);
