# 业务模块 · 接口契约

- **模块**：业务（`/business`）
- **页面（3 个）**：菜单管理 `/business/menus`、门店管理 `/business/stores`、配送管理 `/business/delivery`（同模块的「菜品管理」`/business/dishes` 见 [06-dish.md](./06-dish.md)）
- **前端 service**：`src/services/business.ts`（页面唯一数据入口）
- **Mock 数据**：`src/mock/business.ts`（门店 22 家、菜单 18 个、配送规则 16 条；菜单菜品按菜单 id 确定性生成）
- **接口数量**：15 个 HTTP 接口，覆盖 `business.ts` 全部 **12 个导出函数**（`saveMenu` / `saveBusinessStore` / `saveDeliveryRule` 三个 upsert 函数在 REST 契约中各拆为「新增 `POST` + 编辑 `PUT /{id}`」两个接口）

> 通用约定（Base URL `/api/v1`、统一响应包裹、分页结构 `{list,total,page,pageSize}`、字段类型、错误码、REST 命名）见 [README.md](./README.md)。
> 本文档所有「出参」只展示响应包裹中的 `data` 字段，外层 `{ code, message, data }` 由前端 request 层统一解包。
> **演示时钟**：前端 Mock 以 `DEMO_NOW = 2026-11-04 18:30`（即「今天」`2026-11-04`）作为当前时间，文中日期示例均基于该时钟；真实接口以服务端时间为准。
> **时间精度**：Mock 时间字段为 `YYYY-MM-DD HH:mm`（无秒），本契约统一为 `YYYY-MM-DD HH:mm:ss`；为便于与前端 Mock 对照，示例保留 Mock 原值，后端返回需补秒（如 `2026-10-07 11:34:00`）。

## 一、模块概览

### 1.1 页面与数据量

| 页面 | 路由 | 使用接口 | Mock 数据量 |
| --- | --- | --- | --- |
| 菜单管理 | `/business/menus` | `fetchMenus`、`fetchMenuDishes`、`saveMenu`、`removeMenu`、`fetchBusinessStoreOptions` | 菜单 18 个（已上架 14 / 已下架 4；早市 3 / 午市 5 / 晚市 5 / 全天 5），每个菜单 8~12 道菜 |
| 门店管理 | `/business/stores` | `fetchBusinessStores`、`saveBusinessStore`、`removeBusinessStore` | 门店 22 家（营业中 17 / 筹备中 3 / 已停业 2） |
| 配送管理 | `/business/delivery` | `fetchDeliveryRules`、`saveDeliveryRule`、`removeDeliveryRule`、`fetchDeliveryOverview`、`fetchBusinessStoreOptions` | 配送规则 16 条（启用 14 / 停用 2） |

### 1.2 通用说明

- **请求头**：`Authorization: Bearer <access_token>` 必传；`X-Store-Id` 可选，用于门店数据权限（店长只应看到本店菜单/配送规则；门店主数据由总部维护）。
- **分页默认值**：`page = 1`、`pageSize = 10`，`pageSize` 上限 100；`total` 为「过滤后」的总条数。
- **门店名同步**：菜单（`Menu.storeName`）与配送规则（`DeliveryRule.storeName`）中的门店名是冗余展示字段，Mock 在每次查询时按 `storeId` 实时解析门店名（门店改名后两页立即一致）；真实后端应在接口内 join 门店表返回，**不要**依赖前端或数据库冗余字段。
- **跨模块复用**：门店下拉 `GET /api/v1/stores/options` 被本模块（菜单/配送的筛选与表单）、仪表盘（[01-dashboard.md](./01-dashboard.md)）顶栏门店切换器、营销模块（[03-marketing.md](./03-marketing.md)）共用，`value` 统一为门店编号（`ST001`）、`label` 为门店名称；营销活动的 `storeIds` 同样引用该值，返回时由后端 join 出冗余 `storeNames`。
- **删除幂等**：Mock 的删除接口对不存在的 id 静默成功；契约建议保持幂等（`data: null`），严格实现可返回 `40400`，需前端兼容。

## 二、前端函数 → HTTP 接口映射

| 前端函数 | 用途 | Method | Path |
| --- | --- | --- | --- |
| `fetchMenus(query)` | 菜单列表（名称/门店/状态筛选 + 分页） | `GET` | `/api/v1/menus` |
| `fetchMenuDishes(menuId)` | 菜单详情抽屉：菜单下的菜品清单（不分页） | `GET` | `/api/v1/menus/{id}/dishes` |
| `saveMenu(input)` | 新增菜单（入参无 `id`） | `POST` | `/api/v1/menus` |
| `saveMenu(input)` | 编辑菜单（入参含 `id`） | `PUT` | `/api/v1/menus/{id}` |
| `removeMenu(id)` | 删除菜单 | `DELETE` | `/api/v1/menus/{id}` |
| `fetchBusinessStoreOptions()` | 门店下拉选项（菜单/配送页筛选与表单共用） | `GET` | `/api/v1/stores/options` |
| `fetchBusinessStores(query)` | 门店列表（名称/城市/编号关键词 + 状态 + 分页） | `GET` | `/api/v1/stores` |
| `saveBusinessStore(input)` | 新增门店（入参无 `id`） | `POST` | `/api/v1/stores` |
| `saveBusinessStore(input)` | 编辑门店（入参含 `id`） | `PUT` | `/api/v1/stores/{id}` |
| `removeBusinessStore(id)` | 删除门店 | `DELETE` | `/api/v1/stores/{id}` |
| `fetchDeliveryRules(query)` | 配送规则列表（门店/状态筛选 + 分页） | `GET` | `/api/v1/delivery/rules` |
| `saveDeliveryRule(input)` | 新增配送规则（入参无 `id`） | `POST` | `/api/v1/delivery/rules` |
| `saveDeliveryRule(input)` | 编辑配送规则（入参含 `id`） | `PUT` | `/api/v1/delivery/rules/{id}` |
| `removeDeliveryRule(id)` | 删除配送规则 | `DELETE` | `/api/v1/delivery/rules/{id}` |
| `fetchDeliveryOverview()` | 配送概览 KPI（今日配送单量/平均配送时长/准时率） | `GET` | `/api/v1/delivery/overview` |

