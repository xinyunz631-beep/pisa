# 营销模块 · 接口契约

- **模块**：营销
- **页面**：满减活动（`/marketing/full-reduction`）、满折活动（`/marketing/full-discount`）、发券活动（`/marketing/coupon`）、自动化营销（`/marketing/automation`）、消息通知（`/marketing/notifications`）
- **前端 service**：`src/services/marketing.ts`
- **Mock 数据**：`src/mock/marketing.ts`（门店来自 `src/mock/db.ts`，卡券选项来自 `src/mock/assets.ts`）
- **前端导出**：23 个 `async` 函数（对应 28 个 HTTP method + path，其中 5 个 `save*` 为新增/编辑 upsert）+ 1 个常量 `ALL_STORES_COUNT` + 8 个状态字典 + 26 个类型（17 个数据模型 + 9 个请求参数接口）
- **Mock 数据量**：满减活动 24 条、满折活动 20 条、发券任务 20 条、自动化计划 20 条、通知模板 22 条、关联活动选项 64 条（24 + 20 + 20）、门店 12 家、人群标签 12 个、卡券选项 24 张（资产模块卡券，见 [04-assets.md](./04-assets.md)）

> 通用约定（Base URL、统一响应包裹、分页、字段类型、错误码、REST 命名）见 [README.md](./README.md)。本文档只描述营销模块的差异项。

## 零、营销模块与 Mock 的差异（联调必读）

1. **时间精度**：Mock 返回的时间为分钟精度（如 `2026-09-25 00:00`），本契约统一为 `YYYY-MM-DD HH:mm:ss`，示例中补 `:00`；券有效期等纯日期字段仍为 `YYYY-MM-DD`。
2. **业务时间基准**：Mock 固定「当前时间」为 `2026-11-04 09:00`（`MARKETING_NOW`），新建记录时间固定为 `2026-11-04 09:30`（`MARKETING_NOW_TEXT`）；真实接口一律使用服务器时间。
3. **活动状态**：Mock 为种子数据里的存储值，`updateFullReductionStatus` / `updateFullDiscountStatus` 启用时按时间窗口重新派生；真实实现建议由定时任务刷新，或在查询时按 `startAt` / `endAt` 派生，保证「已结束」实时。
4. **门店字段（ID + 冗余名称）**：活动对象写入只传 `storeIds`（门店 ID，如 `ST001`，来自公共门店选项），返回时附加**只读冗余** `storeNames`（后端 join 门店表得到，前端展示用）；「全部门店」判断改为 `storeIds.length >= 门店选项总数`。门店下拉统一使用公共接口 `GET /api/v1/stores/options`（`value` = 门店 ID，与 [01-dashboard.md](./01-dashboard.md)、[05-business.md](./05-business.md) 完全一致）。
5. **卡券字段（ID + 冗余名称）**：发券任务写入只传 `couponId`（引用资产模块卡券，如 `CP001`），返回时附加**只读冗余** `couponName`（后端 join 卡券表得到）；卡券下拉统一使用公共接口 `GET /api/v1/coupons/options`（结构以 [04-assets.md](./04-assets.md) 为准，返回 `id / name / type`）。
6. **分页 / 持久化 / 鉴权 / 关联校验**：同 README「Mock 与生产的差异」，删除接口需做引用校验，数据需落库。
7. **删除接口**：Mock 对不存在的 ID 静默忽略；真实实现建议返回 `40400`。

## 一、模块概览

### 1.1 页面与使用的前端函数

| 页面 | 路由 | 使用的前端函数 | 数据来源 |
| --- | --- | --- | --- |
| 满减活动 | `/marketing/full-reduction` | `fetchFullReductions`、`saveFullReduction`、`updateFullReductionStatus`、`removeFullReduction`、`fetchStoreOptions`、`ALL_STORES_COUNT` | `src/mock/marketing.ts` → `fullReductionActivities` |
| 满折活动 | `/marketing/full-discount` | `fetchFullDiscounts`、`saveFullDiscount`、`updateFullDiscountStatus`、`removeFullDiscount`、`fetchStoreOptions`、`ALL_STORES_COUNT` | `fullDiscountActivities` |
| 发券活动 | `/marketing/coupon` | `fetchCouponTasks`、`saveCouponTask`、`removeCouponTask`、`fetchCouponOptions`、`fetchAudienceTags` | `couponTasks`、`marketingAudienceTags`、资产模块 `coupons`（券选项） |
| 自动化营销 | `/marketing/automation` | `fetchAutomationPlans`、`saveAutomationPlan`、`updateAutomationStatus`、`removeAutomationPlan`、`fetchActivityOptions`、`fetchAudienceTags` | `automationPlans`、`marketingActivityOptions`、`marketingAudienceTags` |
| 消息通知 | `/marketing/notifications` | `fetchNotificationTemplates`、`saveNotificationTemplate`、`updateNotificationStatus`、`removeNotificationTemplate` | `notificationTemplates` |

### 1.2 资源与接口数量

| 资源 | Path 前缀 | 列表 `GET` | 新增 `POST` | 编辑 `PUT /{id}` | 删除 `DELETE /{id}` | 启停 `PATCH /{id}/status` | 小计 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 满减活动 | `/api/v1/marketing/full-reductions` | 1 | 1 | 1 | 1 | 1 | 5 |
| 满折活动 | `/api/v1/marketing/full-discounts` | 1 | 1 | 1 | 1 | 1 | 5 |
| 发券任务 | `/api/v1/marketing/coupon-tasks` | 1 | 1 | 1 | 1 | 0（无启停入口） | 4 |
| 自动化计划 | `/api/v1/marketing/automation-plans` | 1 | 1 | 1 | 1 | 1 | 5 |
| 消息通知模板 | `/api/v1/marketing/notification-templates` | 1 | 1 | 1 | 1 | 1 | 5 |
| 下拉选项 | 公共 `/api/v1/stores/options`、`/api/v1/coupons/options` + 营销 `/api/v1/marketing/...`（4 个独立 GET） | 4 | 0 | 0 | 0 | 0 | 4 |
| **合计** | | **9** | **5** | **5** | **5** | **4** | **28** |

> 说明：`save*` 系列是前端 upsert，按是否传 `id` 决定 `POST`（新增）或 `PUT`（编辑），因此 5 个函数展开为 10 个 HTTP 接口；其余 18 个函数一一对应 18 个接口。

## 二、前端函数 → HTTP 接口映射

