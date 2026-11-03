import {
  MARKETING_NOW_TEXT,
  automationPlans,
  couponOptions,
  couponTasks,
  fullDiscountActivities,
  fullReductionActivities,
  marketingActivityOptions,
  marketingAudienceTags,
  marketingStoreNames,
  notificationTemplates,
  resolveActivityStatus,
} from '../mock/marketing';
import type {
  ActivityStatus,
  AutomationPlan,
  AutomationStatus,
  CouponTask,
  CouponTaskStatus,
  DiscountRule,
  FullDiscountActivity,
  FullReductionActivity,
  MarketingActivityOption,
  MarketingChannel,
  NotificationScene,
  NotificationStatus,
  NotificationTemplate,
  NotifyMethod,
  ReductionRule,
  TriggerType,
} from '../mock/marketing';
import { paginate, sleep } from '../mock/util';
import type { Paged } from '../types';

export type {
  ActivityStatus,
  AutomationPlan,
  AutomationStatus,
  CouponTask,
  CouponTaskStatus,
  DiscountRule,
  FullDiscountActivity,
  FullReductionActivity,
  MarketingActivityOption,
  MarketingActivityType,
  MarketingChannel,
  NotificationScene,
  NotificationStatus,
  NotificationTemplate,
  NotifyMethod,
  ReductionRule,
  TriggerType,
} from '../mock/marketing';

export {
  activityStatusMeta,
  automationStatusMeta,
  couponStatusMeta,
  marketingChannelMeta,
  notificationSceneMeta,
  notificationStatusMeta,
  notifyMethodMeta,
  triggerTypeMeta,
} from '../mock/marketing';

/** 全部门店数量：活动适用门店等于该数量时展示「全部门店」。 */
export const ALL_STORES_COUNT = marketingStoreNames.length;

