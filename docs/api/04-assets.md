# 资产模块 · 接口契约

- **模块**：资产（`/assets`）
- **页面（3 个）**：卡券管理 `/assets/cards`、积分管理 `/assets/points`、券包管理 `/assets/packages`
- **前端 service**：`src/services/assets.ts`（页面唯一数据入口）
- **Mock 数据**：`src/mock/assets.ts`（卡券 24 张、积分规则 10 条、积分流水 40 条、券包 18 个）
- **接口数量**：16 个 HTTP 接口，覆盖 `assets.ts` 全部 **13 个导出函数**（`saveCoupon` / `savePointRule` / `savePackage` 三个 upsert 函数在 REST 契约中各拆为「新增 `POST` + 编辑 `PUT /{id}`」两个接口）

> 通用约定（Base URL `/api/v1`、统一响应包裹、分页结构 `{list,total,page,pageSize}`、字段类型、错误码、REST 命名）见 [README.md](./README.md)。
> 本文档所有「出参」只展示响应包裹中的 `data` 字段，外层 `{ code, message, data }` 由前端 request 层统一解包。
> **演示时钟**：前端 Mock 以 `MOCK_TODAY = 2026-11-04`、`MOCK_NOW = 2026-11-04 18:30` 作为「今天 / 当前时间」，文中日期示例均基于该时钟；真实接口以服务端时间为准。
> **时间精度**：Mock 时间字段为 `YYYY-MM-DD HH:mm`（无秒），本契约统一为 `YYYY-MM-DD HH:mm:ss`；为便于与前端 Mock 对照，示例保留 Mock 原值，后端返回需补秒（如 `2026-11-02 10:20:00`）。

## 一、模块概览

### 1.1 页面与数据量

| 页面 | 路由 | 使用接口 | Mock 数据量 |
| --- | --- | --- | --- |
| 卡券管理 | `/assets/cards` | `fetchCardStats`、`fetchCoupons`、`saveCoupon`、`updateCouponStatus`、`removeCoupon` | 卡券 24 张（进行中 14 / 已结束 6 / 已停用 4；代金券 9 / 折扣券 10 / 兑换券 5） |
| 积分管理 | `/assets/points` | `fetchPointOverview`、`fetchPointRules`、`savePointRule`、`fetchPointRecords` | 积分规则 10 条（启用 7 / 停用 3）、积分流水 40 条（获得 19 / 消耗 16 / 过期 5） |
| 券包管理 | `/assets/packages` | `fetchPackages`、`savePackage`、`removePackage`、`fetchCouponOptions` | 券包 18 个（进行中 11 / 已结束 4 / 已停用 3） |

### 1.2 通用说明

- **请求头**：`Authorization: Bearer <access_token>` 必传；`X-Store-Id` 可选（卡券/积分/券包均为总部级资产，当前 Mock 不做门店隔离，暂不参与过滤）。
- **分页默认值**：`page = 1`、`pageSize = 10`，`pageSize` 上限 100；`total` 为「过滤后」的总条数。
- **筛选「全部」约定**：类型/状态类筛选项传 `all` 或省略该参数，表示不过滤（前端下拉默认值即 `all`）。
- **金额与折扣**：金额单位「元」（`number`）；卡券 `value` 在 `type=discount` 时为折扣（`8.5` = 8.5 折），其余类型为面额（元）。
- **只读统计字段**：卡券的 `claimed` / `used`、券包的 `claimed`、积分概览全部字段由后端统计维护，前端不提交。

## 二、前端函数 → HTTP 接口映射

| 前端函数 | 用途 | Method | Path |
| --- | --- | --- | --- |
| `fetchCardStats()` | 卡券 KPI 统计（总发行/已领取/已核销/核销率） | `GET` | `/api/v1/coupons/stats` |
| `fetchCoupons(query)` | 卡券列表（关键词 / 类型 / 状态 / 分页） | `GET` | `/api/v1/coupons` |
| `saveCoupon(input)` | 新增卡券（入参无 `id`） | `POST` | `/api/v1/coupons` |
| `saveCoupon(input)` | 编辑卡券（入参含 `id`） | `PUT` | `/api/v1/coupons/{id}` |
| `updateCouponStatus(id, status)` | 卡券状态变更（当前页面用于「停用」） | `PATCH` | `/api/v1/coupons/{id}/status` |
| `removeCoupon(id)` | 删除卡券 | `DELETE` | `/api/v1/coupons/{id}` |
| `fetchPointOverview()` | 积分概览 KPI（累计发放/累计消耗/当前流通） | `GET` | `/api/v1/points/overview` |
| `fetchPointRules(query)` | 积分规则列表（关键词 / 场景 / 分页） | `GET` | `/api/v1/points/rules` |
| `savePointRule(input)` | 新增积分规则（入参无 `id`） | `POST` | `/api/v1/points/rules` |
| `savePointRule(input)` | 编辑积分规则（入参含 `id`） | `PUT` | `/api/v1/points/rules/{id}` |
| `fetchPointRecords(query)` | 积分流水列表（关键词 / 变动类型 / 分页） | `GET` | `/api/v1/points/records` |
| `fetchCouponOptions()` | 券包表单「包含券」多选下拉（券 id / 名称 / 类型） | `GET` | `/api/v1/coupons/options` |
| `fetchPackages(query)` | 券包列表（关键词 / 状态 / 分页） | `GET` | `/api/v1/coupon-packages` |
| `savePackage(input)` | 新增券包（入参无 `id`） | `POST` | `/api/v1/coupon-packages` |
| `savePackage(input)` | 编辑券包（入参含 `id`） | `PUT` | `/api/v1/coupon-packages/{id}` |
| `removePackage(id)` | 删除券包 | `DELETE` | `/api/v1/coupon-packages/{id}` |

