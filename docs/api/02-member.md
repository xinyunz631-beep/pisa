# 会员模块 · 接口契约

- **模块**：会员
- **页面**：会员信息（`/members/info`）、等级配置（`/members/levels`）、标签管理（`/members/tags`）
- **前端 service**：`src/services/member.ts`
- **Mock 数据**：`src/mock/members.ts`
- **接口数量**：9 个（会员查询 2、等级配置 2、标签管理 5）

> 通用约定（Base URL、响应包裹、分页、字段类型、错误码）见 [README.md](./README.md)。

## 一、前端函数 → HTTP 接口映射

| 前端函数 | 用途 | Method | Path |
| --- | --- | --- | --- |
| `fetchMembers(query)` | 会员列表（手机号/会员号查询） | `GET` | `/api/v1/members` |
| `fetchMemberLevelNames()` | 会员等级筛选项 | `GET` | `/api/v1/members/levels` |
| `fetchLevelConfigs()` | 等级配置列表 | `GET` | `/api/v1/member-levels` |
| `saveLevelConfig(input)` | 新增/编辑等级规则（前端 upsert） | `POST` / `PUT` | `/api/v1/member-levels`、`/api/v1/member-levels/{id}` |
| `fetchMemberTags(query)` | 标签列表 | `GET` | `/api/v1/member-tags` |
| `saveMemberTag(input)` | 新增/编辑标签（前端 upsert） | `POST` / `PUT` | `/api/v1/member-tags`、`/api/v1/member-tags/{id}` |
| `updateMemberTagStatus(id, status)` | 标签启用/停用 | `PATCH` | `/api/v1/member-tags/{id}/status` |
| `removeMemberTag(id)` | 删除标签 | `DELETE` | `/api/v1/member-tags/{id}` |
| —（页面内置字典） | 自动标签条件可选指标 | `GET` | `/api/v1/member-tags/condition-fields` |

## 二、枚举与字典

### 会员状态（`MemberStatus`）

| 值 | 中文 |
| --- | --- |
| `active` | 正常 |
| `frozen` | 已冻结 |

### 等级升级判定方式（`LevelUpgradeType`）

| 值 | 中文 | 判定 |
| --- | --- | --- |
| `amount` | 按累计消费金额 | 累计消费 ≥ `minAmount` |
| `frequency` | 按消费频次 | 消费次数 ≥ `minFrequency` |
| `either` | 满足任一条件 | 金额或频次命中其一即升级 |

### 标签分类（`TagCategory`）

| 值 | 说明 |
| --- | --- |
| `人群价值` | 按消费金额/频次等价值维度分群 |
| `行为` | 到店、偏好、流失等行为维度 |
| `人口属性` | 生日、城市、客群等属性维度 |

### 标签类型 / 状态 / 更新频率

| 字段 | 值 | 中文 |
| --- | --- | --- |
| `type` | `auto` | 自动标签（按条件由数仓计算） |
| `type` | `manual` | 手动标签（运营维护） |
| `status` | `enabled` | 启用 |
| `status` | `disabled` | 停用 |
| `updateFrequency` | `daily` | 每日自动更新 |
| `updateFrequency` | `weekly` | 每周自动更新 |
| `updateFrequency` | `manual` | 手动维护 |

### 自动标签条件指标（`condition-fields`）

`累计消费金额`、`消费频次`、`最近消费距今天数`、`注册天数`、`会员等级`、`所在城市`、`生日月份`

运算符：`≥`、`≤`、`=`、`≠`；多个条件之间为 **且（AND）** 关系。

## 三、接口明细

### GET /api/v1/members