> 注：`saveMenu` / `saveBusinessStore` / `saveDeliveryRule` 在前端为 upsert（有 `id` 走编辑、无 `id` 走新增），后端按 `POST`（新增）/ `PUT /{id}`（编辑）实现即可。
> 路径注册顺序要求：`/stores/options` 需先于 `/stores/{id}` 系列注册；`/delivery/overview` 需先于 `/delivery/rules/{id}`（若后续新增单条规则查询）。

## 三、枚举与状态字典

### 3.1 门店营业状态（`StoreStatus`，定义于 `src/types.ts`）

| 值 | 中文 | 前端 Tag 颜色 | 说明 |
| --- | --- | --- | --- |
| `open` | 营业中 | `green` | 正常对外营业 |
| `preparing` | 筹备中 | `gold` | 已建店未开业 |
| `closed` | 已停业 | `default` | 停业，不再接单 |

> 门店状态无独立状态接口，随门店编辑接口（`PUT /stores/{id}`）提交。

### 3.2 菜单生效时段（`MenuPeriod`）

| 值 | 中文 | 前端 Tag 颜色 | 说明 |
| --- | --- | --- | --- |
| `morning` | 早市 | `orange` | 早餐时段可用 |
| `noon` | 午市 | `blue` | 午餐时段可用 |
| `evening` | 晚市 | `purple` | 晚餐/夜宵时段可用 |
| `all` | 全天 | `cyan` | 全营业时段可用 |

### 3.3 菜单状态（`MenuStatus`）

| 值 | 中文 | 前端 Tag 颜色 | 说明 |
| --- | --- | --- | --- |
| `online` | 已上架 | `green` | 对外可点 |
| `offline` | 已下架 | `default` | 不对客展示，菜品关联保留 |

> 菜单上下架通过编辑接口（`PUT /menus/{id}`）提交，无独立状态接口。

### 3.4 配送规则状态（`DeliveryStatus`）

| 值 | 中文 | 前端 Tag 颜色 | 说明 |
| --- | --- | --- | --- |
| `enabled` | 启用中 | `green` | 参与配送计价与「平均配送时长」统计 |
| `disabled` | 已停用 | `default` | 不参与配送，不计入概览均值 |

### 3.5 菜品状态（`DishStatus`，用于菜单详情中的菜品清单）

| 值 | 中文 | 前端 Tag 颜色 | 说明 |
| --- | --- | --- | --- |
| `on` | 在售 | `green` | 菜品管理中为在售 |
| `off` | 已下架 | `default` | 菜品管理中为下架，菜单内不可点 |

> 菜单详情中的菜品状态与菜品管理（[06-dish.md](./06-dish.md)）实时一致，只读。

### 3.6 校验字典（前端表单约束，后端需一致）

| 字段 | 约束 |
| --- | --- |
| 菜单 `name` | 必填，≤30 字 |
| 菜单 `storeId` | 必填，须为存在的门店（`GET /stores/options` 的 `value`） |
| 菜单 `period` / `status` | 必填，枚举见 3.2 / 3.3 |
| 门店 `name` | 必填，≤30 字 |
| 门店 `city` | 必填，≤10 字 |
| 门店 `address` | 必填，≤60 字 |
| 门店 `manager` | 必填，≤10 字 |
| 门店 `phone` | 必填，11 位手机号，正则 `^1[3-9]\d{9}$` |
| 门店 `businessHours` | 必填，≤20 字，格式 `HH:mm-HH:mm`（如 `10:00-22:00`） |
| 门店 `status` | 必填，枚举见 3.1 |
| 配送规则 `name` | 必填，≤30 字 |
| 配送规则 `storeId` | 必填，须为存在的门店 |
| 配送规则 `rangeKm` | 必填，0.5~20，步长 0.5，1 位小数（单位 km） |
| 配送规则 `minAmount` | 必填，0~999，2 位小数（起送价，元） |
| 配送规则 `fee` | 必填，0~99，2 位小数（配送费，元） |
| 配送规则 `etaMinutes` | 必填，5~120 的整数（预计送达时长，分钟） |
| 配送规则 `status` | 必填，枚举见 3.4 |

## 四、接口明细

### 4.1 菜单（`/menus`）

#### GET /api/v1/menus