> 注：`saveCoupon` / `savePointRule` / `savePackage` 在前端为 upsert（有 `id` 走编辑、无 `id` 走新增），后端按 `POST`（新增）/ `PUT /{id}`（编辑）实现即可，前端联调时按有无 `id` 选择请求方法与路径。
> 路径注册顺序要求：`/coupons/stats`、`/coupons/options` 需先于 `/coupons/{id}` 系列注册，避免被动态段吞掉。

## 三、枚举与状态字典

### 3.1 卡券类型（`CouponType`）

| 值 | 中文 | 前端 Tag 颜色 | 说明 |
| --- | --- | --- | --- |
| `cash` | 代金券 | `volcano` | `value` 为面额（元），满足 `threshold` 后抵扣 |
| `discount` | 折扣券 | `blue` | `value` 为折扣（`8.5` = 8.5 折，取值 1~9.9） |
| `exchange` | 兑换券 | `purple` | `value` 为可兑换商品标价（元），`threshold=0` 表示无门槛 |

### 3.2 资产状态（`AssetStatus`，卡券与券包通用）

| 值 | 中文 | 前端 Tag 颜色 | 卡券行为 | 券包行为 |
| --- | --- | --- | --- | --- |
| `active` | 进行中 | `green` | 可领取、可核销 | 可领取 |
| `ended` | 已结束 | `default` | 不可领取，仅可查询历史核销 | 不可领取 |
| `disabled` | 已停用 | `red` | 不可领取、不可核销 | 不可领取 |

状态流转（卡券）：

```
新增 ──> active ──(PATCH status=disabled，页面「停用」按钮)──> disabled ──(PATCH status=active，契约预留)──> active
             └──(有效期届满 validTo < 今天，后端定时任务)──> ended（建议终态，不可再启用）
```

- 新增卡券固定 `status = active`（`CouponInput` 不含 status）。
- Mock 中状态的来源：`disabled` 与 `ended` 为种子固定值，`active` 券的 `validTo` 均为演示当天 `2026-11-04`；真实后端需按有效期自动流转（见第五节）。
- 券包状态无独立状态接口，通过编辑接口（`PUT /coupon-packages/{id}`）提交 `status` 修改。

### 3.3 积分规则触发场景（`PointScene`）

| 值 | 中文 | 前端 Tag 颜色 | 说明 |
| --- | --- | --- | --- |
| `consume` | 消费 | `volcano` | 下单/支付后按规则发放 |
| `review` | 评价 | `blue` | 完成订单评价后发放 |
| `checkin` | 签到 | `cyan` | 每日签到发放 |
| `register` | 注册 | `purple` | 注册/完善资料发放 |

### 3.4 积分变动类型（`PointRecordType`）

| 值 | 中文 | 前端 Tag 颜色 | 展示符号 | 说明 |
| --- | --- | --- | --- | --- |
| `earn` | 获得 | `green` | `+` | 消费、评价、签到、注册等场景发放 |
| `spend` | 消耗 | `orange` | `-` | 积分抵现、积分商城兑换 |
| `expire` | 过期 | `default` | `-` | 积分批次到期清零，由定时任务写入 |

> 流水中 `points` 恒为正数，增减方向由 `type` 决定；前端按 `type` 拼 `+` / `-` 展示。

### 3.5 校验字典（前端表单约束，后端需一致）

| 字段 | 约束 |
| --- | --- |
| 卡券 `name` / 券包 `name` / 积分规则 `name` | 必填，≤30 字；建议按业务唯一（Mock 未校验） |
| 卡券 `value` | `type=discount` 时 1~9.9（1 位小数）；`type=cash/exchange` 时 1~1000 的整数元 |
| 卡券 `threshold` | 0~10000 的整数元，`0` 表示无门槛 |
| 卡券 `total` / 券包 `total` | 1~100000 的整数（发行量） |
| 卡券/券包 `validFrom`、`validTo` | `YYYY-MM-DD`，`validFrom ≤ validTo` |
| 积分规则 `points` | 1~10000 的整数 |
| 积分规则 `enabled` | `boolean`，前端单选「启用 / 停用」，新增默认 `true` |
| 券包 `couponIds` | 至少 1 个、元素为存在的卡券 id、包内不重复 |
| 券包 `status` | `active` / `ended` / `disabled`，必填 |