| # | 前端函数 | 用途 | Method | Path |
| --- | --- | --- | --- | --- |
| 1 | `fetchFullReductions(query)` | 满减活动分页列表 | `GET` | `/api/v1/marketing/full-reductions` |
| 2 | `saveFullReduction(input)` | 新增/编辑满减活动（upsert） | `POST` / `PUT` | `/api/v1/marketing/full-reductions`、`/api/v1/marketing/full-reductions/{id}` |
| 3 | `updateFullReductionStatus(id, enabled)` | 满减活动启用/停用 | `PATCH` | `/api/v1/marketing/full-reductions/{id}/status` |
| 4 | `removeFullReduction(id)` | 删除满减活动 | `DELETE` | `/api/v1/marketing/full-reductions/{id}` |
| 5 | `fetchFullDiscounts(query)` | 满折活动分页列表 | `GET` | `/api/v1/marketing/full-discounts` |
| 6 | `saveFullDiscount(input)` | 新增/编辑满折活动（upsert） | `POST` / `PUT` | `/api/v1/marketing/full-discounts`、`/api/v1/marketing/full-discounts/{id}` |
| 7 | `updateFullDiscountStatus(id, enabled)` | 满折活动启用/停用 | `PATCH` | `/api/v1/marketing/full-discounts/{id}/status` |
| 8 | `removeFullDiscount(id)` | 删除满折活动 | `DELETE` | `/api/v1/marketing/full-discounts/{id}` |
| 9 | `fetchCouponTasks(query)` | 发券任务分页列表 | `GET` | `/api/v1/marketing/coupon-tasks` |
| 10 | `saveCouponTask(input)` | 新增/编辑发券任务（upsert） | `POST` / `PUT` | `/api/v1/marketing/coupon-tasks`、`/api/v1/marketing/coupon-tasks/{id}` |
| 11 | `removeCouponTask(id)` | 删除发券任务 | `DELETE` | `/api/v1/marketing/coupon-tasks/{id}` |
| 12 | `fetchAutomationPlans(query)` | 自动化计划分页列表 | `GET` | `/api/v1/marketing/automation-plans` |
| 13 | `saveAutomationPlan(input)` | 新增/编辑自动化计划（upsert） | `POST` / `PUT` | `/api/v1/marketing/automation-plans`、`/api/v1/marketing/automation-plans/{id}` |
| 14 | `updateAutomationStatus(id, enabled)` | 自动化计划启用/暂停 | `PATCH` | `/api/v1/marketing/automation-plans/{id}/status` |
| 15 | `removeAutomationPlan(id)` | 删除自动化计划 | `DELETE` | `/api/v1/marketing/automation-plans/{id}` |
| 16 | `fetchNotificationTemplates(query)` | 消息通知模板分页列表 | `GET` | `/api/v1/marketing/notification-templates` |
| 17 | `saveNotificationTemplate(input)` | 新增/编辑通知模板（upsert） | `POST` / `PUT` | `/api/v1/marketing/notification-templates`、`/api/v1/marketing/notification-templates/{id}` |
| 18 | `updateNotificationStatus(id, enabled)` | 通知模板启用/停用 | `PATCH` | `/api/v1/marketing/notification-templates/{id}/status` |
| 19 | `removeNotificationTemplate(id)` | 删除通知模板 | `DELETE` | `/api/v1/marketing/notification-templates/{id}` |
| 20 | `fetchCouponOptions()` | 发券「发放券」下拉选项（公共接口，数据来自资产模块卡券） | `GET` | `/api/v1/coupons/options` |
| 21 | `fetchAudienceTags()` | 人群标签选项 | `GET` | `/api/v1/marketing/audience-tags` |
| 22 | `fetchStoreOptions()` | 适用门店下拉选项（公共接口，与看板 / 业务模块一致） | `GET` | `/api/v1/stores/options` |
| 23 | `fetchActivityOptions()` | 自动化计划「关联活动」下拉选项 | `GET` | `/api/v1/marketing/activities/options` |
| — | `ALL_STORES_COUNT` | 门店选项总数常量，用于判断展示「全部门店」 | 无 | 由 `/api/v1/stores/options` 返回数组长度推导 |

> **非接口导出说明**：
>
> - 8 个状态字典：`activityStatusMeta`、`couponStatusMeta`、`automationStatusMeta`、`notificationStatusMeta`、`marketingChannelMeta`、`notifyMethodMeta`、`triggerTypeMeta`、`notificationSceneMeta`。均为前端本地展示元数据（`label` + `color`），不产生 HTTP 接口；后端只需保证枚举值与本文档一致。
> - 17 个类型：`ActivityStatus`、`AutomationPlan`、`AutomationStatus`、`CouponTask`、`CouponTaskStatus`、`DiscountRule`、`FullDiscountActivity`、`FullReductionActivity`、`MarketingActivityOption`、`MarketingActivityType`、`MarketingChannel`、`NotificationScene`、`NotificationStatus`、`NotificationTemplate`、`NotifyMethod`、`ReductionRule`、`TriggerType`，以及 9 个请求参数接口（`ActivityQuery`、`ReductionInput`、`DiscountInput`、`CouponTaskQuery`、`CouponTaskInput`、`AutomationQuery`、`AutomationInput`、`NotificationQuery`、`NotificationInput`），均不影响接口路径。
> - `ALL_STORES_COUNT = marketingStoreNames.length`（Mock 为 12，即门店选项总数）。前端在 `storeIds.length >= ALL_STORES_COUNT` 时展示「全部门店」；后端无需提供该常量。

## 三、枚举与状态字典

> 枚举值统一使用 `marketing.ts` 中的真实取值（小驼峰），中文为展示文案。**前端通过字典做 Tab / Tag 展示，后端返回枚举值即可；若后端返回中文 `label`，必须与下表完全一致。**

### 3.1 营销活动状态（`ActivityStatus`）

| 值 | 中文 | 判定 / 触发方式 |
| --- | --- | --- |
| `notStarted` | 未开始 | `startAt` > 当前时间 |
| `running` | 进行中 | `startAt` ≤ 当前时间 ≤ `endAt` |
| `ended` | 已结束 | `endAt` < 当前时间 |
| `disabled` | 已停用 | 人工停用（优先级最高，覆盖时间判定） |

> 派生规则（`resolveActivityStatus`）：先看停用标记，`disabled` 优先；否则按 `startAt` / `endAt` 与当前时间比较派生。启用（`enabled=true`）时重新派生，停用（`enabled=false`）时固定 `disabled`，且不会修改 `startAt` / `endAt`。

### 3.2 发券任务状态（`CouponTaskStatus`）

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `running` | 进行中 | 新建任务默认状态，发放中 |
| `ended` | 已结束 | 有效期结束或发放完成 |
| `paused` | 已暂停 | 暂停发放（本期前端无操作入口，见 4.3 说明） |

### 3.3 营销渠道（`MarketingChannel`）

| 值 | 中文 |
| --- | --- |
| `sms` | 短信 |
| `wechat` | 微信 |
| `inbox` | 站内信 |

### 3.4 通知方式（`NotifyMethod`）

| 值 | 中文 |
| --- | --- |
| `template` | 模板消息 |
| `text` | 文本消息 |
| `rich` | 图文卡片 |

### 3.5 触发方式（`TriggerType`）

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `scheduled` | 定时 | `triggerRule` 为时间 / 周期表达式，如 `每天 10:00`、`每周五 17:30`、`每月 1 日 10:00` |
| `event` | 事件 | `triggerRule` 为事件描述，如 `用户完成订单后 30 分钟`、`会员升级时立即触发` |

### 3.6 自动化计划状态（`AutomationStatus`）

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `enabled` | 启用中 | 新建计划默认状态 |
| `paused` | 已暂停 | 暂停执行 |

### 3.7 通知场景（`NotificationScene`）

| 值 | 中文 | 内容占位符（Mock 真实用到） |
| --- | --- | --- |
| `activityStart` | 活动开始 | `{活动名称}`、`{开始时间}`、`{结束时间}` |
| `couponArrived` | 发券到账 | `{券名称}`、`{失效时间}`、`{会员昵称}` |
| `orderStatus` | 订单状态 | `{订单号}`、`{取餐号}` |
| `memberUpgrade` | 会员升级 | `{会员等级}`、`{会员昵称}`、`{门店名称}`、`{积分数}`、`{过期时间}` |

### 3.8 通知模板状态（`NotificationStatus`）

| 值 | 中文 |
| --- | --- |
| `enabled` | 启用 |
| `disabled` | 停用 |

### 3.9 营销活动类型（`MarketingActivityType`，**中文枚举**）

| 值 | 说明 |
| --- | --- |
| `满减活动` | 关联满减活动，ID 前缀 `FR` |
| `满折活动` | 关联满折活动，ID 前缀 `FD` |
| `发券活动` | 关联发券任务，ID 前缀 `CP` |

> `activityType` 为**中文字符串枚举**（不是英文值），后端返回时必须与上表一致，前端直接展示。

### 3.10 前端派生字段（不落库、无对应入参）