- **说明**：会员列表，支持按手机号 / 会员号精确或模糊查询，按等级筛选，分页返回。
- **前端来源**：`src/services/member.ts` → `fetchMembers()`；页面 `src/pages/Members/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 手机号或会员号，模糊匹配（Mock 为包含匹配，建议后端支持手机号精确 + 会员号精确/前缀） |
| level | string | 否 | 等级名称，精确匹配，如 `金卡会员` |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 10 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "MB0001",
      "memberNo": "M100001",
      "nickname": "小鹿",
      "phone": "13595884769",
      "level": "金卡会员",
      "points": 19188,
      "totalSpent": 18201,
      "orderCount": 42,
      "lastVisit": "2026-10-10 17:37:00",
      "joinedAt": "2024-03-18",
      "birthday": "1995-07-09",
      "tags": ["高频到店", "周末消费"],
      "status": "active"
    }
  ],
  "total": 46,
  "page": 1,
  "pageSize": 10
}
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| memberNo | string | 会员号，唯一，展示与检索用 |
| nickname | string | 会员昵称 |
| phone | string | 手机号（列表可脱敏展示，检索用明文） |
| level | string | 当前等级名称（与等级配置的 `name` 对应） |
| points | number | 当前可用积分 |
| totalSpent | number | 累计消费金额（元） |
| orderCount | number | 累计消费次数 |
| lastVisit | string | 最近消费时间 |
| joinedAt | string | 注册日期 |
| birthday | string | 生日 |
| tags | string[] | 会员标签名称列表（来自标签管理） |
| status | string | 会员状态，见枚举 |

- **业务规则**：
  - 默认按注册时间倒序；支持按 `lastVisit`、`totalSpent` 排序（前端表格可扩展）
  - 冻结会员仍可查询，仅影响下单/领券
  - 手机号、会员号需做数据权限过滤（门店/租户）
- **错误**：`40001` 参数格式错误

### GET /api/v1/members/levels

- **说明**：会员信息页「等级」筛选项。
- **前端来源**：`src/services/member.ts` → `fetchMemberLevelNames()`
- **入参**：无
- **出参（data）**：

```json
["普通会员", "银卡会员", "金卡会员", "黑卡会员"]
```

- **业务规则**：按等级顺序返回；无数据时返回空数组。

### GET /api/v1/member-levels

- **说明**：等级配置列表（升级规则、权益、当前人数）。
- **前端来源**：`src/services/member.ts` → `fetchLevelConfigs()`；页面 `src/pages/MemberLevels/index.tsx`
- **入参**：无
- **出参（data）**：

```json
[
  {
    "id": "LV2",
    "name": "银卡会员",
    "order": 2,
    "upgradeType": "either",
    "minAmount": 2000,
    "minFrequency": 15,
    "discount": 9.5,
    "pointsRate": 1.2,
    "memberCount": 6,
    "description": "累计消费满 2000 元，或消费满 15 次自动升级。"
  }
]
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| order | number | 等级序号，用于排序 |
| upgradeType | string | 升级判定方式，见枚举 |
| minAmount | number | 累计消费门槛（元），`upgradeType=frequency` 时忽略 |
| minFrequency | number | 消费频次门槛（次），`upgradeType=amount` 时忽略 |
| discount | number | 会员折扣，`10` 表示不打折，`9.5` = 9.5 折 |
| pointsRate | number | 积分倍率，如 `1.2` |
| memberCount | number | 当前该等级会员数（后端实时统计） |
| description | string | 等级说明 |

- **业务规则**：
  - 按 `order` 升序返回
  - `memberCount` 由后端统计，前端只读
  - 配置修改后在下一个评估周期（每日 02:00）生效；权益可即时生效，需产品确认

### POST /api/v1/member-levels　|　PUT /api/v1/member-levels/{id}

- **说明**：新增 / 编辑等级规则。前端 `saveLevelConfig` 为 upsert：无 `id` 走新增，有 `id` 走编辑。
- **前端来源**：`src/services/member.ts` → `saveLevelConfig()`；页面 `src/pages/MemberLevels/index.tsx`
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 等级名称，唯一，≤10 字 |
| upgradeType | string | 是 | `amount` / `frequency` / `either` |
| minAmount | number | 条件必填 | `upgradeType ∈ {amount, either}` 时必填，≥0 |
| minFrequency | number | 条件必填 | `upgradeType ∈ {frequency, either}` 时必填，≥0 |
| discount | number | 是 | 1~10 |
| pointsRate | number | 是 | 0.1~10 |
| description | string | 否 | ≤120 字 |

- **出参（data）**：返回保存后的等级对象（结构同列表项）；失败 `null`。
- **业务规则**：
  - `name` 唯一，重复返回 `40900`
  - 升级门槛需大于上一个等级（否则返回 `40001`，避免规则冲突）
  - 不允许删除内置的最低等级
- **错误**：`40001` 参数错误、`40900` 名称重复

### GET /api/v1/member-tags