## 四、接口明细

### 4.1 卡券（`/coupons`）

#### GET /api/v1/coupons/stats

- **说明**：卡券管理页顶部 4 个 KPI（总发行量、已领取、已核销、核销率），对全部卡券做聚合。
- **前端来源**：`src/services/assets.ts` → `fetchCardStats()`；页面 `src/pages/Assets/Cards/index.tsx`
- **入参（Query）**：无
- **出参（data）**：

```json
{
  "totalIssued": 70600,
  "totalClaimed": 40407,
  "totalUsed": 22759,
  "redeemRate": 56.3
}
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| totalIssued | number | 总发行量（张）= 所有卡券 `total` 之和 |
| totalClaimed | number | 已领取（张）= 所有卡券 `claimed` 之和 |
| totalUsed | number | 已核销（张）= 所有卡券 `used` 之和 |
| redeemRate | number | 核销率（%）= `totalUsed / totalClaimed × 100`，保留 1 位小数；`totalClaimed = 0` 时返回 `0` |

- **业务规则**：
  - 统计口径为「全量卡券」，与列表页的筛选条件无关（前端刷新时与列表并行请求）。
  - 与列表接口共用同一数据源，需保证 KPI 与列表数据一致。
  - 为高频聚合接口，建议缓存 30~60 秒。
- **错误**：`40300` 无权限、`50000` 服务端异常

#### GET /api/v1/coupons

- **说明**：卡券列表，支持按券名称/编号关键词、券类型、状态筛选，分页返回。
- **前端来源**：`src/services/assets.ts` → `fetchCoupons()`；页面 `src/pages/Assets/Cards/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 关键词：券名称模糊匹配，或券编号（`CP001`）忽略大小写模糊匹配 |
| type | string | 否 | `cash` / `discount` / `exchange` / `all`，默认 `all` |
| status | string | 否 | `active` / `ended` / `disabled` / `all`，默认 `all` |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 10，上限 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "CP001",
      "name": "新客立减券",
      "type": "cash",
      "value": 10,
      "threshold": 30,
      "validFrom": "2026-09-01",
      "validTo": "2026-11-04",
      "total": 3000,
      "claimed": 2463,
      "used": 1171,
      "status": "active"
    },
    {
      "id": "CP004",
      "name": "周末堂食 9 折券",
      "type": "discount",
      "value": 9,
      "threshold": 80,
      "validFrom": "2026-09-22",
      "validTo": "2026-11-04",
      "total": 1500,
      "claimed": 608,
      "used": 303,
      "status": "active"
    },
    {
      "id": "CP015",
      "name": "夜宵满 120 减 30 券",
      "type": "cash",
      "value": 30,
      "threshold": 120,
      "validFrom": "2026-10-10",
      "validTo": "2026-10-31",
      "total": 1000,
      "claimed": 803,
      "used": 610,
      "status": "ended"
    }
  ],
  "total": 24,
  "page": 1,
  "pageSize": 10
}
```

> 示例仅列 3 条；`total` 为过滤后的总条数（无筛选时为 24）。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 卡券编号，`CP` + 3 位序号，如 `CP001` |
| name | string | 券名称 |
| type | string | 券类型，见 3.1 |
| value | number | `cash` = 面额（元）；`discount` = 折扣（`8.5` = 8.5 折）；`exchange` = 兑换商品标价（元） |
| threshold | number | 使用门槛（元），`0` = 无门槛 |
| validFrom / validTo | string | 有效期起止日 `YYYY-MM-DD`（闭区间） |
| total | number | 发行量（张） |
| claimed | number | 已领取（张），只读，由领取行为累加 |
| used | number | 已核销（张），只读，由核销行为累加 |
| status | string | 卡券状态，见 3.2 |

- **业务规则**：
  - 筛选：`type` / `status` 传 `all` 或省略表示不过滤；`keyword` 同时匹配 `name` 与 `id`。
  - 排序：Mock 保持数据数组顺序（新增卡券 `unshift` 置顶）；建议后端按创建时间倒序（需补 `createdAt` 字段）或 `id` 倒序。
  - 分页：`page` 超出范围时返回空 `list` 且 `total` 仍为过滤后总数（与 Mock 一致）。
  - 筛选示例：`GET /api/v1/coupons?keyword=满&type=cash&status=active&page=1&pageSize=10` → `total: 4`（`CP002`、`CP003`、`CP009`、`CP024`）。
  - 卡券为总部级资产，当前不做门店隔离；若后续支持「门店券」，需按请求头 `X-Store-Id` 过滤。
- **错误**：`40001` 参数校验失败（如 `type`/`status` 非法枚举、`pageSize > 100`）、`50000` 服务端异常

#### POST /api/v1/coupons　|　PUT /api/v1/coupons/{id}

- **说明**：新增 / 编辑卡券。前端 `saveCoupon(input)` 为 upsert：无 `id` 走新增，有 `id` 走编辑；对应后端 `POST /api/v1/coupons` 与 `PUT /api/v1/coupons/{id}`。
- **前端来源**：`src/services/assets.ts` → `saveCoupon()`；页面 `src/pages/Assets/Cards/index.tsx`（「新建卡券 / 编辑卡券」抽屉）
- **入参（Path，仅 PUT）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 卡券编号，如 `CP001` |

- **入参（Body，POST 与 PUT 相同）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 券名称，≤30 字 |
| type | string | 是 | `cash` / `discount` / `exchange` |
| value | number | 是 | `discount` 时 1~9.9（1 位小数）；否则 1~1000 的整数元 |
| threshold | number | 是 | 使用门槛（元），0~10000 整数，`0` = 无门槛 |
| validFrom | string | 是 | 有效期开始日 `YYYY-MM-DD` |
| validTo | string | 是 | 有效期结束日 `YYYY-MM-DD`，不得早于 `validFrom` |
| total | number | 是 | 发行量（张），1~100000 整数 |

- **出参（data）**：返回保存后的完整卡券对象（结构同列表项）。新增示例（Mock 中当前 24 张，按规则生成 `CP025`，`claimed = used = 0`、`status = active`）：

```json
{
  "id": "CP025",
  "name": "双十一满 100 减 30 券",
  "type": "cash",
  "value": 30,
  "threshold": 100,
  "validFrom": "2026-10-05",
  "validTo": "2026-11-04",
  "total": 2000,
  "claimed": 0,
  "used": 0,
  "status": "active"
}
```

  编辑示例（`PUT /api/v1/coupons/CP004`，仅把发行量从 1500 改为 2500，其余字段保持不变）：

```json
{
  "id": "CP004",
  "name": "周末堂食 9 折券",
  "type": "discount",
  "value": 9,
  "threshold": 80,
  "validFrom": "2026-09-22",
  "validTo": "2026-11-04",
  "total": 2500,
  "claimed": 608,
  "used": 303,
  "status": "active"
}
```

- **业务规则**：
  - 新增：`id` 由后端生成，`claimed = 0`、`used = 0`、`status = active`（入参不含状态）；`createdAt` 由后端记录。
  - 编辑：只更新 `name`、`type`、`value`、`threshold`、`validFrom`、`validTo`、`total`；**不修改** `claimed` / `used` / `status`（停用走 `PATCH /{id}/status`）。
  - 编辑时若把 `total` 改小于已有 `claimed`（发行量 < 已领取），应返回 `40001`（Mock 未校验，建议后端补）。
  - 已产生核销的卡券，建议限制对 `type` / `value` 的修改（需产品确认，否则返回 `40900`）。
  - `name` 建议在同一 `type` 下唯一（Mock 未校验），重复返回 `40900`。
  - Mock 生成 id 的规则为「`CP` + 当前卡券数 + 1」，删除后会与已有编号冲突；真实后端必须使用独立序列（见第五节）。
- **错误**：`40001` 参数校验失败（含 `value` 与 `type` 不匹配、`validTo < validFrom`、`total < claimed` 等）、`40400` 编辑时卡券不存在（Mock 抛「卡券不存在」）、`40900` 名称重复/状态冲突

#### PATCH /api/v1/coupons/{id}/status

- **说明**：卡券状态变更。当前页面仅有「停用」入口（`active → disabled`），契约按通用状态变更接口定义，也支持重新启用。
- **前端来源**：`src/services/assets.ts` → `updateCouponStatus()`；页面 `src/pages/Assets/Cards/index.tsx`
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 卡券编号，如 `CP001` |

- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| status | string | 是 | 目标状态：`active` / `ended` / `disabled`，语义见 3.2 |

- **出参（data）**：`null`
- **业务规则**：
  - 前端仅在 `status = active` 时展示可用的「停用」按钮（`disabled` / `ended` 券按钮置灰），因此 `active → disabled` 为当前主要链路。
  - 停用后不可领取、不可核销；已领取未使用的券建议仍可按原规则使用（需产品确认）。
  - 建议限制流转：`ended` 为终态不可再启用；`disabled → active` 仅在 `validTo ≥ 今天` 时允许，否则返回 `40900`。
  - 操作幂等：重复提交相同 `status` 直接返回成功。
  - `updatedAt` 由后端更新（当前契约不返回该字段）。
- **错误**：`40001` 非法状态值、`40400` 卡券不存在（Mock 抛「卡券不存在」）、`40900` 非法状态流转

#### DELETE /api/v1/coupons/{id}

- **说明**：删除卡券。
- **前端来源**：`src/services/assets.ts` → `removeCoupon()`；页面 `src/pages/Assets/Cards/index.tsx`（Popconfirm 二次确认，提示「删除后不可恢复」）
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 卡券编号，如 `CP001` |

- **出参（data）**：`null`
- **业务规则**：
  - Mock 为物理删除，且对不存在的 `id` 静默成功（幂等）；建议后端同样保持幂等（或返回 `40400`，需前端兼容）。
  - 已被券包引用（`coupon-packages.couponIds` 包含该券）时建议禁止删除并返回 `40900`，或先解除引用；Mock 未校验。
  - 已产生领取/核销记录的卡券建议禁止物理删除，改为停用（`disabled`），避免历史统计断档。
- **错误**：`40400` 卡券不存在（如后端选择严格语义）、`40900` 被券包引用/已有核销记录不可删除

### 4.2 积分（`/points`）

#### GET /api/v1/points/overview

- **说明**：积分管理页顶部 3 个 KPI（累计发放、累计消耗、当前流通）。
- **前端来源**：`src/services/assets.ts` → `fetchPointOverview()`；页面 `src/pages/Assets/Points/index.tsx`
- **入参（Query）**：无
- **出参（data）**：

```json
{
  "issued": 4708,
  "consumed": 1904,
  "circulating": 2487
}
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| issued | number | 累计发放积分 = 全部 `type = earn` 流水的 `points` 之和 |
| consumed | number | 累计消耗积分 = 全部 `type = spend` 流水的 `points` 之和 |
| circulating | number | 当前流通积分 = `issued - consumed - 过期积分之和`（过期 = `type = expire`，Mock 为 317） |