| 字段 / 展示 | 派生规则 | 出处 |
| --- | --- | --- |
| 领取率 | `planned > 0 ? min(100, round(claimed / planned * 100)) : 0`（`Progress` 百分比） | `src/pages/Marketing/Coupon/index.tsx` |
| 通知内容摘要 `summary` | `content.length > 34 ? content.slice(0, 34) + '…' : content` | `src/services/marketing.ts` → `contentSummary()` |
| 「全部门店」 | `storeIds.length >= 门店选项总数`（`GET /api/v1/stores/options` 返回数组长度，Mock 为 12） | `src/pages/Marketing/FullReduction` / `FullDiscount` |
| 状态标签颜色 | 仅前端展示，不参与接口 | 8 个 `*Meta` 字典 |

### 3.11 金额 / 折扣 / 数量约定

| 字段 | 规则 |
| --- | --- |
| `threshold`（门槛金额） | `number`，单位「元」，整数，≥ 1 |
| `reduce`（减免金额） | `number`，单位「元」，整数，≥ 1，且 < 同档 `threshold` |
| `discount`（折扣） | `number`，`0 < discount < 10`，1 位小数；`8.5` = 8.5 折 |
| `planned`（计划发放量） | `number`，整数，范围 `1 ~ 100000` |
| `claimed`（已领取量） | `number`，整数，`0 ≤ claimed ≤ planned`，由后端累计 |

## 四、接口明细

### 4.1 满减活动

#### GET /api/v1/marketing/full-reductions