function nextId(prefix: string, list: Array<{ id: string }>): string {
  const max = list.reduce((acc, item) => {
    const value = Number(item.id.slice(prefix.length));
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

// ---------------------------------------------------------------- 满减活动

export interface ActivityQuery {
  keyword?: string;
  status?: ActivityStatus | 'all';
  /** 活动时间范围（YYYY-MM-DD），与活动窗口有交集即命中 */
  range?: [string, string];
  page?: number;
  pageSize?: number;
}

function matchesActivity(
  activity: { name: string; status: ActivityStatus; startAt: string; endAt: string },
  query: ActivityQuery,
): boolean {
  const keyword = query.keyword?.trim();
  if (keyword && !activity.name.includes(keyword)) return false;
  const status = query.status ?? 'all';
  if (status !== 'all' && activity.status !== status) return false;
  const [rangeStart, rangeEnd] = query.range ?? [];
  if (rangeStart && rangeEnd) {
    if (activity.endAt.slice(0, 10) < rangeStart) return false;
    if (activity.startAt.slice(0, 10) > rangeEnd) return false;
  }
  return true;
}

export async function fetchFullReductions(
  query: ActivityQuery = {},
): Promise<Paged<FullReductionActivity>> {
  await sleep(280);
  const { page = 1, pageSize = 10 } = query;
  const filtered = fullReductionActivities.filter((item) => matchesActivity(item, query));
  return paginate(filtered, page, pageSize);
}

export interface ReductionInput {
  id?: string;
  name: string;
  storeNames: string[];
  startAt: string;
  endAt: string;
  rules: ReductionRule[];
  status: ActivityStatus;
}

export async function saveFullReduction(input: ReductionInput): Promise<FullReductionActivity> {
  await sleep(320);

  if (input.id) {
    const target = fullReductionActivities.find((item) => item.id === input.id);
    if (!target) throw new Error('满减活动不存在');
    target.name = input.name;
    target.storeNames = input.storeNames;
    target.startAt = input.startAt;
    target.endAt = input.endAt;
    target.rules = input.rules;
    target.status = input.status;
    return { ...target };
  }

  const activity: FullReductionActivity = {
    id: nextId('FR', fullReductionActivities),
    name: input.name,
    storeNames: input.storeNames,
    startAt: input.startAt,
    endAt: input.endAt,
    rules: input.rules,
    status: input.status,
    createdAt: MARKETING_NOW_TEXT,
  };
  fullReductionActivities.unshift(activity);
  return { ...activity };
}

export async function updateFullReductionStatus(id: string, enabled: boolean): Promise<void> {
  await sleep(240);
  const target = fullReductionActivities.find((item) => item.id === id);
  if (!target) return;
  target.status = enabled ? resolveActivityStatus(target.startAt, target.endAt) : 'disabled';
}

export async function removeFullReduction(id: string): Promise<void> {
  await sleep(220);
  const index = fullReductionActivities.findIndex((item) => item.id === id);
  if (index >= 0) fullReductionActivities.splice(index, 1);
}

// ---------------------------------------------------------------- 满折活动

export async function fetchFullDiscounts(
  query: ActivityQuery = {},
): Promise<Paged<FullDiscountActivity>> {
  await sleep(280);
  const { page = 1, pageSize = 10 } = query;
  const filtered = fullDiscountActivities.filter((item) => matchesActivity(item, query));
  return paginate(filtered, page, pageSize);
}

export interface DiscountInput {
  id?: string;
  name: string;
  storeNames: string[];
  startAt: string;
  endAt: string;
  rules: DiscountRule[];
  status: ActivityStatus;
}

export async function saveFullDiscount(input: DiscountInput): Promise<FullDiscountActivity> {
  await sleep(320);

  if (input.id) {
    const target = fullDiscountActivities.find((item) => item.id === input.id);
    if (!target) throw new Error('满折活动不存在');
    target.name = input.name;
    target.storeNames = input.storeNames;
    target.startAt = input.startAt;
    target.endAt = input.endAt;
    target.rules = input.rules;
    target.status = input.status;
    return { ...target };
  }

  const activity: FullDiscountActivity = {
    id: nextId('FD', fullDiscountActivities),
    name: input.name,
    storeNames: input.storeNames,
    startAt: input.startAt,
    endAt: input.endAt,
    rules: input.rules,
    status: input.status,
    createdAt: MARKETING_NOW_TEXT,
  };
  fullDiscountActivities.unshift(activity);
  return { ...activity };
}

export async function updateFullDiscountStatus(id: string, enabled: boolean): Promise<void> {
  await sleep(240);
  const target = fullDiscountActivities.find((item) => item.id === id);
  if (!target) return;
  target.status = enabled ? resolveActivityStatus(target.startAt, target.endAt) : 'disabled';
}

export async function removeFullDiscount(id: string): Promise<void> {
  await sleep(220);
  const index = fullDiscountActivities.findIndex((item) => item.id === id);
  if (index >= 0) fullDiscountActivities.splice(index, 1);
}

// ---------------------------------------------------------------- 发券活动

export interface CouponTaskQuery {
  keyword?: string;
  status?: CouponTaskStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchCouponTasks(
  query: CouponTaskQuery = {},
): Promise<Paged<CouponTask>> {
  await sleep(280);
  const { keyword, status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();
  const filtered = couponTasks.filter((task) => {
    if (kw && !task.name.includes(kw) && !task.couponName.includes(kw)) return false;
    if (status !== 'all' && task.status !== status) return false;
    return true;
  });
  return paginate(filtered, page, pageSize);
}

export interface CouponTaskInput {
  id?: string;
  name: string;
  couponName: string;
  audiences: string[];
  planned: number;
  validFrom: string;
  validTo: string;
}

export async function saveCouponTask(input: CouponTaskInput): Promise<CouponTask> {
  await sleep(320);

  if (input.id) {
    const target = couponTasks.find((item) => item.id === input.id);
    if (!target) throw new Error('发券任务不存在');
    target.name = input.name;
    target.couponName = input.couponName;
    target.audiences = input.audiences;
    target.planned = input.planned;
    target.validFrom = input.validFrom;
    target.validTo = input.validTo;
    return { ...target };
  }

  const task: CouponTask = {
    id: nextId('CP', couponTasks),
    name: input.name,
    couponName: input.couponName,
    audiences: input.audiences,
    planned: input.planned,
    claimed: 0,
    validFrom: input.validFrom,
    validTo: input.validTo,
    status: 'running',
    createdAt: MARKETING_NOW_TEXT,
  };
  couponTasks.unshift(task);
  return { ...task };
}

export async function removeCouponTask(id: string): Promise<void> {
  await sleep(220);
  const index = couponTasks.findIndex((item) => item.id === id);
  if (index >= 0) couponTasks.splice(index, 1);
}

export async function fetchCouponOptions(): Promise<Array<{ label: string; value: string }>> {
  await sleep(220);
  return couponOptions.map((item) => ({ ...item }));
}

export async function fetchAudienceTags(): Promise<string[]> {
  await sleep(200);
  return [...marketingAudienceTags];
}

export async function fetchStoreOptions(): Promise<Array<{ label: string; value: string }>> {
  await sleep(220);
  return marketingStoreNames.map((name) => ({ label: name, value: name }));
}

// ---------------------------------------------------------------- 自动化营销

export interface AutomationQuery {
  keyword?: string;
  channel?: MarketingChannel | 'all';
  status?: AutomationStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchAutomationPlans(
  query: AutomationQuery = {},
): Promise<Paged<AutomationPlan>> {
  await sleep(280);
  const { keyword, channel = 'all', status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();
  const filtered = automationPlans.filter((plan) => {
    if (kw && !plan.name.includes(kw)) return false;
    if (channel !== 'all' && !plan.channels.includes(channel)) return false;
    if (status !== 'all' && plan.status !== status) return false;
    return true;
  });
  return paginate(filtered, page, pageSize);
}

export async function fetchActivityOptions(): Promise<MarketingActivityOption[]> {
  await sleep(240);
  return marketingActivityOptions.map((item) => ({ ...item }));
}

export interface AutomationInput {
  id?: string;
  name: string;
  activityId: string;
  audiences: string[];
  triggerType: TriggerType;
  triggerRule: string;
  channels: MarketingChannel[];
  notifyMethod: NotifyMethod;
}

export async function saveAutomationPlan(input: AutomationInput): Promise<AutomationPlan> {
  await sleep(320);
  const activity = marketingActivityOptions.find((item) => item.value === input.activityId);
  if (!activity) throw new Error('关联活动不存在');

  if (input.id) {
    const target = automationPlans.find((item) => item.id === input.id);
    if (!target) throw new Error('自动化计划不存在');
    target.name = input.name;
    target.activityId = input.activityId;
    target.activityName = activity.label;
    target.activityType = activity.activityType;
    target.audiences = input.audiences;
    target.triggerType = input.triggerType;
    target.triggerRule = input.triggerRule;
    target.channels = input.channels;
    target.notifyMethod = input.notifyMethod;
    return { ...target };
  }

  const plan: AutomationPlan = {
    id: nextId('AT', automationPlans),
    name: input.name,
    activityId: input.activityId,
    activityName: activity.label,
    activityType: activity.activityType,
    audiences: input.audiences,
    triggerType: input.triggerType,
    triggerRule: input.triggerRule,
    channels: input.channels,
    notifyMethod: input.notifyMethod,
    status: 'enabled',
    createdAt: MARKETING_NOW_TEXT,
  };
  automationPlans.unshift(plan);
  return { ...plan };
}

export async function updateAutomationStatus(id: string, enabled: boolean): Promise<void> {
  await sleep(240);
  const target = automationPlans.find((item) => item.id === id);
  if (!target) return;
  target.status = enabled ? 'enabled' : 'paused';
}

export async function removeAutomationPlan(id: string): Promise<void> {
  await sleep(220);
  const index = automationPlans.findIndex((item) => item.id === id);
  if (index >= 0) automationPlans.splice(index, 1);
}

// ---------------------------------------------------------------- 消息通知

export interface NotificationQuery {
  keyword?: string;
  channel?: MarketingChannel | 'all';
  status?: NotificationStatus | 'all';
  page?: number;
  pageSize?: number;
}

export async function fetchNotificationTemplates(
  query: NotificationQuery = {},
): Promise<Paged<NotificationTemplate>> {
  await sleep(280);
  const { keyword, channel = 'all', status = 'all', page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();
  const filtered = notificationTemplates.filter((template) => {
    if (kw && !template.name.includes(kw)) return false;
    if (channel !== 'all' && template.channel !== channel) return false;
    if (status !== 'all' && template.status !== status) return false;
    return true;
  });
  return paginate(filtered, page, pageSize);
}

export interface NotificationInput {
  id?: string;
  name: string;
  scene: NotificationScene;
  channel: MarketingChannel;
  notifyMethod: NotifyMethod;
  content: string;
}

function contentSummary(content: string): string {
  return content.length > 34 ? `${content.slice(0, 34)}…` : content;
}

export async function saveNotificationTemplate(
  input: NotificationInput,
): Promise<NotificationTemplate> {
  await sleep(320);
  const summary = contentSummary(input.content);

  if (input.id) {
    const target = notificationTemplates.find((item) => item.id === input.id);
    if (!target) throw new Error('通知模板不存在');
    target.name = input.name;
    target.scene = input.scene;
    target.channel = input.channel;
    target.notifyMethod = input.notifyMethod;
    target.content = input.content;
    target.summary = summary;
    target.updatedAt = MARKETING_NOW_TEXT;
    return { ...target };
  }

  const template: NotificationTemplate = {
    id: nextId('NT', notificationTemplates),
    name: input.name,
    scene: input.scene,
    channel: input.channel,
    notifyMethod: input.notifyMethod,
    content: input.content,
    summary,
    sendCount: 0,
    status: 'enabled',
    updatedAt: MARKETING_NOW_TEXT,
  };
  notificationTemplates.unshift(template);
  return { ...template };
}

export async function updateNotificationStatus(id: string, enabled: boolean): Promise<void> {
  await sleep(240);
  const target = notificationTemplates.find((item) => item.id === id);
  if (!target) return;
  target.status = enabled ? 'enabled' : 'disabled';
}

export async function removeNotificationTemplate(id: string): Promise<void> {
  await sleep(220);
  const index = notificationTemplates.findIndex((item) => item.id === id);
  if (index >= 0) notificationTemplates.splice(index, 1);
}
