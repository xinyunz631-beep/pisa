# 菜品模块 · 接口契约

- **模块**：业务（菜品管理）
- **页面**：菜品管理（`/business/dishes`）
- **前端 service**：`src/services/dish.ts`（5 个导出函数）
- **Mock 数据**：`src/mock/db.ts` → `dishes`（28 条）
- **接口数量**：6 个（`saveDish()` 为新增/编辑 upsert：不传 `id` 走 `POST`，传 `id` 走 `PUT`，因此拆为 2 个 HTTP 接口）

> 通用约定（Base URL、统一响应包裹、分页、字段约定、错误码、REST 命名）见 [README.md](./README.md)。

## 一、模块概览

**页面能力**

- 列表：按关键词（菜品名称 / 编码）、分类、状态筛选并分页；
- 分类选项：进入页面时加载，同时用于筛选下拉与新增/编辑表单；
- 新增 / 编辑：右侧抽屉表单（商品编码、名称、分类、商品图、规格 SKU、口味 / 做法属性引用、成本、状态、描述）；
- 上下架：列表行内 `Switch` 切换 `on`（在售）/ `off`（已下架）；关闭时前端二次确认，提示「下架不影响已生成的订单，用户将无法购买此商品，确定要下架吗？」；
- 列表展示：菜品名称 + 系统编号/商品编码、分类、售价区间（多规格）、库存合计、销量、状态、更新时间（成本与毛利率不在列表展示，成本仅用于对账单核算）；
- 删除：二次确认后删除。

**前端数据流**：`页面 → src/services/dish.ts → src/mock/db.ts` 的 `dishes` 内存数组。真实后端只需替换 service 层实现，页面无需改动。

**本期未建模**（`Dish` 类型中不存在，不纳入本期契约）：门店级价格与上下架、点单时的属性选择快照、销量写入（`sales` 只读）。分类字典 CRUD 见「业务 · 分类管理」页面、做法属性组 CRUD 见「业务 · 做法属性」页面（两者接口契约待补）。

> 数据模型为 **SPU + SKU**：`Dish` 是 SPU（菜品），`skus` 是规格（SKU）；SPU 的 `price`（最低 SKU 价）与 `stock`（SKU 库存合计）由 SKU 汇总推导。

## 二、前端函数 → HTTP 接口映射

| 序号 | 前端函数 | 用途 | Method | Path |
| --- | --- | --- | --- | --- |
| 1 | `fetchDishes(query)` | 菜品列表（关键词/分类/状态筛选 + 分页） | `GET` | `/api/v1/dishes` |
| 2 | `fetchCategories()` | 分类下拉选项（筛选 + 表单共用） | `GET` | `/api/v1/dishes/categories/options` |
| 3 | `saveDish(input)`（`input.id` 为空） | 新增菜品 | `POST` | `/api/v1/dishes` |
| 4 | `saveDish(input)`（`input.id` 非空） | 编辑菜品（全量更新） | `PUT` | `/api/v1/dishes/{id}` |
| 5 | `updateDishStatus(id, status)` | 上架 / 下架 | `PATCH` | `/api/v1/dishes/{id}/status` |
| 6 | `removeDish(id)` | 删除菜品 | `DELETE` | `/api/v1/dishes/{id}` |

> 说明：页面 `handleSave` 只调用 `saveDish` 一次，内部按 `editing?.id` 决定新增或编辑；后端按上表 3 / 4 两个接口分别实现即可。

## 三、枚举与状态字典

### 3.1 菜品状态（`DishStatus`）

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `on` | 在售 | 可被菜单/点单引用（生产需再校验门店上架关系） |
| `off` | 已下架 | 不可点单；历史订单与售后不受影响；列表仍可查询 |

### 3.2 菜品分类（`category`）

`category` 为字符串（非固定枚举），选项来自「业务 · 分类管理」（仅启用中的分类，按分类排序值返回）。当前 Mock 共 8 个分类：

| 序号 | 分类 |
| --- | --- |
| 1 | 招牌主菜 |
| 2 | 小炒 |
| 3 | 主食 |
| 4 | 汤羹 |
| 5 | 饮品 |
| 6 | 甜品 |
| 7 | 凉菜 |
| 8 | 套餐 |

> 后端须保证新增/编辑菜品时 `category` 存在于分类字典（分类管理）中；停用的分类不会出现在下拉选项里。