- **业务规则**：
  - 「过期」不单列 KPI，但必须计入流通积分扣减：`circulating = issued - consumed - Σ(expire.points)`。
  - 统计口径为全量流水（Mock 对 40 条流水求和），真实后端建议基于积分账户余额表统计，避免全表扫描。
  - 与积分流水接口共用数据源，需保证口径一致；建议缓存 30~60 秒。
- **错误**：`40300` 无权限、`50000` 服务端异常

#### GET /api/v1/points/rules

- **说明**：积分规则列表，支持按规则名称关键词、触发场景筛选，分页返回。
- **前端来源**：`src/services/assets.ts` → `fetchPointRules()`；页面 `src/pages/Assets/Points/index.tsx`（「积分规则」Tab）
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 规则名称模糊匹配 |
| scene | string | 否 | `consume` / `review` / `checkin` / `register`，省略表示全部（无 `all` 值） |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 10，上限 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "PR001",
      "name": "消费 1 元得 1 积分",
      "scene": "consume",
      "points": 1,
      "enabled": true,
      "updatedAt": "2026-11-02 10:20"
    },
    {
      "id": "PR002",
      "name": "消费满 50 元额外奖励",
      "scene": "consume",
      "points": 20,
      "enabled": true,
      "updatedAt": "2026-10-28 14:05"
    },
    {
      "id": "PR003",
      "name": "首次注册奖励",
      "scene": "register",
      "points": 100,
      "enabled": true,
      "updatedAt": "2026-09-10 09:30"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 10
}
```

> 示例仅列 3 条；无筛选时 `total = 10`。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 规则编号，`PR` + 3 位序号，如 `PR001` |
| name | string | 规则名称 |
| scene | string | 触发场景，见 3.3 |
| points | number | 单次触发发放/计算的积分值（正整数） |
| enabled | boolean | 是否启用；`true` 启用中、`false` 已停用 |
| updatedAt | string | 最后更新时间，后端写 |

- **业务规则**：
  - 排序：Mock 为种子数据顺序；建议后端按 `updatedAt` 倒序（最近修改的规则靠前）。
  - 积分规则无独立状态接口，启用/停用通过编辑接口提交 `enabled`（见 4.2 的 `PUT /points/rules/{id}`）。
  - 同场景规则可多条（如「消费 1 元得 1 积分」与「消费满 50 元额外奖励」），后端按业务叠加计算，需在规则说明中明确叠加/互斥关系。
- **错误**：`40001` 参数校验失败、`50000` 服务端异常

#### POST /api/v1/points/rules　|　PUT /api/v1/points/rules/{id}

- **说明**：新增 / 编辑积分规则。前端 `savePointRule(input)` 为 upsert：无 `id` 走新增，有 `id` 走编辑。
- **前端来源**：`src/services/assets.ts` → `savePointRule()`；页面 `src/pages/Assets/Points/index.tsx`（「新增规则 / 编辑规则」抽屉）
- **入参（Path，仅 PUT）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 规则编号，如 `PR001` |

- **入参（Body，POST 与 PUT 相同）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 规则名称，≤30 字 |
| scene | string | 是 | `consume` / `review` / `checkin` / `register` |
| points | number | 是 | 积分值，1~10000 的整数 |
| enabled | boolean | 是 | 是否启用，前端单选「启用 / 停用」，新增默认 `true` |

- **出参（data）**：返回保存后的规则对象（结构同列表项）。新增示例（Mock 中当前 10 条，按规则生成 `PR011`，`updatedAt` 为 `MOCK_NOW`）：

```json
{
  "id": "PR011",
  "name": "消费满 100 元奖励",
  "scene": "consume",
  "points": 30,
  "enabled": true,
  "updatedAt": "2026-11-04 18:30"
}
```

  编辑示例（`PUT /api/v1/points/rules/PR008`，把积分值改为 25 并停用）：

```json
{
  "id": "PR008",
  "name": "带图评价额外奖励",
  "scene": "review",
  "points": 25,
  "enabled": false,
  "updatedAt": "2026-11-04 18:30"
}
```

- **业务规则**：
  - 新增：`id` 由后端生成；`updatedAt` 由后端写为当前时间；`enabled` 默认 `true`。
  - 编辑：`updatedAt` 自动刷新；不修改历史流水。
  - 规则修改只影响后续触发，不回溯已发放积分。
  - Mock 生成 id 的规则为「`PR` + 当前规则数 + 1」，删除场景下可能重复；真实后端使用独立序列。
  - 建议 `name` 在 `scene` 内唯一（Mock 未校验），重复返回 `40900`。
- **错误**：`40001` 参数校验失败、`40400` 编辑时规则不存在（Mock 抛「积分规则不存在」）、`40900` 规则名称重复

#### GET /api/v1/points/records

- **说明**：积分流水列表（只读），支持按会员昵称/备注关键词、变动类型筛选，分页返回。
- **前端来源**：`src/services/assets.ts` → `fetchPointRecords()`；页面 `src/pages/Assets/Points/index.tsx`（「积分流水」Tab）
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 关键词：会员昵称模糊匹配，或流水备注模糊匹配 |
| type | string | 否 | `earn` / `spend` / `expire` / `all`，默认 `all` |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 10，上限 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "PT0002",
      "nickname": "老饕张",
      "type": "spend",
      "points": 132,
      "createdAt": "2026-10-29 19:57",
      "remark": "积分商城兑换周边"
    },
    {
      "id": "PT0011",
      "nickname": "吃遍街巷",
      "type": "earn",
      "points": 121,
      "createdAt": "2026-10-28 12:40",
      "remark": "首次注册奖励"
    },
    {
      "id": "PT0012",
      "nickname": "甜辣控",
      "type": "earn",
      "points": 180,
      "createdAt": "2026-10-27 16:37",
      "remark": "生日月双倍积分"
    }
  ],
  "total": 40,
  "page": 1,
  "pageSize": 10
}
```