- **说明**：菜单列表，支持按菜单名称/门店名关键词、门店、上下架状态筛选，分页返回。
- **前端来源**：`src/services/business.ts` → `fetchMenus()`；页面 `src/pages/Business/Menus/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 关键词：菜单名称模糊匹配，或所属门店名模糊匹配 |
| storeId | string | 否 | 门店编号过滤，如 `ST001`（来源 `GET /stores/options`）；省略表示全部门店 |
| status | string | 否 | `online` / `offline` / `all`，默认 `all` |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 10，上限 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "MN001",
      "name": "午市套餐",
      "storeId": "ST001",
      "storeName": "上海静安店",
      "dishCount": 8,
      "period": "noon",
      "status": "online",
      "updatedAt": "2026-10-07 11:34"
    },
    {
      "id": "MN002",
      "name": "秋季新品",
      "storeId": "ST002",
      "storeName": "上海徐汇店",
      "dishCount": 9,
      "period": "all",
      "status": "online",
      "updatedAt": "2026-10-07 13:49"
    },
    {
      "id": "MN003",
      "name": "早市轻食",
      "storeId": "ST003",
      "storeName": "北京朝阳店",
      "dishCount": 10,
      "period": "morning",
      "status": "online",
      "updatedAt": "2026-10-23 16:19"
    }
  ],
  "total": 18,
  "page": 1,
  "pageSize": 10
}
```

> 示例仅列 3 条；无筛选时 `total = 18`。按 `storeId=ST001&status=online` 筛选时 `total = 1`（仅 `MN001`）。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 菜单编号，`MN` + 3 位序号，如 `MN001` |
| name | string | 菜单名称 |
| storeId | string | 所属门店编号，引用门店主数据 |
| storeName | string | 所属门店名称，**接口内按 `storeId` join 实时解析**（门店改名后无需数据迁移即同步） |
| dishCount | number | 菜单内菜品数量，后端统计（= 菜单详情接口返回条数） |
| period | string | 生效时段，见 3.2 |
| status | string | 上下架状态，见 3.3 |
| updatedAt | string | 最后更新时间，后端写 |

- **业务规则**：
  - 筛选：`keyword` 同时匹配菜单名称与门店名；`storeId` 精确匹配；`status` 传 `all` 或省略表示不过滤。
  - 排序：Mock 为种子数据顺序；建议后端按 `updatedAt` 倒序。
  - 分页：`page` 超出范围返回空 `list`，`total` 仍为过滤后总数。
  - 门店数据权限：店长仅可见本店菜单；总部可见全部（当前 Mock 无隔离）。
- **错误**：`40001` 参数校验失败（非法枚举/门店编号格式）、`40300` 无门店数据权限、`50000` 服务端异常

#### GET /api/v1/menus/{id}/dishes

- **说明**：菜单详情抽屉中的菜品清单，返回该菜单下的全部菜品（前端不分页）。
- **前端来源**：`src/services/business.ts` → `fetchMenuDishes()`；页面 `src/pages/Business/Menus/index.tsx`（「查看」→ 详情抽屉）
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 菜单编号，如 `MN001` |

- **出参（data）**：

```json
[
  { "id": "D025", "name": "担担面", "category": "主食", "price": 24, "status": "on" },
  { "id": "D013", "name": "番茄蛋花汤", "category": "汤羹", "price": 18, "status": "on" },
  { "id": "D004", "name": "红烧肉", "category": "招牌主菜", "price": 56, "status": "on" },
  { "id": "D012", "name": "玉米排骨汤", "category": "汤羹", "price": 36, "status": "on" },
  { "id": "D019", "name": "毛血旺", "category": "招牌主菜", "price": 72, "status": "on" },
  { "id": "D001", "name": "麻辣香锅", "category": "招牌主菜", "price": 68, "status": "on" },
  { "id": "D016", "name": "杨枝甘露", "category": "甜品", "price": 26, "status": "on" },
  { "id": "D003", "name": "宫保鸡丁", "category": "招牌主菜", "price": 38, "status": "on" }
]
```

> 示例为 `MN001`（午市套餐）的完整 8 道菜；菜单 `dishCount` 与本数组长度一致。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 菜品编号，引用菜品主数据（`D001` 等），详情见 [06-dish.md](./06-dish.md) |
| name | string | 菜品名称 |
| category | string | 菜品分类，如「招牌主菜」「汤羹」「主食」「甜品」 |
| price | number | 售价（元） |
| status | string | 菜品状态（`on` 在售 / `off` 已下架），见 3.5；与菜品管理实时一致 |

- **业务规则**：
  - 不分页，按菜单内配置顺序（`sort` 升序）返回；Mock 为按菜单 id 确定性生成的顺序。
  - 返回**全部**关联菜品（含已下架菜品，前端以状态 Tag 区分）；下架菜品不参与点单。
  - `dishCount` 与本接口条数必须一致；后端增删菜单菜品后同步。
  - 菜单不存在时应返回 `40400`（注意：Mock 对任意菜单 id 都会生成 8~12 道菜，不做存在性校验，后端必须补）。
- **错误**：`40400` 菜单不存在、`50000` 服务端异常

#### POST /api/v1/menus　|　PUT /api/v1/menus/{id}