### 3.3 Dish 字段字典

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 系统菜品编号，`D` + 3 位序号，如 `D001`；新增时由服务端生成，不可修改 |
| `code` | string | 商品编码（SPU 编码），商家可自定义，如 `SPU001`；**全局唯一** |
| `name` | string | 菜品名称，最长 30 字符；建议同分类下唯一 |
| `category` | string | 所属分类，取值见 3.2 |
| `price` | number | 基础售价（元）= 全部 SKU 中最低价，服务端按 SKU 汇总推导，不接受客户端直接写入 |
| `cost` | number | 成本，单位「元」，两位小数（Mock 种子为整数，如 `26`）；仅用于成本/毛利核算，不在列表展示 |
| `stock` | number | 当前库存（份）= 全部 SKU 库存合计，服务端按 SKU 汇总推导 |
| `images` | string[] | 商品图，最多 6 张；元素为图片 URL（Mock 为内联 SVG dataURL），不在列表展示 |
| `skus` | DishSku[] | 规格（SKU）列表，至少 1 条，字段见 3.4 |
| `attributeGroupIds` | string[] | 引用的做法 / 口味属性组 ID（可空）；属性组由「业务 · 做法属性」维护，不参与售价与库存 |
| `sales` | number | 累计销量，只读；新增时服务端置 `0`；真实接口建议由订单/结算聚合，不接受客户端写入 |
| `status` | string | 菜品状态，见 3.1 |
| `description` | string | 菜品描述，最长 120 字符，可为空串 |
| `updatedAt` | string | 更新时间，格式见 README 时间约定（Mock 只到分钟，如 `2026-11-03 09:00`） |

### 3.4 DishSku（规格）字段字典

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | SKU 系统编号，`{菜品id}-序号`，如 `D001-01`；服务端生成 |
| `code` | string | SKU 编码，如 `SPU001-01`；建议同一 SPU 内唯一 |
| `specName` | string | 规格名称，如「小份」「大份」「中杯」 |
| `price` | number | 该规格售价（元），两位小数 |
| `stock` | number | 该规格库存（份），整数，`≥ 0` |

### 3.5 前端展示计算（无接口）

- 列表不再展示成本与毛利率；成本只在前端对账单（`docs/api/09` 待补）做商品成本核算，`cost` 不参与菜品列表的计算列；
- 售价展示：单规格显示 `¥68`，多规格显示 `¥68 ~ ¥80`（取 SKU 最低价 ~ 最高价），并标注「N 个规格」；
- 库存展示：`stock = 0` 显示「缺货」（红色）、`0 < stock < 20` 显示预警色（橙色），其余正常显示 `N 份`。预警阈值属于前端展示规则，不落库。

## 四、接口明细

### GET /api/v1/dishes

- **说明**：菜品列表，支持关键词（名称 / 编码）、分类、状态筛选，服务端分页返回。
- **前端来源**：`src/services/dish.ts` → `fetchDishes()`；页面 `src/pages/Dishes/index.tsx` → `load()`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | string | 否 | — | 菜品名称模糊（包含，区分大小写）或菜品编码模糊（包含，忽略大小写）；空串/空白不参与过滤 |
| category | string | 否 | — | 分类名称，精确匹配，如 `招牌主菜` |
| status | string | 否 | `all` | `on` / `off` / `all`；`all` 表示不过滤 |
| page | number | 否 | 1 | 页码，从 1 开始 |
| pageSize | number | 否 | 10 | 每页条数，最大 100 |

- **出参（data）**：分页结构，以下为 Mock 真实种子数据（第 1 页前两条）：

```json
{
  "list": [
    {
      "id": "D001",
      "code": "SPU001",
      "name": "麻辣香锅",
      "category": "招牌主菜",
      "price": 68,
      "cost": 26,
      "stock": 12,
      "images": ["data:image/svg+xml;charset=utf-8,…（内联占位图）"],
      "skus": [
        { "id": "D001-01", "code": "SPU001-01", "specName": "小份", "price": 68, "stock": 7 },
        { "id": "D001-02", "code": "SPU001-02", "specName": "大份", "price": 80, "stock": 5 }
      ],
      "attributeGroupIds": ["A001", "A003", "A004"],
      "sales": 1749,
      "status": "on",
      "description": "招牌麻辣锅底，可选微辣/中辣/特辣",
      "updatedAt": "2026-11-03 09:00"
    },
    {
      "id": "D002",
      "code": "SPU002",
      "name": "酸菜鱼",
      "category": "招牌主菜",
      "price": 78,
      "cost": 32,
      "stock": 49,
      "images": ["data:image/svg+xml;charset=utf-8,…（内联占位图）"],
      "skus": [
        { "id": "D002-01", "code": "SPU002-01", "specName": "小份", "price": 78, "stock": 29 },
        { "id": "D002-02", "code": "SPU002-02", "specName": "大份", "price": 90, "stock": 20 }
      ],
      "attributeGroupIds": ["A001", "A003", "A004"],
      "sales": 2156,
      "status": "on",
      "description": "老坛酸菜配黑鱼片，酸辣开胃",
      "updatedAt": "2026-11-02 10:07"
    }
  ],
  "total": 28,
  "page": 1,
  "pageSize": 10
}
```

