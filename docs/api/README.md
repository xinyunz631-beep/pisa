# 比萨斯 · 接口契约（由前端 Mock 反推）

> 目的：前端原型阶段所有数据来自 `src/mock/*` + `src/services/*` 的内存 Mock。本文档把 Mock 的**入参、出参、分页、筛选、状态流转**固化为后端接口契约，作为后端实现与前后端联调的依据。
>
> 反向推导方法：`src/services/*.ts` 是页面唯一的数据入口（未来接后端只替换这一层），其中每个导出函数对应一个 HTTP 接口，函数参数即入参、返回类型即出参。文档按模块拆分，**页面代码无需改动即可对接真实后端**。

## 文档索引

| 文档 | 模块 | 对应前端 service | 覆盖页面 |
| --- | --- | --- | --- |
| [01-dashboard.md](./01-dashboard.md) | 数据 | `services/dashboard.ts` | 仪表盘 |
| [02-member.md](./02-member.md) | 会员 | `services/member.ts` | 会员信息、等级配置、标签管理 |
| [03-marketing.md](./03-marketing.md) | 营销 | `services/marketing.ts` | 满减、满折、发券、自动化营销、消息通知 |
| [04-assets.md](./04-assets.md) | 资产 | `services/assets.ts` | 卡券管理、积分管理、券包管理 |
| [05-business.md](./05-business.md) | 业务 | `services/business.ts` | 菜单管理、门店管理、配送管理 |
| [06-dish.md](./06-dish.md) | 业务 | `services/dish.ts` | 菜品管理 |
| [07-order.md](./07-order.md) | 订单 | `services/order.ts` | 订单查询 |
| [08-ops.md](./08-ops.md) | 订单 / 系统 | `services/ops.ts` | 售后处理、岗位管理、人员管理、系统日志 |

## OpenAPI 规范（机器可读）

Markdown 契约之外，提供一份 OpenAPI 3.0.3 规范，可直接导入 Swagger UI / Postman / Apifox 调试：

```
docs/api/openapi/
├── openapi.yaml            # 入口：info / servers / security / tags / 全部 paths 索引
├── paths/                  # 按模块拆分的路径定义（dashboard/member/marketing/assets/business/dish/order/ops）
└── schemas/                # 数据模型与公共片段（common.yaml：ApiEnvelope、Pagination、公共参数）
```

```bash
npm run docs:lint      # Redocly 校验（结构与引用合法性）
npm run docs:preview   # 本地启动文档预览（Redocly Dev Portal）
```

校验与链接检查已接入 GitHub Actions（`.github/workflows/ci.yml`）：每次 push / PR 自动跑前端构建、OpenAPI 校验、Markdown 链接检查。

## 通用约定

### 基础信息

| 项 | 约定 |
| --- | --- |
| Base URL | `/api/v1`（生产环境如 `https://api.example.com/api/v1`） |
| 协议 | HTTPS，`Content-Type: application/json; charset=utf-8` |
| 认证 | `Authorization: Bearer <access_token>` |
| 多门店上下文 | `X-Store-Id: ST001`（对应顶部门店切换器；不传表示全部门店/总部视角） |
| 请求追踪 | `X-Request-Id`（可选，便于排查） |

### 统一响应包裹

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | number | `0` 成功；非 0 为业务错误码 |
| message | string | 成功为 `ok`，失败为可直接展示的提示文案 |
| data | any | 业务数据；无返回值时为 `null` |

> 当前 Mock 直接返回业务数据（未包裹、无延迟错误），真实接口由前端 request 层统一解包 `data`。

### 分页

请求参数（Query）：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| page | number | 否 | 1 | 页码，从 1 开始 |
| pageSize | number | 否 | 10 | 每页条数，最大 100 |

分页响应（`data`）：