- **说明**：满减活动分页列表，支持按活动名称模糊搜索、按状态筛选、按活动时间区间（与活动窗口有交集即命中）筛选。
- **前端来源**：`src/services/marketing.ts` → `fetchFullReductions()`；页面 `src/pages/Marketing/FullReduction/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 活动名称模糊匹配（包含）；`trim` 后为空视为不筛选 |
| status | string | 否 | `notStarted` / `running` / `ended` / `disabled`；传 `all` 或省略表示全部 |
| startDate | string | 否 | 活动时间区间起始日 `YYYY-MM-DD`（含）；需与 `endDate` 成对出现 |
| endDate | string | 否 | 活动时间区间结束日 `YYYY-MM-DD`（含）；需与 `startDate` 成对出现 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 10，最大 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "FR001",
      "name": "国庆满减狂欢",
      "storeIds": ["ST001", "ST003"],
      "storeNames": ["上海静安店", "北京朝阳店"],
      "startAt": "2026-09-25 00:00:00",
      "endAt": "2026-11-04 23:59:00",
      "rules": [
        { "threshold": 99, "reduce": 10 },
        { "threshold": 129, "reduce": 20 },
        { "threshold": 199, "reduce": 40 }
      ],
      "status": "running",
      "createdAt": "2026-09-20 10:33:00"
    },
    {
      "id": "FR003",
      "name": "老客回馈满减",
      "storeIds": ["ST005", "ST001"],
      "storeNames": ["广州天河店", "上海静安店"],
      "startAt": "2026-09-24 00:00:00",
      "endAt": "2026-10-09 23:59:00",
      "rules": [
        { "threshold": 99, "reduce": 15 },
        { "threshold": 259, "reduce": 30 }
      ],
      "status": "ended",
      "createdAt": "2026-09-21 15:27:00"
    }
  ],
  "total": 24,
  "page": 1,
  "pageSize": 10
}
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 满减活动 ID，`FR` + 3 位序号（`FR001` ~） |
| name | string | 活动名称 |
| storeIds | string[] | 适用门店 ID 列表（引用 `GET /api/v1/stores/options` 的 `value`，如 `ST001`）；`storeIds.length` 等于门店选项总数时前端展示「全部门店」 |
| storeNames | string[] | **只读冗余**门店名称，后端按 `storeIds` join 门店表返回，前端展示用（不参与写入） |
| startAt | string | 活动开始时间 `YYYY-MM-DD HH:mm:ss` |
| endAt | string | 活动结束时间 `YYYY-MM-DD HH:mm:ss` |
| rules | ReductionRule[] | 满减规则档位，按 `threshold` 升序；`threshold` 门槛金额（元）、`reduce` 减免金额（元） |
| status | string | 活动状态，见 3.1 |
| createdAt | string | 创建时间 |

- **业务规则 / 错误**：
  - 时间区间筛选按**日期部分**判定相交：`endAt` 的日期 ≥ `startDate` 且 `startAt` 的日期 ≤ `endDate`（闭区间）；仅传一个日期时不生效。
  - 默认按 `createdAt` 倒序（新增记录在前），`id` 作为稳定次序；Mock 数组顺序即创建顺序（新记录 `unshift` 置顶）。
  - 数据权限：`X-Store-Id` 存在时，仅返回 `storeIds` 包含该门店的活动；总部视角（不传）返回全部。
  - **错误**：`40001`（`startDate` / `endDate` 格式错误或未成对、`page` / `pageSize` 非法）、`40100`、`40300`、`50000`。

#### POST /api/v1/marketing/full-reductions　|　PUT /api/v1/marketing/full-reductions/{id}

- **说明**：新增 / 编辑满减活动。前端 `saveFullReduction` 为 upsert：不传 `id` 调 `POST`，传 `id` 调 `PUT`。Mock 无独立「详情」接口，编辑时直接用列表行数据回填。
- **前端来源**：`src/services/marketing.ts` → `saveFullReduction()`；页面「新建满减活动 / 编辑满减活动」抽屉
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 否 | 活动 ID；`PUT` 时优先取路径参数，Body 中可省略；`POST` 时忽略 |
| name | string | 是 | 活动名称，≤ 30 字，`trim` 后非空 |
| storeIds | string[] | 是 | 适用门店 ID，≥ 1 个、去重（引用 `GET /api/v1/stores/options` 的 `value`）；全部门店时传全部门店 ID；响应中另附只读 `storeNames` |
| startAt | string | 是 | 开始时间 `YYYY-MM-DD HH:mm:ss` |
| endAt | string | 是 | 结束时间 `YYYY-MM-DD HH:mm:ss`，须晚于 `startAt` |
| rules | ReductionRule[] | 是 | 满减规则，≥ 1 档；`threshold` 整数 ≥ 1，`reduce` 整数 ≥ 1 且 < `threshold`；建议按 `threshold` 升序、门槛不重复 |
| status | string | 是 | 活动状态，取 3.1 枚举；新建时页面默认 `notStarted` |

- **入参示例**：

```json
{
  "name": "双十二会员满减",
  "storeIds": ["ST001", "ST003"],
  "startAt": "2026-12-01 00:00:00",
  "endAt": "2026-12-12 23:59:00",
  "rules": [
    { "threshold": 100, "reduce": 15 },
    { "threshold": 200, "reduce": 40 }
  ],
  "status": "notStarted"
}
```

- **出参（data）**：保存后的活动对象（结构同列表项）。`POST` 示例（Mock 按当前最大序号 `FR024` 递增生成 `FR025`）：

```json
{
  "id": "FR025",
  "name": "双十二会员满减",
  "storeIds": ["ST001", "ST003"],
  "storeNames": ["上海静安店", "北京朝阳店"],
  "startAt": "2026-12-01 00:00:00",
  "endAt": "2026-12-12 23:59:00",
  "rules": [
    { "threshold": 100, "reduce": 15 },
    { "threshold": 200, "reduce": 40 }
  ],
  "status": "notStarted",
  "createdAt": "2026-11-04 09:30:00"
}
```

- **业务规则 / 错误**：
  - `PUT` 时活动不存在 → `40400`「满减活动不存在」（Mock 抛出该错误）。
  - `createdAt` 仅新增时由服务端生成，编辑不得修改。
  - `storeNames` 由后端按 `storeIds` join 门店表返回，前端只提交 `storeIds`；`storeIds` 须为已存在门店，否则 `40001` / `40400`。
  - `status` 以请求体为准，保存时不做时间派生（停用状态需显式传 `disabled`）。
  - 建议校验：同一门店 + 时间段重叠的活动不可重复创建 → `40900`（Mock 未做，真实实现需补）。
  - **错误**：`40001`（名称超长、门店为空 / 不存在、时间倒挂、规则为空 / 减免 ≥ 门槛 / 门槛重复、状态非法）、`40100`、`40300`、`40400`、`40900`、`50000`。

#### PATCH /api/v1/marketing/full-reductions/{id}/status

- **说明**：满减活动启用 / 停用。
- **前端来源**：`src/services/marketing.ts` → `updateFullReductionStatus()`；列表「启用 / 停用」操作
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| enabled | boolean | 是 | `true` 启用：按 `startAt` / `endAt` 与当前时间重新派生 `notStarted` / `running` / `ended`；`false` 停用：置为 `disabled` |

```json
{ "enabled": false }
```

- **出参（data）**：`null`
- **业务规则 / 错误**：
  - 启用不会复活已过期活动：已结束的活动启用后仍派生为 `ended`。
  - 停用不修改 `startAt` / `endAt`；重新启用按当前服务器时间派生。
  - 活动不存在：Mock 静默返回；真实实现建议 `40400`。
  - **错误**：`40001`（`enabled` 非布尔）、`40100`、`40300`、`40400`、`50000`。

#### DELETE /api/v1/marketing/full-reductions/{id}

- **说明**：删除满减活动。
- **前端来源**：`src/services/marketing.ts` → `removeFullReduction()`；列表「删除」二次确认
- **入参**：路径参数 `id`。
- **出参（data）**：`null`
- **业务规则 / 错误**：
  - 建议软删除并保留审计；删除前校验是否被自动化计划引用（`activityId`），被引用时建议 `40900` 或提示改为停用（Mock 无校验，直接移除）。
  - 不存在时 Mock 静默返回；真实实现建议 `40400`。
  - **错误**：`40100`、`40300`、`40400`、`40900`、`50000`。

### 4.2 满折活动

#### GET /api/v1/marketing/full-discounts

- **说明**：满折活动分页列表，筛选项与满减活动一致。
- **前端来源**：`src/services/marketing.ts` → `fetchFullDiscounts()`；页面 `src/pages/Marketing/FullDiscount/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 活动名称模糊匹配（包含） |
| status | string | 否 | `notStarted` / `running` / `ended` / `disabled`；`all` 或省略表示全部 |
| startDate | string | 否 | 活动时间区间起始日 `YYYY-MM-DD`（含），与 `endDate` 成对 |
| endDate | string | 否 | 活动时间区间结束日 `YYYY-MM-DD`（含），与 `startDate` 成对 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 10，最大 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "FD001",
      "name": "中秋满折特惠",
      "storeIds": ["ST006", "ST007", "ST005"],
      "storeNames": ["深圳南山店", "杭州西湖店", "广州天河店"],
      "startAt": "2026-10-18 00:00:00",
      "endAt": "2026-11-04 23:59:00",
      "rules": [
        { "threshold": 299, "discount": 9.5 },
        { "threshold": 499, "discount": 9 }
      ],
      "status": "running",
      "createdAt": "2026-10-17 16:17:00"
    },
    {
      "id": "FD002",
      "name": "国庆满折",
      "storeIds": ["ST007", "ST006"],
      "storeNames": ["杭州西湖店", "深圳南山店"],
      "startAt": "2026-10-16 00:00:00",
      "endAt": "2026-10-24 23:59:00",
      "rules": [
        { "threshold": 99, "discount": 9.5 },
        { "threshold": 199, "discount": 8.8 }
      ],
      "status": "ended",
      "createdAt": "2026-10-14 16:15:00"
    }
  ],
  "total": 20,
  "page": 1,
  "pageSize": 10
}
```

- **字段说明**：同 4.1，差异字段如下。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 满折活动 ID，`FD` + 3 位序号（`FD001` ~） |
| rules | DiscountRule[] | 满折规则档位，按 `threshold` 升序；`threshold` 门槛金额（元）、`discount` 折扣（`0 < discount < 10`，1 位小数，`8.5` 表示 8.5 折） |

- **业务规则 / 错误**：与 `GET /api/v1/marketing/full-reductions` 一致（时间区间按日期相交、创建时间倒序、`X-Store-Id` 过滤）。
  - **错误**：`40001`、`40100`、`40300`、`50000`。

#### POST /api/v1/marketing/full-discounts　|　PUT /api/v1/marketing/full-discounts/{id}

- **说明**：新增 / 编辑满折活动。前端 `saveFullDiscount` 为 upsert。
- **前端来源**：`src/services/marketing.ts` → `saveFullDiscount()`；页面「新建满折活动 / 编辑满折活动」抽屉
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 否 | 活动 ID；`PUT` 时优先取路径参数 |
| name | string | 是 | 活动名称，≤ 30 字 |
| storeIds | string[] | 是 | 适用门店 ID，≥ 1 个、去重（引用 `GET /api/v1/stores/options` 的 `value`）；响应中另附只读 `storeNames` |
| startAt | string | 是 | 开始时间 `YYYY-MM-DD HH:mm:ss` |
| endAt | string | 是 | 结束时间 `YYYY-MM-DD HH:mm:ss`，须晚于 `startAt` |
| rules | DiscountRule[] | 是 | 满折规则，≥ 1 档；`threshold` 整数 ≥ 1；`discount` 满足 `0 < discount < 10`（页面输入范围 `0.1 ~ 9.9`） |
| status | string | 是 | 活动状态，取 3.1 枚举；新建默认 `notStarted` |

- **入参示例**：

```json
{
  "name": "双十二会员满折",
  "storeIds": ["ST001", "ST006"],
  "startAt": "2026-12-01 00:00:00",
  "endAt": "2026-12-12 23:59:00",
  "rules": [
    { "threshold": 199, "discount": 9 },
    { "threshold": 399, "discount": 8.5 }
  ],
  "status": "notStarted"
}
```

- **出参（data）**：保存后的活动对象。`POST` 示例（Mock 生成 `FD021`）：

```json
{
  "id": "FD021",
  "name": "双十二会员满折",
  "storeIds": ["ST001", "ST006"],
  "storeNames": ["上海静安店", "深圳南山店"],
  "startAt": "2026-12-01 00:00:00",
  "endAt": "2026-12-12 23:59:00",
  "rules": [
    { "threshold": 199, "discount": 9 },
    { "threshold": 399, "discount": 8.5 }
  ],
  "status": "notStarted",
  "createdAt": "2026-11-04 09:30:00"
}
```

- **业务规则 / 错误**：
  - `PUT` 时活动不存在 → `40400`「满折活动不存在」。
  - 规则建议按 `threshold` 升序、门槛不重复；同一活动内折扣应随门槛升高而递减（业务建议，Mock 未强校验）。
  - 其余同 4.1 保存逻辑（`createdAt` 仅新增生成、状态以请求为准、同门店同时段重叠建议 `40900`）。
  - **错误**：`40001`、`40100`、`40300`、`40400`、`40900`、`50000`。

#### PATCH /api/v1/marketing/full-discounts/{id}/status

- **说明**：满折活动启用 / 停用。
- **前端来源**：`src/services/marketing.ts` → `updateFullDiscountStatus()`
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| enabled | boolean | 是 | `true` 按时间窗口重新派生状态；`false` 置为 `disabled` |

- **出参（data）**：`null`
- **业务规则 / 错误**：同 4.1 启停规则；不存在时 Mock 静默返回，真实建议 `40400`。
  - **错误**：`40001`、`40100`、`40300`、`40400`、`50000`。

#### DELETE /api/v1/marketing/full-discounts/{id}

- **说明**：删除满折活动。
- **前端来源**：`src/services/marketing.ts` → `removeFullDiscount()`
- **入参**：路径参数 `id`。
- **出参（data）**：`null`
- **业务规则 / 错误**：同 4.1 删除规则（建议软删 + 引用校验；不存在建议 `40400`）。
  - **错误**：`40100`、`40300`、`40400`、`40900`、`50000`。

### 4.3 发券任务

#### GET /api/v1/marketing/coupon-tasks

- **说明**：发券任务分页列表，支持按任务名称 / 券名称模糊搜索、按状态筛选。
- **前端来源**：`src/services/marketing.ts` → `fetchCouponTasks()`；页面 `src/pages/Marketing/Coupon/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 任务名称**或**券名称模糊匹配（包含任一即命中） |
| status | string | 否 | `running` / `ended` / `paused`；`all` 或省略表示全部 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 10，最大 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "CP001",
      "name": "双十一新客拉新",
      "couponId": "CP001",
      "couponName": "新客立减券",
      "audiences": ["周末消费", "高频到店", "生日本月"],
      "planned": 8000,
      "claimed": 6016,
      "validFrom": "2026-10-28",
      "validTo": "2026-11-04",
      "status": "running",
      "createdAt": "2026-10-19 10:53:00"
    },
    {
      "id": "CP002",
      "name": "会员生日关怀",
      "couponId": "CP014",
      "couponName": "生日月 8 折券",
      "audiences": ["价格敏感", "沉默会员"],
      "planned": 6000,
      "claimed": 4399,
      "validFrom": "2026-10-09",
      "validTo": "2026-10-28",
      "status": "ended",
      "createdAt": "2026-10-06 12:40:00"
    }
  ],
  "total": 20,
  "page": 1,
  "pageSize": 10
}
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 发券任务 ID，`CP` + 3 位序号（`CP001` ~） |
| name | string | 任务名称 |
| couponId | string | 发放卡券 ID，引用资产模块卡券（`GET /api/v1/coupons/options` 的 `id`）；写入时使用该字段 |
| couponName | string | **只读冗余**卡券名称，后端按 `couponId` join 卡券表返回（不参与写入） |
| audiences | string[] | 发放人群标签名称列表，≥ 1，取值来自 `GET /api/v1/marketing/audience-tags`；标签须存在于会员标签管理（`GET /api/v1/member-tags`）且 `status=enabled`；中长期建议扩展 `tagIds` + 冗余 `tagNames`（本期按名称） |
| planned | number | 计划发放数量（张） |
| claimed | number | 已领取数量（张），由后端累计，`claimed ≤ planned` |
| validFrom | string | 券有效期开始日 `YYYY-MM-DD` |
| validTo | string | 券有效期结束日 `YYYY-MM-DD` |
| status | string | 任务状态，见 3.2 |
| createdAt | string | 创建时间 |