- **业务规则**：
  - 各筛选条件为 **AND** 关系；参数缺失 / 空串 / `all` 均不参与过滤；
  - 排序：Mock 直接返回内存数组顺序（新增菜品 `unshift` 置顶）；本契约建议后端固定为 `updatedAt desc, id desc`（**待后端确认**，前端表格未依赖具体顺序）；
  - 分页：`page ≥ 1`、`1 ≤ pageSize ≤ 100`；`total` 为筛选后的总数，不是当前页条数；
  - 多门店：菜品当前为总部共享字典，Mock 未按门店隔离；若后续支持门店差异，使用 `X-Store-Id` + 门店菜品关联表过滤（本期不实现）；
  - 已下架（`off`）菜品仍会出现在列表/筛选结果中，仅点单不可用。
- **错误**：`40001`（`page`/`pageSize` 非数字或越界、`status` 非法、`category` 过长）；`40100`；`40300`（门店数据权限）。

### GET /api/v1/dishes/categories/options

- **说明**：菜品分类下拉选项，列表筛选项与新增/编辑表单共用。
- **前端来源**：`src/services/dish.ts` → `fetchCategories()`；页面 `src/pages/Dishes/index.tsx` 挂载时加载
- **入参**：无
- **出参（data）**：字符串数组，以下为 Mock 真实值：

```json
["招牌主菜", "小炒", "主食", "汤羹", "饮品", "甜品", "凉菜", "套餐"]
```

- **业务规则**：
  - 取「分类管理」中启用状态的分类，按排序值升序返回；停用分类不返回；
  - 分类的新增 / 改名 / 停用由「业务 · 分类管理」维护（接口契约待补）；
  - 选项不分页、不做门店过滤。
- **错误**：`40100`；`50000`。

### POST /api/v1/dishes

- **说明**：新增菜品（`saveDish()` 未传 `id` 时调用）。
- **前端来源**：`src/services/dish.ts` → `saveDish()`；页面 `src/pages/Dishes/index.tsx` → `openCreate()` + `handleSave()`
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| code | string | 是 | 商品编码（SPU），全局唯一，如 `SPU029` |
| name | string | 是 | 菜品名称，1~30 字符，保存前去除两端空格 |
| category | string | 是 | 分类名称，须存在于分类字典 |
| cost | number | 是 | 成本（元），`≥ 0`，最多 2 位小数 |
| images | string[] | 否 | 商品图，最多 6 张 |
| skus | DishSkuInput[] | 是 | 规格列表，至少 1 条；每项：`code`（SKU 编码）、`specName`（规格名）、`price`（售价）、`stock`（库存） |
| attributeGroupIds | string[] | 否 | 引用的做法属性组 ID 列表；不存在 / 已停用的 ID 不生效 |
| status | string | 是 | `on` / `off`，页面新增时默认 `on` |
| description | string | 否 | 菜品描述，≤ 120 字符；缺省保存为空串 |

- **出参（data）**：新增后的完整菜品对象（`id`、`sales`、`updatedAt` 由服务端生成）：

```json
{
  "id": "D029",
  "code": "SPU029",
  "name": "蒜蓉西兰花",
  "category": "小炒",
  "price": 28,
  "cost": 10,
  "stock": 100,
  "images": ["data:image/svg+xml;charset=utf-8,…（内联占位图）"],
  "skus": [
    { "id": "D029-01", "code": "SPU029-01", "specName": "标准份", "price": 28, "stock": 100 }
  ],
  "attributeGroupIds": ["A003"],
  "sales": 0,
  "status": "on",
  "description": "现炒蒜香，清爽解腻",
  "updatedAt": "2026-11-04 10:25"
}
```