> 示例仅列 3 条；无筛选时 `total = 40`。按 `type=earn` 筛选时 `total = 19`。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 流水编号，`PT` + 4 位序号，如 `PT0002` |
| nickname | string | 会员昵称（列表不展示手机号，脱敏由前端处理） |
| type | string | 变动类型，见 3.4 |
| points | number | 变动积分数，**恒为正数**；方向由 `type` 决定 |
| createdAt | string | 变动时间 |
| remark | string | 备注：获得/消耗/过期的业务原因文案 |

- **业务规则**：
  - 只读接口：Mock 与契约均不提供流水的增删改，流水由「下单/评价/签到/注册」业务事件、积分兑换与过期定时任务写入。
  - 排序：按 `createdAt` 倒序（Mock 已倒序）。
  - 关键词同时匹配 `nickname` 与 `remark`；`type` 传 `all` 或省略表示不过滤。
  - 流水需保留业务单据号（如订单号）以便对账，当前契约未包含该字段，后端可扩展 `bizNo`。
- **错误**：`40001` 参数校验失败、`50000` 服务端异常

### 4.3 券包（`/coupon-packages`）

#### GET /api/v1/coupon-packages

- **说明**：券包列表，支持按券包名称/编号关键词、状态筛选，分页返回。
- **前端来源**：`src/services/assets.ts` → `fetchPackages()`；页面 `src/pages/Assets/Packages/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 券包名称模糊匹配，或券包编号（`PG001`）忽略大小写模糊匹配 |
| status | string | 否 | `active` / `ended` / `disabled` / `all`，默认 `all` |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 10，上限 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "PG001",
      "name": "新客礼包",
      "couponIds": ["CP011", "CP014"],
      "validFrom": "2026-10-01",
      "validTo": "2026-11-04",
      "total": 2000,
      "claimed": 1584,
      "status": "active",
      "updatedAt": "2026-11-02 17:57"
    },
    {
      "id": "PG002",
      "name": "周末畅吃券包",
      "couponIds": ["CP005", "CP011", "CP014", "CP002"],
      "validFrom": "2026-10-12",
      "validTo": "2026-11-04",
      "total": 1000,
      "claimed": 471,
      "status": "active",
      "updatedAt": "2026-10-05 09:42"
    }
  ],
  "total": 18,
  "page": 1,
  "pageSize": 10
}
```