- **业务规则 / 错误**：
  - 列表默认按 `createdAt` 倒序（新增置顶）。
  - 「领取率」为前端派生字段，不返回、不落库（见 3.10）。
  - `X-Store-Id` 存在时按门店数据权限过滤（发券任务 Mock 未隔离门店，真实实现需确认是否按门店维度）。
  - **错误**：`40001`、`40100`、`40300`、`50000`。

#### POST /api/v1/marketing/coupon-tasks　|　PUT /api/v1/marketing/coupon-tasks/{id}

- **说明**：新增 / 编辑发券任务。前端 `saveCouponTask` 为 upsert；**新建任务固定 `status=running`、`claimed=0`**。
- **前端来源**：`src/services/marketing.ts` → `saveCouponTask()`；页面「新建发券任务 / 编辑发券任务」抽屉
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 否 | 任务 ID；`PUT` 时优先取路径参数 |
| name | string | 是 | 任务名称，≤ 30 字 |
| couponId | string | 是 | 发放卡券 ID，须存在于资产卡券（`GET /api/v1/coupons/options` 的 `id`）且可发放；响应中另附只读 `couponName` |
| audiences | string[] | 是 | 发放人群标签，≥ 1 个、去重；须存在于会员标签（`GET /api/v1/member-tags`，`status=enabled`） |
| planned | number | 是 | 计划发放数量，整数 `1 ~ 100000` |
| validFrom | string | 是 | 券有效期开始日 `YYYY-MM-DD` |
| validTo | string | 是 | 券有效期结束日 `YYYY-MM-DD`，不得早于 `validFrom` |

- **入参示例**：

```json
{
  "name": "双十二新客拉新",
  "couponId": "CP001",
  "audiences": ["新客", "学生客群"],
  "planned": 5000,
  "validFrom": "2026-12-01",
  "validTo": "2026-12-12"
}
```

- **出参（data）**：保存后的任务对象。`POST` 示例（Mock 生成 `CP021`）：

```json
{
  "id": "CP021",
  "name": "双十二新客拉新",
  "couponId": "CP001",
  "couponName": "新客立减券",
  "audiences": ["新客", "学生客群"],
  "planned": 5000,
  "claimed": 0,
  "validFrom": "2026-12-01",
  "validTo": "2026-12-12",
  "status": "running",
  "createdAt": "2026-11-04 09:30:00"
}
```

- **业务规则 / 错误**：
  - `PUT` 时任务不存在 → `40400`「发券任务不存在」。
  - 编辑只改名称、券、人群、计划数量、有效期；`claimed`、`status`、`createdAt` 不接受前端修改（Mock 忽略这些字段）。
  - `couponName` 由后端按 `couponId` join 卡券表返回，前端只提交 `couponId`；发券任务 ID 与卡券 ID 是两套独立编号（Mock 中都以 `CP` 开头属巧合，真实实现建议区分前缀）。
  - 编辑已结束任务不重置 `claimed`；建议任务开始发放后禁止修改 `couponId` / `planned`（Mock 未校验，真实实现需补）。
  - **错误**：`40001`（名称超长、人群为空、数量越界、日期倒挂、券 / 人群标签不存在）、`40100`、`40300`、`40400`、`50000`。

#### DELETE /api/v1/marketing/coupon-tasks/{id}

- **说明**：删除发券任务。
- **前端来源**：`src/services/marketing.ts` → `removeCouponTask()`
- **入参**：路径参数 `id`。
- **出参（data）**：`null`
- **业务规则 / 错误**：
  - 建议仅允许删除未开始发放（`claimed = 0`）的任务；已产生领取记录的任务应改为结束 / 暂停而不是删除（Mock 直接移除）。
  - 被自动化计划引用（`activityId`）时建议 `40900`。
  - 不存在时 Mock 静默返回；真实建议 `40400`。
  - **错误**：`40100`、`40300`、`40400`、`40900`、`50000`。

> **关于发券任务启停**：`marketing.ts` 未导出启停函数，页面也没有对应按钮（状态由后端维护）。如后续产品需要「暂停 / 继续发放」，可补充 `PATCH /api/v1/marketing/coupon-tasks/{id}/status`，Body 建议 `{ "status": "running" | "paused" }`；**本期契约不包含该接口**。

### 4.4 自动化计划

#### GET /api/v1/marketing/automation-plans