- **业务规则**：
  - `id` 由服务端生成：Mock 规则为 `D` + `(dishes.length + 1)` 补零 3 位（当前 28 条 → 新增为 `D029`）。**该规则在删除后会复用已存在编码，生产必须改用独立发号器/自增序列，保证编码永久唯一且不可变**；
  - **SPU / SKU**：`price` 取 `skus` 中最低售价、`stock` 取 `skus` 库存合计，均由服务端推导，忽略客户端传值；`skus` 至少 1 条，`specName`/`code` 非空；
  - `code`（商品编码）唯一性：Mock 校验重复并报错，生产冲突返回 `40900`；
  - `images` 最多 6 张，超出返回 `40001`；
  - `attributeGroupIds` 可选，传入不存在的属性组 ID 时忽略（Mock）／生产建议返回 `40001`；属性不参与 `price` / `stock` 计算；
  - `sales` 恒由服务端置 `0`，忽略客户端传值；`updatedAt` 由服务端生成（Mock 只到分钟，契约按 README 统一到秒 `YYYY-MM-DD HH:mm:ss`）；
  - 唯一性：Mock 未校验菜品名称重复，生产建议「同分类下名称唯一」，冲突返回 `40900`；
  - 校验：`category` 不存在 → `40001`；`price`/`cost` 为负数或超 2 位小数 → `40001`；`name` 为空 → `40001`；
  - 新增后列表按契约建议排序回到第 1 页第 1 条（前端 `handleSave` 后会重新 `load()`）。
- **错误**：`40001`（字段校验失败，`message` 指明具体字段）；`40300`；`40900`（分类/名称冲突，生产）；`50000`。

### PUT /api/v1/dishes/{id}

- **说明**：编辑菜品，全量更新可编辑字段（`saveDish()` 传 `id` 时调用）。
- **前端来源**：`src/services/dish.ts` → `saveDish()`；页面 `src/pages/Dishes/index.tsx` → `openEdit()` + `handleSave()`
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 菜品编码，如 `D001` |

- **入参（Body）**：同 `POST /api/v1/dishes` 的 `code`、`name`、`category`、`cost`、`images`、`skus`、`attributeGroupIds`、`status`、`description`（不传 `id`，以 Path 为准）。

- **出参（data）**：更新后的完整菜品对象：

```json
{
  "id": "D001",
  "code": "SPU001",
  "name": "麻辣香锅",
  "category": "招牌主菜",
  "price": 68,
  "cost": 26,
  "stock": 15,
  "images": ["data:image/svg+xml;charset=utf-8,…（内联占位图）"],
  "skus": [
    { "id": "D001-01", "code": "SPU001-01", "specName": "小份", "price": 68, "stock": 10 },
    { "id": "D001-02", "code": "SPU001-02", "specName": "大份", "price": 88, "stock": 5 }
  ],
  "attributeGroupIds": ["A001", "A003", "A004"],
  "sales": 1749,
  "status": "on",
  "description": "招牌麻辣锅底，可选微辣/中辣/特辣",
  "updatedAt": "2026-11-04 10:25"
}
```

- **业务规则**：
  - 目标菜品不存在 → `40400`，`message: "菜品不存在"`（Mock 抛出 `菜品不存在`）；
  - 不可修改：`id`、`sales`、`updatedAt`（服务端生成）；`sales` 即使传入也忽略；
  - 全量语义：`description` 未传时按空串保存（Mock 编辑分支直接 `Object.assign`，未传字段可能写成 `undefined`，前端/后端均应按「可选、缺省空串」处理）；
  - 修改售价/成本只影响后续下单，不影响历史订单（订单明细为下单快照）与历史售后金额；
  - 若菜品已被上架菜单引用，生产需同步刷新菜单/点单缓存（Mock 无此概念）。
- **错误**：`40001`；`40400`；`40300`；`40900`（名称冲突，生产）；`50000`。

### PATCH /api/v1/dishes/{id}/status

- **说明**：上架 / 下架（列表 `Switch` 切换，`checked` 对应 `on`）。
- **前端来源**：`src/services/dish.ts` → `updateDishStatus()`；页面 `src/pages/Dishes/index.tsx` → `handleToggle()`
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 菜品编码，如 `D006` |

- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| status | string | 是 | 目标状态：`on`（上架）/ `off`（下架） |

- **出参（data）**：`null`

- **业务规则**：
  - 幂等：重复设置为同一状态返回成功；相同请求可安全重试；
  - Mock 仅修改 `status`，**不更新 `updatedAt`、不写系统日志**，且 `id` 不存在时静默成功；生产要求：同步 `updatedAt`、写系统日志（`module=菜品管理`、`action=update`）、不存在返回 `40400`；
  - 上下架只影响能否点单，不改变历史订单/售后；下架菜品在列表与筛选中仍可见；
  - 前端在「下架」时二次确认，文案：「下架不影响已生成的订单，用户将无法购买此商品，确定要下架吗？」（上架不弹确认）；
  - 如需「按门店上下架」，建议扩展 `storeIds` 入参或使用门店菜品接口（本期不实现）。