> 示例仅列 2 条；无筛选时 `total = 18`。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 券包编号，`PG` + 3 位序号，如 `PG001` |
| name | string | 券包名称 |
| couponIds | string[] | 包含的卡券编号列表（引用 `coupons.id`，至少 1 个、不重复）；前端用 `GET /coupons/options` 做 id→名称映射 |
| validFrom / validTo | string | 有效期起止日 `YYYY-MM-DD`（闭区间） |
| total | number | 发行量（份） |
| claimed | number | 已领取（份），只读 |
| status | string | 券包状态，见 3.2；无独立状态接口，走编辑接口修改 |
| updatedAt | string | 最后更新时间，后端写 |

- **业务规则**：
  - 排序：Mock 为种子数据顺序；建议后端按 `updatedAt` 倒序。
  - `couponIds` 仅返回编号，**不内联卡券详情**；页面通过一次性请求 `GET /coupons/options` 建立 `id → name` 映射后展示「共 N 张 + 前 2 个名称」。若后端希望列表直接可读，可扩展 `coupons: [{id,name,type}]` 字段（需前端同步改造）。
  - 券包状态与有效期相互独立：`active` 但已过 `validTo` 的券包应视为不可领取（Mock 中 active 券包 `validTo` = 演示当天）。
- **错误**：`40001` 参数校验失败、`50000` 服务端异常