- **说明**：自动化营销计划分页列表，支持按计划名称模糊搜索、按渠道、按状态筛选。
- **前端来源**：`src/services/marketing.ts` → `fetchAutomationPlans()`；页面 `src/pages/Marketing/Automation/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 计划名称模糊匹配（包含） |
| channel | string | 否 | `sms` / `wechat` / `inbox`；`all` 或省略表示全部。**多选渠道的计划，只要 `channels` 包含该值即命中** |
| status | string | 否 | `enabled` / `paused`；`all` 或省略表示全部 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 10，最大 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "AT001",
      "name": "新客 24 小时欢迎计划",
      "activityId": "FR019",
      "activityName": "麻辣季满减",
      "activityType": "满减活动",
      "audiences": ["价格敏感", "亲子客群"],
      "triggerType": "scheduled",
      "triggerRule": "每周五 17:30",
      "channels": ["sms"],
      "notifyMethod": "template",
      "status": "paused",
      "createdAt": "2026-09-23 16:01:00"
    },
    {
      "id": "AT002",
      "name": "订单完成回访",
      "activityId": "FR017",
      "activityName": "感恩回馈满减",
      "activityType": "满减活动",
      "audiences": ["沉默会员", "生日本月", "新客"],
      "triggerType": "event",
      "triggerRule": "用户注册后 1 小时",
      "channels": ["wechat", "inbox"],
      "notifyMethod": "text",
      "status": "paused",
      "createdAt": "2026-10-26 16:26:00"
    }
  ],
  "total": 20,
  "page": 1,
  "pageSize": 10
}
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 自动化计划 ID，`AT` + 3 位序号（`AT001` ~） |
| name | string | 计划名称 |
| activityId | string | 关联活动 ID，可为 `FR` / `FD` / `CP` 前缀，来自 `GET /api/v1/marketing/activities/options` |
| activityName | string | 关联活动名称，**由后端按 `activityId` 反查填充** |
| activityType | string | 关联活动类型，中文枚举（`满减活动` / `满折活动` / `发券活动`），同上由后端反查 |
| audiences | string[] | 人群标签名称列表，≥ 1；须为会员标签管理中启用（`status=enabled`）的标签 |
| triggerType | string | 触发方式，见 3.5 |
| triggerRule | string | 触发时间 / 周期（`scheduled`）或事件描述（`event`），≤ 40 字 |
| channels | string[] | 触达渠道数组，≥ 1，见 3.3 |
| notifyMethod | string | 通知方式，见 3.4 |
| status | string | 计划状态，见 3.6 |
| createdAt | string | 创建时间 |

- **业务规则 / 错误**：
  - 渠道筛选按「任一命中」：`plan.channels` 包含查询的 `channel` 即返回。
  - 列表默认按 `createdAt` 倒序（新增置顶）。
  - `activityName` / `activityType` 不从请求写入，始终由 `activityId` 反查，避免前端传脏数据。
  - **错误**：`40001`（`channel` / `status` 非法）、`40100`、`40300`、`50000`。

#### POST /api/v1/marketing/automation-plans　|　PUT /api/v1/marketing/automation-plans/{id}

- **说明**：新增 / 编辑自动化营销计划。前端 `saveAutomationPlan` 为 upsert；**新建计划固定 `status=enabled`**。
- **前端来源**：`src/services/marketing.ts` → `saveAutomationPlan()`；页面「新建自动化计划 / 编辑自动化计划」抽屉
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 否 | 计划 ID；`PUT` 时优先取路径参数 |
| name | string | 是 | 计划名称，≤ 30 字 |
| activityId | string | 是 | 关联活动 ID，必须存在于活动选项（满减 / 满折 / 发券） |
| audiences | string[] | 是 | 人群标签，≥ 1 个、去重；须存在于会员标签（`GET /api/v1/member-tags`，`status=enabled`）；中长期建议 `tagIds` + 冗余 `tagNames`（本期按名称） |
| triggerType | string | 是 | `scheduled` / `event` |
| triggerRule | string | 是 | 触发时间 / 周期或事件描述，≤ 40 字；`scheduled` 建议 `每天 10:00`、`每周五 17:30`、`每月 1 日 10:00` 等格式，`event` 建议 `用户完成订单后 30 分钟` 等描述 |
| channels | string[] | 是 | 触达渠道，≥ 1 个、去重，取 3.3 枚举 |
| notifyMethod | string | 是 | 通知方式，取 3.4 枚举 |

- **入参示例**：

```json
{
  "name": "新客 24 小时欢迎计划",
  "activityId": "FR019",
  "audiences": ["新客", "价格敏感"],
  "triggerType": "scheduled",
  "triggerRule": "每天 10:00",
  "channels": ["sms", "wechat"],
  "notifyMethod": "template"
}
```

- **出参（data）**：保存后的计划对象。`POST` 示例（Mock 生成 `AT021`，`activityName` / `activityType` 由 `activityId` 反查）：

```json
{
  "id": "AT021",
  "name": "新客 24 小时欢迎计划",
  "activityId": "FR019",
  "activityName": "麻辣季满减",
  "activityType": "满减活动",
  "audiences": ["新客", "价格敏感"],
  "triggerType": "scheduled",
  "triggerRule": "每天 10:00",
  "channels": ["sms", "wechat"],
  "notifyMethod": "template",
  "status": "enabled",
  "createdAt": "2026-11-04 09:30:00"
}
```

- **业务规则 / 错误**：
  - `activityId` 不存在 → `40001` 或 `40400`「关联活动不存在」（Mock 抛出该错误）；`activityName` / `activityType` 由后端填充，不信任前端传值。
  - `PUT` 时计划不存在 → `40400`「自动化计划不存在」。
  - 编辑不改变 `status` 与 `createdAt`（Mock 保持原值）。
  - **错误**：`40001`（名称超长、活动 / 人群 / 渠道为空、触发规则超长、枚举非法）、`40100`、`40300`、`40400`、`50000`。

#### PATCH /api/v1/marketing/automation-plans/{id}/status

- **说明**：自动化计划启用 / 暂停。
- **前端来源**：`src/services/marketing.ts` → `updateAutomationStatus()`
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| enabled | boolean | 是 | `true` → `status=enabled`；`false` → `status=paused` |

```json
{ "enabled": true }
```

- **出参（data）**：`null`
- **业务规则 / 错误**：
  - 状态映射：`enabled=true` → `enabled`（启用中），`enabled=false` → `paused`（已暂停）。
  - 计划不存在：Mock 静默返回；真实建议 `40400`。
  - **错误**：`40001`、`40100`、`40300`、`40400`、`50000`。

#### DELETE /api/v1/marketing/automation-plans/{id}

- **说明**：删除自动化计划。
- **前端来源**：`src/services/marketing.ts` → `removeAutomationPlan()`
- **入参**：路径参数 `id`。
- **出参（data）**：`null`
- **业务规则 / 错误**：
  - 建议仅允许删除已暂停计划；执行中的计划应先暂停再删除（Mock 直接移除）。
  - 不存在时 Mock 静默返回；真实建议 `40400`。
  - **错误**：`40100`、`40300`、`40400`、`50000`。

### 4.5 消息通知

#### GET /api/v1/marketing/notification-templates

- **说明**：消息通知模板分页列表，支持按模板名称模糊搜索、按渠道、按状态筛选。
- **前端来源**：`src/services/marketing.ts` → `fetchNotificationTemplates()`；页面 `src/pages/Marketing/Notifications/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 模板名称模糊匹配（包含） |
| channel | string | 否 | `sms` / `wechat` / `inbox`；`all` 或省略表示全部（单值精确匹配） |
| status | string | 否 | `enabled` / `disabled`；`all` 或省略表示全部 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 10，最大 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "NT001",
      "name": "活动开始提醒",
      "scene": "activityStart",
      "channel": "wechat",
      "notifyMethod": "template",
      "content": "您好，{活动名称} 报名成功，活动期间到店消费满 129 元即可享受满减，详情可咨询门店服务员。",
      "summary": "您好，{活动名称} 报名成功，活动期间到店消费满 129 元即可享受…",
      "sendCount": 62642,
      "status": "enabled",
      "updatedAt": "2026-10-17 13:49:00"
    },
    {
      "id": "NT003",
      "name": "新券到账通知",
      "scene": "couponArrived",
      "channel": "wechat",
      "notifyMethod": "template",
      "content": "亲爱的{会员昵称}，{券名称} 已放入您的卡券包，消费满 100 元即可使用，本券不与其他优惠同享。",
      "summary": "亲爱的{会员昵称}，{券名称} 已放入您的卡券包，消费满 100 元…",
      "sendCount": 36490,
      "status": "enabled",
      "updatedAt": "2026-11-04 16:38:00"
    }
  ],
  "total": 22,
  "page": 1,
  "pageSize": 10
}
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 通知模板 ID，`NT` + 3 位序号（`NT001` ~） |
| name | string | 模板名称 |
| scene | string | 通知场景，见 3.7 |
| channel | string | 渠道，见 3.3（单值） |
| notifyMethod | string | 通知方式，见 3.4 |
| content | string | 通知正文，支持 `{变量}` 占位符，≤ 200 字 |
| summary | string | 内容摘要，由后端生成：`content.length > 34 ? content.slice(0, 34) + '…' : content` |
| sendCount | number | 累计发送量（条） |
| status | string | 模板状态，见 3.8 |
| updatedAt | string | 最近更新时间 |