- **错误**：`40001`（`status` 非 `on`/`off`）；`40400`；`40300`；`50000`。

### DELETE /api/v1/dishes/{id}

- **说明**：删除菜品。
- **前端来源**：`src/services/dish.ts` → `removeDish()`；页面 `src/pages/Dishes/index.tsx` → `handleRemove()`
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 菜品编码，如 `D006` |

- **出参（data）**：`null`

- **业务规则**：
  - Mock 为内存**物理删除**，且 `id` 不存在时静默成功；生产建议软删除（`deleted` 标记）或先下架，不存在返回 `40400`；
  - 引用校验：菜品被进行中订单 / 有效菜单引用时应拒绝删除（或仅允许下架），返回 `40900`（Mock 未校验）；
  - 历史订单与售后明细已保存菜品名称、价格快照，删除不影响历史数据展示；
  - 删除后列表按分页重新拉取；若当前页删空，前端需自动回退页码（生产建议后端返回 `total` 供前端判断）。
- **错误**：`40400`；`40900`；`40300`；`50000`。

## 五、Mock 与生产差异（联调必读）

| 项 | Mock 现状 | 契约 / 生产要求 |
| --- | --- | --- |
| 存储 | 内存数组，刷新即恢复 | 落库；删除建议软删除 |
| ID 生成 | `D` + `dishes.length + 1`（删除后可能重复） | 独立发号器，永久唯一 |
| 时间精度 | `updatedAt` 只到分钟（`2026-11-03 09:00`） | 按 README 统一 `YYYY-MM-DD HH:mm:ss` |
| 排序 | 无显式排序，返回数组顺序 | 建议 `updatedAt desc, id desc`（待确认） |
| 校验 | 无名称唯一/分类存在/引用校验 | `40001` / `40900` 完整校验 |
| 错误行为 | 更新/删除不存在时静默成功 | `40400` |
| 上下架 | 仅改 status，不更新 `updatedAt` | 同步 `updatedAt` 并写系统日志 |
| 库存 | 静态字段，下单不扣减；SPU 库存为 SKU 合计 | 需 SKU 级订单扣减 + 库存流水，缺货拦截下单 |
| 规格（SKU） | Mock 内置 1~2 个 SKU（固定规则生成），无 SKU 级上下架 | 建议 SKU 级价格 / 库存 / 条码，可独立上下架 |
| 商品图 | 内联 SVG 占位，dataURL 只存内存 | 对象存储 + CDN，接口返回 URL，限制 ≤ 6 张 |
| 做法属性 | 属性组独立维护、菜品仅存 ID 引用；属性组未参与点单 | 点单时选择并快照到订单明细（groupName + labels），不生成 SKU、不扣库存 |
| 商品编码 | 种子数据唯一，Mock 保存时校验重复 | 全局唯一索引，支持商家自定义编码 |
| 分类 | 分类管理页面维护（Mock 内存） | 独立分类字典 + CRUD |
| 门店维度 | 未隔离，共享字典 | 视业务扩展门店菜品关系 |
| 权限 | 无鉴权 | `Authorization` + 门店数据权限 |

## 六、覆盖自检

| 序号 | 前端函数 | HTTP 接口 | 覆盖 |
| --- | --- | --- | --- |
| 1 | `fetchDishes(query)` | `GET /api/v1/dishes` | ✅ |
| 2 | `fetchCategories()` | `GET /api/v1/dishes/categories/options` | ✅ |
| 3 | `saveDish(input)`（新增） | `POST /api/v1/dishes` | ✅ |
| 4 | `saveDish(input)`（编辑） | `PUT /api/v1/dishes/{id}` | ✅ |
| 5 | `updateDishStatus(id, status)` | `PATCH /api/v1/dishes/{id}/status` | ✅ |
| 6 | `removeDish(id)` | `DELETE /api/v1/dishes/{id}` | ✅ |

- **导出函数覆盖**：`src/services/dish.ts` 共 5 个导出函数（`fetchDishes` / `fetchCategories` / `saveDish` / `updateDishStatus` / `removeDish`），已全部覆盖；
- **接口覆盖**：5 个函数拆为 6 个 HTTP 接口（`saveDish` 按有无 `id` 拆分新增/编辑），已全部覆盖；
- **示例数据**：JSON 示例中的菜品、分类、销量、更新时间均取自 `src/mock/db.ts` 固定种子实际生成值（Mock 今日为 `2026-11-04`），新增/编辑示例的 `id`、`updatedAt` 按 Mock 生成规则推导。