#### POST /api/v1/coupon-packages　|　PUT /api/v1/coupon-packages/{id}

- **说明**：新增 / 编辑券包。前端 `savePackage(input)` 为 upsert：无 `id` 走新增，有 `id` 走编辑。
- **前端来源**：`src/services/assets.ts` → `savePackage()`；页面 `src/pages/Assets/Packages/index.tsx`（「新建券包 / 编辑券包」抽屉）
- **入参（Path，仅 PUT）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 券包编号，如 `PG001` |

- **入参（Body，POST 与 PUT 相同）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 券包名称，≤30 字 |
| couponIds | string[] | 是 | 包含券编号列表，至少 1 个、元素须存在且不重复（来源 `GET /coupons/options`） |
| validFrom | string | 是 | 有效期开始日 `YYYY-MM-DD` |
| validTo | string | 是 | 有效期结束日 `YYYY-MM-DD`，不得早于 `validFrom` |
| total | number | 是 | 发行量（份），1~100000 整数 |
| status | string | 是 | `active` / `ended` / `disabled` |

- **出参（data）**：返回保存后的完整券包对象（结构同列表项）。新增示例（Mock 中当前 18 个，按规则生成 `PG019`）：

```json
{
  "id": "PG019",
  "name": "双十一欢聚包",
  "couponIds": ["CP005", "CP014", "CP024"],
  "validFrom": "2026-10-20",
  "validTo": "2026-11-04",
  "total": 1500,
  "claimed": 0,
  "status": "active",
  "updatedAt": "2026-11-04 18:30"
}
```

  编辑示例（`PUT /api/v1/coupon-packages/PG001`，新增一张券 `CP024` 并把状态改为 `disabled`）：

```json
{
  "id": "PG001",
  "name": "新客礼包",
  "couponIds": ["CP011", "CP014", "CP024"],
  "validFrom": "2026-10-01",
  "validTo": "2026-11-04",
  "total": 2000,
  "claimed": 1584,
  "status": "disabled",
  "updatedAt": "2026-11-04 18:30"
}
```

- **业务规则**：
  - 新增：`id` 由后端生成，`claimed = 0`，`updatedAt` 由后端写；`status` 由表单提交（默认 `active`）。
  - 编辑：可修改 `name`、`couponIds`、有效期、`total`、`status`（**券包状态的唯一修改入口**，页面无独立启停按钮）；不改 `claimed`。
  - 引用校验：`couponIds` 中任一卡券不存在 → `40001`（或 `40400`）；重复 id / 空数组 → `40001`；Mock 未校验，后端必须补。
  - 建议限制：`couponIds` 只允许选择未结束、未停用的卡券；券包已产生领取（`claimed > 0`）后修改 `couponIds` 需版本化或禁止，避免已领取用户权益变化（需产品确认）。
  - Mock 生成 id 的规则为「`PG` + 当前券包数 + 1」，删除场景下可能重复；真实后端使用独立序列。
- **错误**：`40001` 参数校验失败（含卡券不存在、券重复、`validTo < validFrom`）、`40400` 编辑时券包不存在（Mock 抛「券包不存在」）、`40900` 名称重复/已发放券包不可改券

#### DELETE /api/v1/coupon-packages/{id}

- **说明**：删除券包。
- **前端来源**：`src/services/assets.ts` → `removePackage()`；页面 `src/pages/Assets/Packages/index.tsx`（Popconfirm 二次确认）
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 券包编号，如 `PG001` |

- **出参（data）**：`null`
- **业务规则**：
  - Mock 为物理删除，对不存在的 `id` 静默成功（幂等）；建议后端保持幂等或返回 `40400`。
  - 已产生领取记录的券包建议禁止删除，改为 `status = disabled`；否则历史领取数据会失去券包维度。
  - 删除券包不级联删除其引用的卡券。
- **错误**：`40400` 券包不存在（如后端选择严格语义）、`40900` 已发放券包不可删除

#### GET /api/v1/coupons/options

- **说明**：券包表单「包含券」多选下拉的数据源（券 id / 名称 / 类型），同时供列表页做 `couponIds → 券名称` 展示映射。
- **前端来源**：`src/services/assets.ts` → `fetchCouponOptions()`；页面 `src/pages/Assets/Packages/index.tsx`
- **入参（Query）**：无（建议后端可扩展 `?status=active` 只返回可发行券；当前 Mock 返回全部 24 张，含已结束/已停用券）
- **出参（data）**：