- **说明**：标签列表（自动/手动、分类、状态筛选）。数据量小，Mock 不分页；后端建议同样返回全量或支持分页（前端已做前端分页）。
- **前端来源**：`src/services/member.ts` → `fetchMemberTags()`；页面 `src/pages/MemberTags/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 标签名称模糊匹配 |
| category | string | 否 | `人群价值` / `行为` / `人口属性` |
| type | string | 否 | `auto` / `manual` |
| status | string | 否 | `enabled` / `disabled`；不传或 `all` 表示全部 |

- **出参（data）**：

```json
[
  {
    "id": "TG01",
    "name": "高价值客户",
    "category": "人群价值",
    "type": "auto",
    "conditions": [{ "field": "累计消费金额", "operator": "≥", "value": "50000" }],
    "updateFrequency": "daily",
    "coverage": 1286,
    "updatedAt": "2026-11-04 03:00:00",
    "status": "enabled"
  }
]
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| conditions | TagCondition[] | 自动标签条件；手动标签为空数组 |
| conditions[].field | string | 条件指标，见字典 |
| conditions[].operator | string | `≥` / `≤` / `=` / `≠` |
| conditions[].value | string | 条件值（数字或枚举文案） |
| coverage | number | 当前命中人群数（ClickHouse 计算） |
| updatedAt | string | 最近一次计算/维护时间 |

- **业务规则**：
  - 自动标签由 ClickHouse 按 `updateFrequency` 定时重算人群包
  - 手动标签不参与定时计算，`updateFrequency` 固定 `manual`
  - 停用标签不参与营销人群选择

### POST /api/v1/member-tags　|　PUT /api/v1/member-tags/{id}

- **说明**：新增 / 编辑标签。前端 `saveMemberTag` 为 upsert。
- **前端来源**：`src/services/member.ts` → `saveMemberTag()`
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 标签名称，≤20 字 |
| category | string | 是 | 分类枚举 |
| type | string | 是 | `auto` / `manual` |
| conditions | TagCondition[] | 条件必填 | `type=auto` 时至少 1 条；`type=manual` 时忽略 |
| updateFrequency | string | 条件必填 | `type=auto` 时 `daily`/`weekly`；`type=manual` 固定 `manual` |

- **出参（data）**：保存后的标签对象。
- **业务规则**：
  - 自动标签创建后立即触发一次人群计算（异步任务），`coverage` 初始可为 0
  - 标签名不可重复（`40900`）
  - `conditions` 为 AND 关系，后端需做字段白名单校验

### PATCH /api/v1/member-tags/{id}/status

- **说明**：标签启用 / 停用。
- **前端来源**：`src/services/member.ts` → `updateMemberTagStatus()`
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| status | string | 是 | `enabled` / `disabled` |

- **出参（data）**：`null`
- **业务规则**：停用后不参与营销人群包计算与选择；启用后次日/下次调度生效。

### DELETE /api/v1/member-tags/{id}

- **说明**：删除标签。
- **前端来源**：`src/services/member.ts` → `removeMemberTag()`
- **出参（data）**：`null`
- **业务规则**：
  - 已被营销计划引用的标签建议禁止删除（返回 `40900`）或改为停用
  - Mock 未做引用校验，真实实现需补

### GET /api/v1/member-tags/condition-fields

- **说明**：自动标签条件构造器的可选指标与运算符字典（前端当前为内置常量，后端可提供以支持动态扩展）。
- **入参**：无
- **出参（data）**：

```json
{
  "fields": [
    { "label": "累计消费金额", "value": "累计消费金额", "type": "number" },
    { "label": "消费频次", "value": "消费频次", "type": "number" },
    { "label": "最近消费距今天数", "value": "最近消费距今天数", "type": "number" },
    { "label": "注册天数", "value": "注册天数", "type": "number" },
    { "label": "会员等级", "value": "会员等级", "type": "enum" },
    { "label": "所在城市", "value": "所在城市", "type": "string" },
    { "label": "生日月份", "value": "生日月份", "type": "month" }
  ],
  "operators": ["≥", "≤", "=", "≠"]
}
```

## 四、覆盖自检

- [x] `fetchMembers` → `GET /api/v1/members`
- [x] `fetchMemberLevelNames` → `GET /api/v1/members/levels`
- [x] `fetchLevelConfigs` → `GET /api/v1/member-levels`
- [x] `saveLevelConfig` → `POST/PUT /api/v1/member-levels`
- [x] `fetchMemberTags` → `GET /api/v1/member-tags`
- [x] `saveMemberTag` → `POST/PUT /api/v1/member-tags`
- [x] `updateMemberTagStatus` → `PATCH /api/v1/member-tags/{id}/status`
- [x] `removeMemberTag` → `DELETE /api/v1/member-tags/{id}`
- [x] 页面内置条件指标字典 → `GET /api/v1/member-tags/condition-fields`