```json
{
  "list": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

### 字段约定

| 类型 | 约定 |
| --- | --- |
| 金额 | `number`，单位「元」，保留两位小数（如 `68.00`） |
| 折扣 | `number`，`0.1 ~ 10`，`10` 表示不打折（如 `8.5` = 8.5 折） |
| 百分比 | `number`，`0 ~ 100`（如 `56.3`） |
| 时间 | `string`，`YYYY-MM-DD HH:mm:ss`；仅日期用 `YYYY-MM-DD` |
| 日期区间筛选 | `startDate` / `endDate`（`YYYY-MM-DD`，闭区间） |
| ID | `string`（如 `ST001`、`M100001`、`D001`、`BS202611040001`） |
| 枚举 | `string` 小写短横线风格（如 `dine-in`、`completed`），中文字段用于展示 |
| 手机号 | `string`，保存时校验 `^1[3-9]\d{9}$` |
| 删除 | `DELETE` 成功返回 `data: null` |

### 错误码

| code | HTTP | 说明 |
| --- | --- | --- |
| 0 | 200 | 成功 |
| 40001 | 400 | 参数校验失败（`message` 带具体字段） |
| 40100 | 401 | 未登录 / token 失效 |
| 40300 | 403 | 无权限（含门店数据权限） |
| 40400 | 404 | 资源不存在 |
| 40900 | 409 | 状态冲突（如重复编码、重复工号） |
| 50000 | 500 | 服务端异常 |

### Mock 与生产的差异（联调必读）

1. **分页**：Mock 为前端内存分页，真实接口需服务端分页并返回 `total`。
2. **数据持久化**：Mock 改的是内存数组，刷新即恢复；真实接口需落库。
3. **延迟**：Mock 统一 `sleep(200~400ms)` 模拟网络，真实接口按实际耗时。
4. **鉴权**：Mock 无登录态；真实接口需 token，页面需补登录页。
5. **关联校验**：Mock 仅做少量唯一性校验（岗位编码、工号），真实接口需完整外键与业务校验。
6. **门店数据权限**：Mock 未隔离门店数据，真实接口需按 `X-Store-Id` 过滤。

## 跨模块公共接口与引用约定

多个模块会复用同一份主数据，为避免各文档口径不一致，统一如下（后端按此实现，各模块文档中如有冲突以本节为准）：

### 门店主数据

- 选项接口：`GET /api/v1/stores/options` → `[{ "label": "上海静安店", "value": "ST001" }]`（`value` 为门店 ID）
- **所有业务对象引用门店一律用 `storeId`**（如订单、菜单、配送规则、活动、员工）；需要展示名称时由后端 join 门店表返回只读冗余字段 `storeName` / `storeNames`
- 数据权限：按请求头 `X-Store-Id` 过滤；不传表示总部视角（全部门店）

### 卡券

- 选项接口：`GET /api/v1/coupons/options`（结构见 [04-assets.md](./04-assets.md)）
- 券包用 `couponIds: string[]` 引用；发券任务用 `couponId` 引用 + 只读冗余 `couponName`
- 卡券状态由有效期 + 启停共同决定（`active` / `ended` / `disabled`）

### 人群标签

- 选项来源：`GET /api/v1/member-tags?status=enabled`（结构见 [02-member.md](./02-member.md)）
- 营销对象当前用标签名称数组 `audiences` 引用，后端需校验「标签存在且为启用状态」；中长期可扩展为 `tagIds` + 冗余 `tagNames`

### 营销活动选项

- 自动化营销关联活动：`GET /api/v1/marketing/activities/options`（结构见 [03-marketing.md](./03-marketing.md)），返回营销模块内满减/满折/发券活动的统一选项

### 路径前缀约定

- 营销域：`/api/v1/marketing/*`（资源归属营销模块）
- 其余主数据资源优先、不加模块前缀：`/api/v1/coupons`、`/api/v1/menus`、`/api/v1/stores`、`/api/v1/orders`、`/api/v1/staff` 等
- 状态变更统一 `PATCH /{resource}/{id}/status`；下拉/字典统一 `GET /{resource}/options` 或 `/{resource}/{field}/options`

## REST 命名规范

| 操作 | Method | Path 示例 |
| --- | --- | --- |
| 列表/查询 | `GET` | `/api/v1/members?keyword=&page=1` |
| 详情 | `GET` | `/api/v1/members/{id}` |
| 新增 | `POST` | `/api/v1/members` |
| 编辑 | `PUT` | `/api/v1/members/{id}` |
| 删除 | `DELETE` | `/api/v1/members/{id}` |
| 状态变更 | `PATCH` | `/api/v1/members/{id}/status` |
| 下拉选项 | `GET` | `/api/v1/members/levels/options` |
| 聚合统计 | `GET` | `/api/v1/dashboard/summary` |

## 文档编写模板（各模块统一）

````markdown
### GET /api/v1/xxx

- **说明**：一句话
- **前端来源**：`src/services/xxx.ts` → `fetchXxx()`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |

- **出参（data）**：

```json
{ "list": [], "total": 0, "page": 1, "pageSize": 10 }
```

- **业务规则 / 错误**：...
````

每个模块文档的结构：

1. 模块概览（页面、前端 service、接口数量）
2. 前端函数 → HTTP 接口映射表
3. 枚举与状态字典
4. 接口明细（按资源分组）