- **说明**：新增 / 编辑菜单。前端 `saveMenu(input)` 为 upsert：无 `id` 走新增，有 `id` 走编辑。
- **前端来源**：`src/services/business.ts` → `saveMenu()`；页面 `src/pages/Business/Menus/index.tsx`（「新建菜单 / 编辑菜单」抽屉）
- **入参（Path，仅 PUT）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 菜单编号，如 `MN001` |

- **入参（Body，POST 与 PUT 相同）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 菜单名称，≤30 字 |
| storeId | string | 是 | 所属门店编号，须存在（来源 `GET /stores/options`） |
| period | string | 是 | 生效时段：`morning` / `noon` / `evening` / `all` |
| status | string | 是 | 菜单状态：`online` / `offline` |

- **出参（data）**：返回保存后的完整菜单对象（结构同列表项，`storeName` 由后端按 `storeId` 回填）。新增示例（Mock 中当前 18 个，按规则生成 `MN019`，`dishCount` 为 Mock 按 id 计算值）：

```json
{
  "id": "MN019",
  "name": "冬季暖锅",
  "storeId": "ST001",
  "storeName": "上海静安店",
  "dishCount": 12,
  "period": "evening",
  "status": "online",
  "updatedAt": "2026-11-04 18:30"
}
```

  编辑示例（`PUT /api/v1/menus/MN001`，改为「全天」并下架）：

```json
{
  "id": "MN001",
  "name": "午市套餐",
  "storeId": "ST001",
  "storeName": "上海静安店",
  "dishCount": 8,
  "period": "all",
  "status": "offline",
  "updatedAt": "2026-11-04 18:30"
}
```

- **业务规则**：
  - 新增：`id` 由后端生成（Mock 为「现有 `MN` 编号最大值 + 1」，如 `MN019`）；`storeName` 由后端回填；`updatedAt` 由后端写当前时间。
  - `dishCount`：Mock 新增时按菜单 id 哈希生成 8~12；**真实后端新增菜单应为 0 道**（菜品需另行关联），前端需兼容 `0 道`。
  - 编辑：可修改 `name`、`storeId`、`period`、`status`；变更 `storeId` 后 `storeName` 同步刷新；`dishCount` 不变（由关联表统计）。
  - 同一门店下菜单名称建议唯一（Mock 未校验），重复返回 `40900`。
  - 下架（`offline`）只影响对客展示，不清空菜品关联，可随时重新上架。
- **错误**：`40001` 参数校验失败（含门店不存在，Mock 提示「门店不存在，请重新选择」）、`40400` 编辑时菜单不存在（Mock 提示「菜单不存在或已被删除」）、`40900` 同门店菜单名重复

#### DELETE /api/v1/menus/{id}

- **说明**：删除菜单。
- **前端来源**：`src/services/business.ts` → `removeMenu()`；页面 `src/pages/Business/Menus/index.tsx`（Popconfirm 二次确认）
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 菜单编号，如 `MN001` |

- **出参（data）**：`null`
- **业务规则**：
  - 级联删除「菜单-菜品」关联记录（`menu_dishes`），**不删除**菜品主数据（菜品仍存在于菜品管理）。
  - 建议仅允许删除「已下架」菜单，上架中菜单先下架再删除（需产品确认）；若菜单被点餐场景引用，建议改为下架。
  - Mock 为物理删除且对不存在的 `id` 静默成功（幂等）；建议后端保持幂等或返回 `40400`。
- **错误**：`40400` 菜单不存在（如后端选择严格语义）、`40900` 上架中/被引用的菜单不可删除

### 4.2 门店（`/stores`）

#### GET /api/v1/stores

- **说明**：门店列表，支持按门店名称/城市/编号关键词与营业状态筛选，分页返回。
- **前端来源**：`src/services/business.ts` → `fetchBusinessStores()`；页面 `src/pages/Business/Stores/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 关键词：门店名称模糊匹配、城市模糊匹配，或门店编号（`ST001`）忽略大小写模糊匹配 |
| status | string | 否 | `open` / `preparing` / `closed` / `all`，默认 `all` |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 10，上限 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "ST001",
      "name": "上海静安店",
      "city": "上海",
      "address": "静安区南京西路 1266 号",
      "manager": "周明",
      "phone": "18694757531",
      "businessHours": "10:30-22:30",
      "status": "open",
      "openedAt": "2022-02-21"
    },
    {
      "id": "ST002",
      "name": "上海徐汇店",
      "city": "上海",
      "address": "徐汇区衡山路 890 号",
      "manager": "李婷",
      "phone": "13844931709",
      "businessHours": "09:30-21:30",
      "status": "open",
      "openedAt": "2023-06-24"
    },
    {
      "id": "ST003",
      "name": "北京朝阳店",
      "city": "北京",
      "address": "朝阳区三里屯路 19 号",
      "manager": "王强",
      "phone": "13920016481",
      "businessHours": "10:30-22:30",
      "status": "open",
      "openedAt": "2024-11-10"
    }
  ],
  "total": 22,
  "page": 1,
  "pageSize": 10
}
```