- **业务规则 / 错误**：
  - 列表默认按 `updatedAt` 或 `createdAt` 倒序（Mock 为固定种子顺序，新增置顶；建议后端按 `updatedAt` 倒序）。
  - 渠道筛选为单值精确匹配（与自动化计划的「任一命中」不同）。
  - **错误**：`40001`、`40100`、`40300`、`50000`。

#### POST /api/v1/marketing/notification-templates　|　PUT /api/v1/marketing/notification-templates/{id}

- **说明**：新增 / 编辑消息通知模板。前端 `saveNotificationTemplate` 为 upsert；**新建模板固定 `status=enabled`、`sendCount=0`**，`summary` 与 `updatedAt` 由后端生成。
- **前端来源**：`src/services/marketing.ts` → `saveNotificationTemplate()`；页面「新建通知模板 / 编辑通知模板」抽屉
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 否 | 模板 ID；`PUT` 时优先取路径参数 |
| name | string | 是 | 模板名称，≤ 30 字 |
| scene | string | 是 | 通知场景，取 3.7 枚举 |
| channel | string | 是 | 渠道，取 3.3 枚举（单值） |
| notifyMethod | string | 是 | 通知方式，取 3.4 枚举 |
| content | string | 是 | 通知正文，≤ 200 字；支持占位符 `{会员昵称}`、`{券名称}`、`{订单号}` 等（见 3.7） |

- **入参示例**：

```json
{
  "name": "新券到账通知",
  "scene": "couponArrived",
  "channel": "wechat",
  "notifyMethod": "template",
  "content": "【比萨】您有一张「{券名称}」已到账，有效期至 {失效时间}，可在门店消费时出示核销，逾期作废。"
}
```

- **出参（data）**：保存后的模板对象。`POST` 示例（Mock 生成 `NT023`）：

```json
{
  "id": "NT023",
  "name": "新券到账通知",
  "scene": "couponArrived",
  "channel": "wechat",
  "notifyMethod": "template",
  "content": "【比萨】您有一张「{券名称}」已到账，有效期至 {失效时间}，可在门店消费时出示核销，逾期作废。",
  "summary": "【比萨】您有一张「{券名称}」已到账，有效期至 {失效时间}，可在…",
  "sendCount": 0,
  "status": "enabled",
  "updatedAt": "2026-11-04 09:30:00"
}
```

- **业务规则 / 错误**：
  - `summary` 由后端按 3.10 规则生成（新增、编辑均刷新），前端不传。
  - `sendCount` 仅由发送任务累加，保存接口不接受修改。
  - 新增 / 编辑均刷新 `updatedAt` 为服务器当前时间；`createdAt` 不返回、不落库（Mock 无该字段）。
  - 建议校验占位符与场景匹配（按 3.7 白名单），避免发送时变量缺失；Mock 未校验。
  - `PUT` 时模板不存在 → `40400`「通知模板不存在」。
  - **错误**：`40001`（名称 / 内容超长、枚举非法、内容为空）、`40100`、`40300`、`40400`、`50000`。

#### PATCH /api/v1/marketing/notification-templates/{id}/status

- **说明**：通知模板启用 / 停用。
- **前端来源**：`src/services/marketing.ts` → `updateNotificationStatus()`
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| enabled | boolean | 是 | `true` → `status=enabled`；`false` → `status=disabled` |

```json
{ "enabled": false }
```

- **出参（data）**：`null`
- **业务规则 / 错误**：
  - 停用模板不参与发送任务，历史 `sendCount` 保留。
  - 模板不存在：Mock 静默返回；真实建议 `40400`。
  - **错误**：`40001`、`40100`、`40300`、`40400`、`50000`。

#### DELETE /api/v1/marketing/notification-templates/{id}

- **说明**：删除通知模板。
- **前端来源**：`src/services/marketing.ts` → `removeNotificationTemplate()`
- **入参**：路径参数 `id`。
- **出参（data）**：`null`
- **业务规则 / 错误**：
  - 建议软删除；如后续被发送任务引用，应禁止删除或改为停用（Mock 无引用校验，直接移除）。
  - 不存在时 Mock 静默返回；真实建议 `40400`。
  - **错误**：`40100`、`40300`、`40400`、`40900`、`50000`。

### 4.6 下拉选项接口

> 4 个选项接口均无入参、不分页，返回全量选项；页面加载时调用一次。其中门店 / 卡券为跨模块公共接口（见 README「跨模块公共接口与引用约定」），选项数据变化频率低，建议后端加缓存。

#### GET /api/v1/coupons/options

- **说明**：发券任务「发放券」下拉选项（**公共接口**，与资产模块券包表单共用，结构以 [04-assets.md](./04-assets.md) 为准）。
- **前端来源**：`src/services/marketing.ts` → `fetchCouponOptions()`（营销 `Coupon` 页）；资产模块 `src/services/assets.ts` → `fetchCouponOptions()`
- **入参（Query）**：无（建议后端支持 `?status=active` 只返回可发行券；当前 Mock 返回全部 24 张，含已结束 / 已停用券）
- **出参（data）**：`Array<{ id: string; name: string; type: string }>`，Mock 共 24 张卡券（示例仅列 3 条）。

```json
[
  { "id": "CP001", "name": "新客立减券", "type": "cash" },
  { "id": "CP002", "name": "满 100 减 20 券", "type": "cash" },
  { "id": "CP003", "name": "满 200 减 50 券", "type": "cash" }
]
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 卡券编号（如 `CP001`），作为下拉 `value` 与发券任务的 `couponId` |
| name | string | 卡券名称，前端展示为「名称（类型中文）」 |
| type | string | 卡券类型：`cash` 代金券 / `discount` 折扣券 / `exchange` 兑换券（见 04-assets.md 3.1） |

- **业务规则 / 错误**：
  - `value` 使用卡券 `id` 写回发券任务的 `couponId`，`couponName` 由后端 join 返回；营销前端不再单独维护券名称池。
  - 顺序：同卡券列表顺序（Mock）；建议后端按 `id` 升序保证下拉稳定。
  - 本期返回全部状态卡券（Mock 行为）；发券任务应尽量只选可发行券，建议后端支持 `?status=active` 并与前端同步。
  - **错误**：`40100`、`40300`、`50000`。

#### GET /api/v1/marketing/audience-tags

- **说明**：人群标签选项（发券任务、自动化计划共用）。
- **前端来源**：`src/services/marketing.ts` → `fetchAudienceTags()`；页面 `src/pages/Marketing/Coupon/index.tsx`、`src/pages/Marketing/Automation/index.tsx`
- **入参**：无
- **出参（data）**：`string[]`，Mock 共 12 项。

```json
[
  "全部会员",
  "新客",
  "高频到店",
  "沉默会员",
  "价格敏感",
  "外卖偏好",
  "周末消费",
  "生日本月",
  "亲子客群",
  "学生客群",
  "企业客户",
  "金卡会员"
]
```

- **业务规则 / 错误**：
  - 返回的是**标签名称数组**（不是 `{label,value}` 对象），与会员模块标签管理同源；按 README「跨模块公共接口与引用约定」，后端应以 `GET /api/v1/member-tags?status=enabled` 为数据源，只返回启用标签。
  - 发券任务 / 自动化计划的 `audiences` 按名称引用标签，标签须存在且启用；中长期建议扩展为 `tagIds` + 冗余 `tagNames`（本期按名称即可，不强制改）。
  - **错误**：`40100`、`40300`、`50000`。

#### GET /api/v1/stores/options

- **说明**：营销活动「适用门店」下拉选项（**公共接口**，与 [01-dashboard.md](./01-dashboard.md) 顶栏门店切换、[05-business.md](./05-business.md) 菜单/配送表单完全一致）。
- **前端来源**：`src/services/marketing.ts` → `fetchStoreOptions()`；同源接口也用于 `src/services/dashboard.ts` / `src/services/business.ts`
- **入参**：无
- **出参（data）**：`Array<{ label: string; value: string }>`，Mock 共 12 家门店，`label` 为门店名称、`value` 为门店 ID。

```json
[
  { "label": "上海静安店", "value": "ST001" },
  { "label": "上海徐汇店", "value": "ST002" },
  { "label": "北京朝阳店", "value": "ST003" }
]
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| label | string | 门店名称（展示用） |
| value | string | 门店 ID（如 `ST001`），作为活动 `storeIds` 的取值 |