```json
[
  { "id": "CP001", "name": "新客立减券", "type": "cash" },
  { "id": "CP002", "name": "满 100 减 20 券", "type": "cash" },
  { "id": "CP003", "name": "满 200 减 50 券", "type": "cash" }
]
```

> 示例仅列前 3 条，当前 Mock 共返回 24 条。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 卡券编号，作为多选框 `value` |
| name | string | 卡券名称，前端展示为 `名称（类型中文）` |
| type | string | 卡券类型，见 3.1；前端用于拼接展示文案 |

- **业务规则**：
  - 不分页（数据量小，当前 24 张）；后端若券量增长可改为全量轻量字段即可。
  - 顺序：Mock 同卡券数组顺序；建议后端按 `id` 升序或名称排序，保证下拉稳定。
  - 返回全部状态卡券（Mock 行为）；若产品要求只能选择可发行券，后端加 `status=active` 过滤并同步前端。
- **错误**：`50000` 服务端异常

## 五、Mock 差异与后端待确认

| 项 | Mock 现状 | 后端实现要求 |
| --- | --- | --- |
| ID 生成 | 卡券/券包/规则 id = 前缀 + 「当前数组长度 + 1」（`CP025`、`PG019`、`PR011`） | 必须用独立序列，避免删除后编号重复；位数需支持扩容（>999） |
| 卡券状态 | `status` 为静态字段，`active` 券 `validTo` 均为演示当天 | 需定时任务（建议每日 00:05）把 `validTo < 今天` 的 `active` 券置为 `ended`；编辑有效期后重算 |
| 核销/领取统计 | 由种子随机生成后不再变化 | 领取、核销时累加 `claimed` / `used`，并保证并发安全（乐观锁/行锁） |
| 名称唯一性 | 未校验 | 建议卡券/券包名称唯一，重复返回 `40900` |
| 引用校验 | 券包 `couponIds` 未校验存在性与重复 | 校验卡券存在、未删除、不重复；必要时校验券可用状态 |
| 删除引用校验 | 删除卡券不检查是否被券包引用 | 被引用时返回 `40900` 或先解绑 |
| 删除幂等 | 删除不存在的 id 静默成功 | 建议保持幂等（`data: null`），或返回 `40400` 并同步前端提示 |
| 积分规则状态 | 无独立状态接口，`enabled` 随编辑提交 | 保持单一编辑入口即可；如需表格内快捷启停，可新增 `PATCH /points/rules/{id}/status` |
| 时间精度 | `YYYY-MM-DD HH:mm`（无秒） | 统一返回 `YYYY-MM-DD HH:mm:ss`；日期类字段保持 `YYYY-MM-DD` |
| 分页上限 | 前端不限制 `pageSize` 上限 | 服务端强制 `pageSize ≤ 100`，超出返回 `40001` 或按 100 截断 |
| 数据权限 | 无登录态、无门店隔离 | 资产为总部级数据，按租户隔离；若支持门店券需按 `X-Store-Id` 过滤并做越权校验 |
| 延迟 | 统一 `sleep(200~350ms)` | 真实接口按实际耗时，列表/概览建议加缓存 |

## 六、覆盖自检

- [x] `fetchCardStats` → `GET /api/v1/coupons/stats`
- [x] `fetchCoupons` → `GET /api/v1/coupons`
- [x] `saveCoupon`（新增） → `POST /api/v1/coupons`
- [x] `saveCoupon`（编辑） → `PUT /api/v1/coupons/{id}`
- [x] `updateCouponStatus` → `PATCH /api/v1/coupons/{id}/status`
- [x] `removeCoupon` → `DELETE /api/v1/coupons/{id}`
- [x] `fetchPointOverview` → `GET /api/v1/points/overview`
- [x] `fetchPointRules` → `GET /api/v1/points/rules`
- [x] `savePointRule`（新增） → `POST /api/v1/points/rules`
- [x] `savePointRule`（编辑） → `PUT /api/v1/points/rules/{id}`
- [x] `fetchPointRecords` → `GET /api/v1/points/records`
- [x] `fetchCouponOptions` → `GET /api/v1/coupons/options`
- [x] `fetchPackages` → `GET /api/v1/coupon-packages`
- [x] `savePackage`（新增） → `POST /api/v1/coupon-packages`
- [x] `savePackage`（编辑） → `PUT /api/v1/coupon-packages/{id}`
- [x] `removePackage` → `DELETE /api/v1/coupon-packages/{id}`
- [x] `couponTypeMeta` / `assetStatusMeta` / `pointSceneMeta` / `pointRecordTypeMeta` → 前端展示配置常量（中文 label + Tag 颜色），已整理为第 3.1~3.4 节字典，无需独立接口
- [x] `MOCK_TODAY` / `MOCK_NOW` → 前端演示时钟常量，非接口

**覆盖统计**：`assets.ts` 共 **13 个导出函数**，全部覆盖，映射为 **16 个 HTTP 接口**（3 个 upsert 函数各拆新增/编辑）；另有 4 个展示配置常量与 2 个演示时钟常量，均已说明归属。