> 示例仅列 3 条；无筛选时 `total = 22`。按 `keyword=上海` 筛选时 `total = 2`（`ST001`、`ST002`）。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 门店编号，`ST` + 3 位序号，如 `ST001` |
| name | string | 门店名称 |
| city | string | 所在城市 |
| address | string | 详细地址 |
| manager | string | 店长姓名 |
| phone | string | 联系电话（手机号，11 位） |
| businessHours | string | 营业时间，格式 `HH:mm-HH:mm` |
| status | string | 营业状态，见 3.1 |
| openedAt | string | 开业日期 `YYYY-MM-DD`，只读（新增时后端生成，编辑不修改） |

- **业务规则**：
  - 筛选：`keyword` 同时匹配 `name`、`city`、`id`；`status` 传 `all` 或省略表示不过滤。
  - 排序：Mock 为固定数据顺序；建议后端按 `id` 升序（或城市 + 名称）。
  - 门店为主数据：菜单、配送规则、订单、员工均以 `storeId` 引用，改名无需级联更新冗余字段（相关列表接口 join 解析）。
  - 数据权限：总部可见全部门店；店长建议仅可见本店（当前 Mock 无隔离）。
- **错误**：`40001` 参数校验失败、`40300` 无权限、`50000` 服务端异常

#### POST /api/v1/stores　|　PUT /api/v1/stores/{id}

- **说明**：新增 / 编辑门店。前端 `saveBusinessStore(input)` 为 upsert：无 `id` 走新增，有 `id` 走编辑。
- **前端来源**：`src/services/business.ts` → `saveBusinessStore()`；页面 `src/pages/Business/Stores/index.tsx`（「新建门店 / 编辑门店」抽屉）
- **入参（Path，仅 PUT）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 门店编号，如 `ST001` |

- **入参（Body，POST 与 PUT 相同）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 门店名称，≤30 字 |
| city | string | 是 | 城市，≤10 字 |
| address | string | 是 | 详细地址，≤60 字 |
| manager | string | 是 | 店长姓名，≤10 字 |
| phone | string | 是 | 联系电话，11 位手机号（`^1[3-9]\d{9}$`） |
| businessHours | string | 是 | 营业时间，≤20 字，格式 `HH:mm-HH:mm` |
| status | string | 是 | `open` / `preparing` / `closed` |

- **出参（data）**：返回保存后的完整门店对象（结构同列表项）。新增示例（Mock 中当前 22 家，按规则生成 `ST023`，`openedAt` 取演示当天）：

```json
{
  "id": "ST023",
  "name": "南京河西店",
  "city": "南京",
  "address": "建邺区江东中路 100 号",
  "manager": "陈晨",
  "phone": "13812345678",
  "businessHours": "10:00-22:00",
  "status": "open",
  "openedAt": "2026-11-04"
}
```

  编辑示例（`PUT /api/v1/stores/ST013`，仅把联系电话改为 `13700001111`）：

```json
{
  "id": "ST013",
  "name": "重庆解放碑店",
  "city": "重庆",
  "address": "渝中区民族路 166 号",
  "manager": "谭勇",
  "phone": "13700001111",
  "businessHours": "10:00-22:00",
  "status": "open",
  "openedAt": "2022-05-11"
}
```

- **业务规则**：
  - 新增：`id` 由后端生成（Mock 为「现有 `ST` 编号最大值 + 1」，如 `ST023`；>999 时需扩展位数）；`openedAt` 由后端写当天日期。
  - 编辑：`openedAt` 只读，不随编辑变化；`status` 变更随编辑接口提交（无独立状态接口）。
  - 校验：手机号需符合 `^1[3-9]\d{9}$`，重复（同城市同门店名）建议返回 `40900`（Mock 未校验）。
  - 停业（`closed`）门店仍保留主数据与历史数据，不参与新建菜单/配送规则的默认可选范围（由前端或后端过滤，需产品确认）。
- **错误**：`40001` 参数校验失败（手机号格式、必填项）、`40400` 编辑时门店不存在（Mock 提示「门店不存在或已被删除」）、`40900` 门店重名

#### DELETE /api/v1/stores/{id}

- **说明**：删除门店。
- **前端来源**：`src/services/business.ts` → `removeBusinessStore()`；页面 `src/pages/Business/Stores/index.tsx`（Popconfirm 二次确认）
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 门店编号，如 `ST001` |

- **出参（data）**：`null`
- **业务规则**：
  - Mock 为物理删除，且对不存在的 `id` 静默成功（幂等）；建议后端保持幂等或返回 `40400`。
  - **引用校验（后端必须补）**：门店下存在菜单、配送规则、订单、员工、卡券核销记录等任一关联数据时，建议禁止删除并返回 `40900`，引导用户改为「已停业」。
  - 建议仅允许删除 `closed` 门店；`open` / `preparing` 门店先变更状态。
  - 删除门店不影响历史订单的门店名快照，但会导致按 `storeId` 的聚合口径变化。
- **错误**：`40400` 门店不存在（如后端选择严格语义）、`40900` 门店存在关联数据不可删除

#### GET /api/v1/stores/options

- **说明**：门店下拉选项，供菜单管理/配送管理的筛选与表单选择，同时供仪表盘顶栏门店切换器使用（跨模块公共接口）；营销模块使用其独立的门店选项接口（`value` 为门店名称）。
- **前端来源**：`src/services/business.ts` → `fetchBusinessStoreOptions()`；`src/services/dashboard.ts` → `fetchStoreOptions()`
- **入参（Query）**：无（建议后端可扩展 `?status=open` 或 `?includeClosed=false` 只返回可选门店；当前 Mock 返回全部门店）
- **出参（data）**：