- **业务规则 / 错误**：
  - 返回全部门店（Mock 包含筹备中 / 停业门店，营销活动允许提前配置）；按用户数据权限过滤（总部看全部、店长只看本店）。
  - `value` 与订单、配送规则等接口中的 `storeId` 一致；营销活动通过 `storeIds` 引用门店，列表返回时附加只读 `storeNames`。
  - **`ALL_STORES_COUNT` 即本接口返回数组长度**（Mock 为 12），前端用 `storeIds.length >= ALL_STORES_COUNT` 判断展示「全部门店」。新增 / 关闭门店后前端需重新拉取选项。
  - **错误**：`40100`、`40300`、`50000`。

#### GET /api/v1/marketing/activities/options

- **说明**：自动化营销计划「关联活动」下拉选项，聚合满减 / 满折 / 发券三类活动。
- **前端来源**：`src/services/marketing.ts` → `fetchActivityOptions()`；页面 `src/pages/Marketing/Automation/index.tsx`
- **入参**：无
- **出参（data）**：`MarketingActivityOption[]`，Mock 共 64 项（满减 24 + 满折 20 + 发券 20），字段 `value` / `label` / `activityType`。

```json
[
  { "value": "FR001", "label": "国庆满减狂欢", "activityType": "满减活动" },
  { "value": "FD001", "label": "中秋满折特惠", "activityType": "满折活动" },
  { "value": "CP001", "label": "双十一新客拉新", "activityType": "发券活动" }
]
```

> 上例仅示意 3 条结构与字段，实际返回 64 条（按满减 → 满折 → 发券分组排列）。

- **业务规则 / 错误**：
  - 排序：满减活动 → 满折活动 → 发券活动，组内按活动 ID 升序（Mock 顺序）；前端用 `label` 搜索、`value` 作为 `activityId` 提交。
  - `activityType` 为中文枚举（见 3.9），前端直接展示，不参与搜索。
  - Mock 返回全部活动（含已结束 / 停用）；如后端过滤不可用活动，需同步告知前端（当前前端不做二次过滤）。
  - **错误**：`40100`、`40300`、`50000`。

## 五、覆盖自检

### 5.1 导出函数覆盖（23 / 23）

- [x] `fetchFullReductions` → `GET /api/v1/marketing/full-reductions`
- [x] `saveFullReduction` → `POST /api/v1/marketing/full-reductions`、`PUT /api/v1/marketing/full-reductions/{id}`
- [x] `updateFullReductionStatus` → `PATCH /api/v1/marketing/full-reductions/{id}/status`
- [x] `removeFullReduction` → `DELETE /api/v1/marketing/full-reductions/{id}`
- [x] `fetchFullDiscounts` → `GET /api/v1/marketing/full-discounts`
- [x] `saveFullDiscount` → `POST /api/v1/marketing/full-discounts`、`PUT /api/v1/marketing/full-discounts/{id}`
- [x] `updateFullDiscountStatus` → `PATCH /api/v1/marketing/full-discounts/{id}/status`
- [x] `removeFullDiscount` → `DELETE /api/v1/marketing/full-discounts/{id}`
- [x] `fetchCouponTasks` → `GET /api/v1/marketing/coupon-tasks`
- [x] `saveCouponTask` → `POST /api/v1/marketing/coupon-tasks`、`PUT /api/v1/marketing/coupon-tasks/{id}`
- [x] `removeCouponTask` → `DELETE /api/v1/marketing/coupon-tasks/{id}`
- [x] `fetchAutomationPlans` → `GET /api/v1/marketing/automation-plans`
- [x] `saveAutomationPlan` → `POST /api/v1/marketing/automation-plans`、`PUT /api/v1/marketing/automation-plans/{id}`
- [x] `updateAutomationStatus` → `PATCH /api/v1/marketing/automation-plans/{id}/status`
- [x] `removeAutomationPlan` → `DELETE /api/v1/marketing/automation-plans/{id}`
- [x] `fetchNotificationTemplates` → `GET /api/v1/marketing/notification-templates`
- [x] `saveNotificationTemplate` → `POST /api/v1/marketing/notification-templates`、`PUT /api/v1/marketing/notification-templates/{id}`
- [x] `updateNotificationStatus` → `PATCH /api/v1/marketing/notification-templates/{id}/status`
- [x] `removeNotificationTemplate` → `DELETE /api/v1/marketing/notification-templates/{id}`
- [x] `fetchCouponOptions` → `GET /api/v1/coupons/options`（公共接口，与资产模块共用）
- [x] `fetchAudienceTags` → `GET /api/v1/marketing/audience-tags`
- [x] `fetchStoreOptions` → `GET /api/v1/stores/options`（公共接口，与看板 / 业务模块共用）
- [x] `fetchActivityOptions` → `GET /api/v1/marketing/activities/options`

### 5.2 其他导出覆盖

- [x] `ALL_STORES_COUNT` → 无 HTTP 接口；由 `GET /api/v1/stores/options` 返回数组长度推导（Mock = 12），已见 1.2 / 4.6
- [x] `activityStatusMeta` / `couponStatusMeta` / `automationStatusMeta` / `notificationStatusMeta` → 已写入 3.1 / 3.2 / 3.6 / 3.8
- [x] `marketingChannelMeta` / `notifyMethodMeta` / `triggerTypeMeta` / `notificationSceneMeta` → 已写入 3.3 / 3.4 / 3.5 / 3.7
- [x] 17 个类型 + 9 个请求参数接口（`ActivityQuery`、`ReductionInput`、`DiscountInput`、`CouponTaskQuery`、`CouponTaskInput`、`AutomationQuery`、`AutomationInput`、`NotificationQuery`、`NotificationInput`）→ 已对应到各接口 Query / Body 与出参字段表

### 5.3 验收核对

- [x] 覆盖 `marketing.ts` 全部 23 个导出函数，逐一映射到 HTTP 接口
- [x] 5 个分页列表接口（满减 / 满折 / 发券 / 自动化 / 通知）均返回 `{ list, total, page, pageSize }`
- [x] 4 个启停接口（满减 / 满折 / 自动化 / 通知）均为 `PATCH /{id}/status`
- [x] 4 个删除接口均为 `DELETE /{id}`，返回 `data: null`
- [x] 门店统一「ID + 冗余名称」：写入 `storeIds`，返回 `storeIds` + 只读 `storeNames`；卡券统一写入 `couponId`，返回 `couponId` + 只读 `couponName`
- [x] 门店 / 卡券下拉复用公共接口 `GET /api/v1/stores/options`、`GET /api/v1/coupons/options`，不再有营销专属门店 / 券选项接口
- [x] 时间字段统一 `YYYY-MM-DD HH:mm:ss`（券有效期等纯日期字段为 `YYYY-MM-DD`）
- [x] 金额单位为元；满折折扣按营销规则为 `0 < discount < 10`（`8.5` = 8.5 折，不允许 10 折，与 README「`10` 表示不打折」的通用约定一致）
- [x] 枚举使用 Mock 真实取值（`notStarted` / `running` / `ended` / `disabled` 等），示例 ID 使用真实数据（`FR001`、`FD001`、`CP001`、`AT001`、`NT001`）
- [x] 所有接口均标注前端来源、入参、出参 JSON 示例与业务规则 / 错误码