```json
[
  { "label": "上海静安店", "value": "ST001" },
  { "label": "上海徐汇店", "value": "ST002" },
  { "label": "北京朝阳店", "value": "ST003" }
]
```

> 示例仅列前 3 条；Mock 共返回 22 家门店（`ST001`~`ST022`）。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| label | string | 展示文案 = 门店名称 `name` |
| value | string | 门店编号 `id`，与菜单/配送规则/订单接口中的 `storeId` 一致 |

- **业务规则**：
  - 按用户数据权限过滤：总部返回全部门店，店长建议仅返回本店（或全部但标记）。
  - **数据源统一（重要）**：Mock 中本接口返回 `businessStores`（22 家），而仪表盘 `fetchStoreOptions` 返回 `db.stores`（12 家），两处数据源不一致；真实后端必须统一为门店表全量。
  - **跨模块口径**：本接口与仪表盘、营销模块统一，`value` 均为门店编号（`ST001`）；营销活动以 `storeIds` 引用门店，返回时 join 出冗余 `storeNames`（见 [03-marketing.md](./03-marketing.md)）。后端用同一门店查询服务支撑所有模块。
  - 排序：建议按门店编号升序或城市 + 名称拼音，保证下拉稳定。
  - 不分页（门店量级小）；门店数增长到数百家时可加 `keyword` 远程搜索。
- **错误**：`50000` 服务端异常

### 4.3 配送（`/delivery`）

#### GET /api/v1/delivery/overview

- **说明**：配送管理页顶部 3 个 KPI（今日配送单量、平均配送时长、准时率）。
- **前端来源**：`src/services/business.ts` → `fetchDeliveryOverview()`；页面 `src/pages/Business/Delivery/index.tsx`
- **入参（Query）**：无（当前页面未传门店维度，KPI 为全局口径；如需按门店，可新增 `storeId` 参数或读取 `X-Store-Id`，需前端同步改造）
- **出参（data）**：

```json
{
  "todayOrders": 15,
  "avgMinutes": 30.1,
  "onTimeRate": 96.8
}
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| todayOrders | number | 今日配送单量（单）：今日 `channel = delivery` 的订单数 |
| avgMinutes | number | 平均配送时长（分钟）：所有 `enabled` 规则 `etaMinutes` 的算术平均，保留 1 位小数；无启用规则时返回 `0` |
| onTimeRate | number | 准时率（%）：准时送达订单 / 配送总单 × 100，保留 1 位小数 |

- **业务规则**：
  - **口径（Mock 实现，后端需保持一致或更准确）**：
    - `todayOrders`：Mock 统计今日（`2026-11-04`）全部外卖订单，**未剔除已退款订单**；建议后端排除 `status = refunded`。
    - `avgMinutes`：Mock 对 14 条启用规则求均值 = `30.1`；后端可直接由启用规则实时计算，也可改用真实履约时长（产品确认）。
    - `onTimeRate`：Mock 用固定种子生成 92~99 之间的模拟值（当前 `96.8`），**非真实统计**；真实后端需基于配送订单的「承诺送达时间 / 实际送达时间」计算。
  - 与配送规则联动：新增/编辑/删除规则后 `avgMinutes` 会变化，前端已在保存/删除后重新拉取概览（`Promise.all([load(), loadOverview()])`）。
  - 建议缓存 1~5 分钟；日切后 `todayOrders` 归零。
- **错误**：`50000` 服务端异常

#### GET /api/v1/delivery/rules

- **说明**：配送规则列表，支持按门店与启用状态筛选，分页返回。
- **前端来源**：`src/services/business.ts` → `fetchDeliveryRules()`；页面 `src/pages/Business/Delivery/index.tsx`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| storeId | string | 否 | 门店编号过滤，如 `ST001`（来源 `GET /stores/options`）；省略表示全部门店 |
| status | string | 否 | `enabled` / `disabled` / `all`，默认 `all` |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 10，上限 100 |

- **出参（data）**：

```json
{
  "list": [
    {
      "id": "DR001",
      "name": "静安店标准配送",
      "storeId": "ST001",
      "storeName": "上海静安店",
      "rangeKm": 3,
      "minAmount": 20,
      "fee": 5,
      "etaMinutes": 30,
      "status": "enabled",
      "updatedAt": "2026-09-21 20:28"
    },
    {
      "id": "DR002",
      "name": "徐汇店商圈配送",
      "storeId": "ST002",
      "storeName": "上海徐汇店",
      "rangeKm": 2.5,
      "minAmount": 18,
      "fee": 4,
      "etaMinutes": 28,
      "status": "enabled",
      "updatedAt": "2026-10-07 14:39"
    },
    {
      "id": "DR003",
      "name": "朝阳店夜间配送",
      "storeId": "ST003",
      "storeName": "北京朝阳店",
      "rangeKm": 4,
      "minAmount": 25,
      "fee": 6,
      "etaMinutes": 35,
      "status": "enabled",
      "updatedAt": "2026-11-01 10:20"
    }
  ],
  "total": 16,
  "page": 1,
  "pageSize": 10
}
```

> 示例仅列 3 条；无筛选时 `total = 16`。

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 规则编号，`DR` + 3 位序号，如 `DR001` |
| name | string | 规则名称 |
| storeId | string | 所属门店编号 |
| storeName | string | 所属门店名称，**接口内按 `storeId` join 实时解析**（门店改名后同步） |
| rangeKm | number | 配送范围（km），1 位小数 |
| minAmount | number | 起送价（元），2 位小数，`0` 表示无起送门槛 |
| fee | number | 配送费（元），2 位小数 |
| etaMinutes | number | 预计送达时长（分钟），整数 |
| status | string | 启用状态，见 3.4 |
| updatedAt | string | 最后更新时间，后端写 |

- **业务规则**：
  - 筛选：仅支持 `storeId` 与 `status`（页面无关键词搜索）；`status` 传 `all` 或省略表示不过滤。
  - 排序：Mock 为种子数据顺序；建议后端按 `updatedAt` 倒序。
  - 同一门店可配置多条规则（Mock 中每家门店各 1 条）；实际配送计费取哪条需业务明确（建议按门店 + 范围匹配，超出范围不可配送）。
  - 门店数据权限：店长仅可见本店规则。
- **错误**：`40001` 参数校验失败、`40300` 无门店数据权限、`50000` 服务端异常

#### POST /api/v1/delivery/rules　|　PUT /api/v1/delivery/rules/{id}

- **说明**：新增 / 编辑配送规则。前端 `saveDeliveryRule(input)` 为 upsert：无 `id` 走新增，有 `id` 走编辑。
- **前端来源**：`src/services/business.ts` → `saveDeliveryRule()`；页面 `src/pages/Business/Delivery/index.tsx`（「新建配送规则 / 编辑配送规则」抽屉）
- **入参（Path，仅 PUT）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 规则编号，如 `DR001` |

- **入参（Body，POST 与 PUT 相同）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 规则名称，≤30 字 |
| storeId | string | 是 | 所属门店编号，须存在（来源 `GET /stores/options`） |
| rangeKm | number | 是 | 配送范围（km），0.5~20，步长 0.5，1 位小数 |
| minAmount | number | 是 | 起送价（元），0~999，2 位小数 |
| fee | number | 是 | 配送费（元），0~99，2 位小数 |
| etaMinutes | number | 是 | 预计送达时长（分钟），5~120 的整数 |
| status | string | 是 | `enabled` / `disabled` |

- **出参（data）**：返回保存后的完整规则对象（结构同列表项，`storeName` 由后端按 `storeId` 回填）。新增示例（Mock 中当前 16 条，按规则生成 `DR017`）：

```json
{
  "id": "DR017",
  "name": "静安店午间加急配送",
  "storeId": "ST001",
  "storeName": "上海静安店",
  "rangeKm": 2,
  "minAmount": 20,
  "fee": 5,
  "etaMinutes": 25,
  "status": "enabled",
  "updatedAt": "2026-11-04 18:30"
}
```

  编辑示例（`PUT /api/v1/delivery/rules/DR002`，缩短时长并停用）：

```json
{
  "id": "DR002",
  "name": "徐汇店商圈配送",
  "storeId": "ST002",
  "storeName": "上海徐汇店",
  "rangeKm": 2.5,
  "minAmount": 18,
  "fee": 4,
  "etaMinutes": 25,
  "status": "disabled",
  "updatedAt": "2026-11-04 18:30"
}
```

- **业务规则**：
  - 新增：`id` 由后端生成（Mock 为「现有 `DR` 编号最大值 + 1」，如 `DR017`）；`storeName` 由后端回填；`updatedAt` 由后端写当前时间。
  - 编辑：`storeId` 变更后 `storeName` 同步刷新；`etaMinutes` 参与「平均配送时长」概览，修改后前端会重新拉取概览。
  - 同一门店多规则时建议「门店 + 名称」唯一（Mock 未校验），重复返回 `40900`。
  - 门店不存在 → `40001`（Mock 提示「门店不存在，请重新选择」）；规则不存在 → `40400`（Mock 提示「配送规则不存在或已被删除」）。
  - 金额/范围按 README 字段约定落库：金额保留 2 位小数，`rangeKm` 保留 1 位小数。
- **错误**：`40001` 参数校验失败、`40400` 编辑时规则不存在、`40900` 同门店规则名重复

#### DELETE /api/v1/delivery/rules/{id}

- **说明**：删除配送规则。
- **前端来源**：`src/services/business.ts` → `removeDeliveryRule()`；页面 `src/pages/Business/Delivery/index.tsx`（Popconfirm 二次确认）
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 规则编号，如 `DR001` |

- **出参（data）**：`null`
- **业务规则**：
  - 删除后「平均配送时长」需重新计算，前端已同步刷新概览。
  - Mock 为物理删除，且对不存在的 `id` 静默成功（幂等）；建议后端保持幂等或返回 `40400`。
  - 若该门店仅有此一条启用规则，删除后该门店将无法配送，建议前端二次确认文案提示（当前为通用「删除后不可恢复」）。
  - 已产生的历史配送订单不受影响（订单侧应保存配送费/时长快照）。
- **错误**：`40400` 规则不存在（如后端选择严格语义）、`40900` 门店唯一启用规则不可删除（如产品要求）

## 五、Mock 差异与后端待确认

| 项 | Mock 现状 | 后端实现要求 |
| --- | --- | --- |
| ID 生成 | 菜单/门店/配送规则 id = 前缀 + 「现有编号最大值 + 1」（`MN019`、`ST023`、`DR017`） | 建议独立序列（自增/雪花），支持 >999 扩容；不要用数组长度 |
| 门店名冗余 | 菜单/配送规则的 `storeName` 为种子快照，查询时前端按 `storeId` 实时解析 | 接口内 join 门店表返回最新名称，避免冗余字段不同步 |
| 菜单菜品 | 按菜单 id 哈希确定性生成 8~12 道菜，不落库，也不校验菜单是否存在 | 需 `menu_dishes` 关联表（菜单 id + 菜品 id + 排序），`dishCount` 实时统计；菜单不存在返回 `40400`；支持增删菜与排序 |
| 新增菜单 `dishCount` | 新增即有 8~12 道（Mock 按 id 哈希） | 新增菜单应为 0 道，前端需兼容展示 `0 道` |
| 门店下拉数据源 | `business.ts` 返回 22 家（`businessStores`），`dashboard.ts` 返回 12 家（`db.stores`），`marketing.ts` 返回 12 个门店名称 | 统一为一个门店表全量，共用同一门店查询服务；本接口与仪表盘 `value` 为 `storeId`，营销接口 `value` 暂为门店名称（见 03-marketing.md），建议中长期统一为 `storeId` |
| 门店删除引用校验 | 无任何校验，直接删除 | 存在菜单/配送规则/订单/员工时返回 `40900`；建议仅 `closed` 门店可删 |
| 配送概览口径 | `todayOrders` 未剔除退款；`onTimeRate` 为固定种子模拟值 | 排除 `refunded` 订单；准时率基于真实送达时间统计（需配送订单补充承诺/实际送达时间字段） |
| 概览门店维度 | 前端未传门店，KPI 为全局 | 如需门店维度 KPI，新增 `storeId` 参数并同步改造页面 |
| 时间精度 | `YYYY-MM-DD HH:mm`（无秒） | 统一返回 `YYYY-MM-DD HH:mm:ss`；`openedAt`、`validFrom/To` 等日期字段保持 `YYYY-MM-DD` |
| 分页上限 | 前端不限制 `pageSize` 上限 | 服务端强制 `pageSize ≤ 100` |
| 数据权限 | 无登录态、无门店隔离 | 菜单/配送规则按 `X-Store-Id` 过滤；门店主数据总部维护；越权返回 `40300` |
| 名称唯一性 | 均未校验 | 同门店菜单名、同门店规则名、门店重名建议唯一，返回 `40900` |
| 延迟 | 统一 `sleep(220~320ms)` | 真实接口按实际耗时，列表/概览建议缓存 |

## 六、覆盖自检

- [x] `fetchMenus` → `GET /api/v1/menus`
- [x] `fetchMenuDishes` → `GET /api/v1/menus/{id}/dishes`
- [x] `saveMenu`（新增） → `POST /api/v1/menus`
- [x] `saveMenu`（编辑） → `PUT /api/v1/menus/{id}`
- [x] `removeMenu` → `DELETE /api/v1/menus/{id}`
- [x] `fetchBusinessStoreOptions` → `GET /api/v1/stores/options`
- [x] `fetchBusinessStores` → `GET /api/v1/stores`
- [x] `saveBusinessStore`（新增） → `POST /api/v1/stores`
- [x] `saveBusinessStore`（编辑） → `PUT /api/v1/stores/{id}`
- [x] `removeBusinessStore` → `DELETE /api/v1/stores/{id}`
- [x] `fetchDeliveryRules` → `GET /api/v1/delivery/rules`
- [x] `saveDeliveryRule`（新增） → `POST /api/v1/delivery/rules`
- [x] `saveDeliveryRule`（编辑） → `PUT /api/v1/delivery/rules/{id}`
- [x] `removeDeliveryRule` → `DELETE /api/v1/delivery/rules/{id}`
- [x] `fetchDeliveryOverview` → `GET /api/v1/delivery/overview`
- [x] 类型 re-export（`BusinessStore`、`Menu`、`MenuDish`、`MenuPeriod`、`MenuStatus`、`DeliveryRule`、`DeliveryStatus`）与常量 `DEMO_NOW` → 前端类型/演示时钟，非接口；枚举已整理为第 3.1~3.5 节
- [x] 页面内置展示配置（`periodMeta`、`menuStatusMeta`、`deliveryStatusMeta`）与 `dishStatusMeta`（`src/utils/format.ts`）→ 前端 Tag 字典，已整理为第 3.2~3.5 节，无需独立接口

**覆盖统计**：`business.ts` 共 **12 个导出函数**，全部覆盖，映射为 **15 个 HTTP 接口**（3 个 upsert 函数各拆新增/编辑）；另有类型 re-export 与演示时钟常量，均已说明归属。跨模块公共接口 `GET /api/v1/stores/options` 与 [01-dashboard.md](./01-dashboard.md)、[03-marketing.md](./03-marketing.md) 使用同一路径与 `{label,value}` 结构（`value` = 门店编号），营销活动通过 `storeIds` + 冗余 `storeNames` 引用门店，口径已在 README「跨模块公共接口与引用约定」统一。
