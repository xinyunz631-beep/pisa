# 订单模块 · 接口契约

- **模块**：订单（订单查询）
- **页面**：订单查询（`/orders/query`）
- **前端 service**：`src/services/order.ts`（2 个导出函数）
- **Mock 数据**：`src/mock/db.ts` → `orders`（204 条，覆盖近 7 天：今天 48 条，前 1~6 天分别为 40 / 34 / 28 / 22 / 18 / 14 条）
- **接口数量**：2 个（列表、详情）

> 通用约定（Base URL、统一响应包裹、分页、字段约定、错误码、REST 命名）见 [README.md](./README.md)。

## 一、模块概览

**页面能力**

- 列表：按订单号 / 客户搜索，按门店、渠道、状态、下单日期区间筛选，服务端分页；
- 详情抽屉：展示订单基础信息（订单号、门店、渠道、桌号、状态、客户、联系电话、下单时间）+ 商品明细表 + 金额合计；
- 列表默认按 `createdAt` 倒序；全部数据来自 Mock 内存数组。

**模块定位**：本模块为**只读查询**，不提供下单、改状态、退款接口；售后退款/换货在 [`08-ops.md`](./08-ops.md) 中处理。

**本期未建模**（`Order` 类型中不存在，不纳入本期契约）：优惠/折扣、配送费、税费、实付金额、支付方式与支付流水、发票、订单备注、订单操作日志、桌台/取餐号、配送地址与骑手。前端字段如需扩展，应同步升级 `src/types.ts` 与本文档版本。

## 二、前端函数 → HTTP 接口映射

| 序号 | 前端函数 | 用途 | Method | Path |
| --- | --- | --- | --- | --- |
| 1 | `fetchOrders(query)` | 订单列表（订单号/客户搜索、门店/渠道/状态/日期筛选 + 分页） | `GET` | `/api/v1/orders` |
| 2 | `fetchOrderById(id)` | 订单详情（含商品明细） | `GET` | `/api/v1/orders/{id}` |

> 说明：列表接口按现有类型返回完整 `items`（Mock 直接返回内存对象）。真实后端如需缩小列表报文，可改为列表不带 `items`、详情单独拉取，但需同步调整前端类型；本期契约与前端类型保持一致，**列表含 `items`**。
>
> `fetchOrderById()` 目前未在页面中调用（列表页直接用行数据渲染详情），作为详情刷新 / 深链接的预留接口；建议前端改为进入详情时调用本接口。

## 三、枚举与状态字典

### 3.1 订单渠道（`OrderChannel`）

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `dine-in` | 堂食 | 有桌号，返回 `tableNo`，如 `A11` |
| `takeaway` | 自提 | 无桌号，`tableNo` 为 `undefined`/缺省 |
| `delivery` | 外卖 | 无桌号，`tableNo` 为 `undefined`/缺省 |

### 3.2 订单状态（`OrderStatus`）

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `pending` | 待接单 | 已下单，未接单 |
| `serving` | 制作中 | 已接单，制作 / 出餐 / 配送中 |
| `completed` | 已完成 | 正常完结 |
| `refunded` | 已退款 | 退款终态 |

**业务语义上的流转**（本模块只读，不提供变更接口，仅供后端设计状态机参考）：

```text
pending（待接单） ──▶ serving（制作中） ──▶ completed（已完成）

任意进行中状态 ──退款/售后审核通过──▶ refunded（已退款）
```

> 注意：
> - 当前 Mock 的订单状态由种子随机生成，**不反映真实流转**，也没有状态变更接口；
> - 售后审核通过（`08-ops.md` 的 `POST /api/v1/after-sales/{id}/audit`，动作 `approve`）在业务上应联动关联订单变为 `refunded`（退款/退货）或保持原状态（换货）；**Mock 未实现该联动**，生产需在同一事务或最终一致流程中处理；
> - 若后续需要「接单 / 完成 / 退款」操作，按 README 的 REST 约定扩展 `PATCH /api/v1/orders/{id}/status`。

### 3.3 Order 字段字典

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 订单号，`BS` + `YYYYMMDD`（下单日期）+ 4 位当日序号，如 `BS202611040001`；全局唯一、不可变 |
| `storeId` | string | 门店 ID，如 `ST007`，与门店模块一致 |
| `storeName` | string | 门店名称（冗余展示字段，与 `storeId` 对应），如 `杭州西湖店` |
| `channel` | string | 订单渠道，见 3.1 |
| `status` | string | 订单状态，见 3.2 |
| `tableNo` | string（可缺省） | 桌号，仅堂食返回（如 `A11`）；自提/外卖不返回该字段 |
| `customer` | string | 客户姓名（Mock 为顾客昵称/姓名，如 `张伟`） |
| `phone` | string | 联系电话；Mock 为脱敏格式 `177****1376`，生产按权限返回明文或脱敏 |
| `amount` | number | 订单金额（元），`= Σ(items.price × qty)`；Mock 无优惠/配送费，暂等于应付金额 |
| `items` | OrderItem[] | 商品明细，下单快照；见 3.4 |
| `createdAt` | string | 下单时间，格式见 README（Mock 只到分钟，如 `2026-11-04 16:18`） |

### 3.4 OrderItem 字段字典

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `dishId` | string | 菜品编码，如 `D022`；菜品后续删除/改名不影响历史订单 |
| `name` | string | 菜品名称（下单时快照） |
| `qty` | number | 数量，`≥ 1` |
| `price` | number | 单价（元，下单时价格快照） |

> Mock 生成订单明细时可能重复选中同一菜品（每条为独立行，如 `D005` 出现两次），真实接口建议每行增加 `itemId` 并选择「按行展示」或「合并同菜品数量」；当前前端按行展示、行 key 为 `dishId + name`，若同单出现重复菜品需改为行内唯一 key（联调时注意）。

## 四、接口明细

### GET /api/v1/orders

- **说明**：订单列表，支持订单号/客户搜索、门店、渠道、状态、下单日期区间筛选，按 `createdAt` 倒序分页返回。
- **前端来源**：`src/services/order.ts` → `fetchOrders()`；页面 `src/pages/Orders/index.tsx` → `load()`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | string | 否 | — | 订单号（包含，忽略大小写）或客户姓名（包含）；空串/空白不参与过滤 |
| storeId | string | 否 | — | 门店 ID 精确匹配，如 `ST007`；**建议后端支持（当前前端未传）**，与 `X-Store-Id` 权限模型对齐 |
| storeName | string | 否 | — | 门店名称精确匹配，如 `杭州西湖店`；仅作兼容保留，**新前端联调后应改传 `storeId`** |
| channel | string | 否 | `all` | `dine-in` / `takeaway` / `delivery` / `all` |
| status | string | 否 | `all` | `pending` / `serving` / `completed` / `refunded` / `all` |
| startDate | string | 否 | — | 下单开始日期 `YYYY-MM-DD`（闭区间，含当天），对应 Mock 的 `range[0]` |
| endDate | string | 否 | — | 下单结束日期 `YYYY-MM-DD`（闭区间，含当天），对应 Mock 的 `range[1]` |
| page | number | 否 | 1 | 页码，从 1 开始 |
| pageSize | number | 否 | 10 | 每页条数，最大 100 |

> 参数映射：前端 `OrderQuery.range` 是 `[startDate, endDate]` 二元组（由 `DatePicker.RangePicker` 生成），HTTP 层拆为 `startDate` / `endDate` 两个 Query 参数；只传一个时按单边过滤。
>
> 门店筛选口径：统一以 `storeId` 为准（与门店主数据、`X-Store-Id` 权限模型对齐）；后端可同时兼容 `storeName` 便于 Mock 期前端联调，二者都传时需校验一致。

- **出参（data）**：分页结构，以下为 Mock 真实种子数据（示例按 `createdAt` 倒序排列）：

```json
{
  "list": [
    {
      "id": "BS202611040001",
      "storeId": "ST007",
      "storeName": "杭州西湖店",
      "channel": "takeaway",
      "status": "completed",
      "customer": "张伟",
      "phone": "177****1376",
      "amount": 66,
      "items": [
        { "dishId": "D022", "name": "酸辣土豆丝", "qty": 3, "price": 22 }
      ],
      "createdAt": "2026-11-04 16:18"
    },
    {
      "id": "BS202611040011",
      "storeId": "ST003",
      "storeName": "北京朝阳店",
      "channel": "dine-in",
      "status": "completed",
      "tableNo": "A11",
      "customer": "杨静",
      "phone": "177****1521",
      "amount": 44,
      "items": [
        { "dishId": "D028", "name": "柠檬水", "qty": 2, "price": 10 },
        { "dishId": "D011", "name": "小笼包（6只）", "qty": 1, "price": 24 }
      ],
      "createdAt": "2026-11-04 13:38"
    },
    {
      "id": "BS202611040025",
      "storeId": "ST010",
      "storeName": "武汉江汉路店",
      "channel": "dine-in",
      "status": "serving",
      "tableNo": "A08",
      "customer": "周涛",
      "phone": "138****1134",
      "amount": 32,
      "items": [
        { "dishId": "D009", "name": "蛋炒饭", "qty": 1, "price": 18 },
        { "dishId": "D026", "name": "南瓜粥", "qty": 1, "price": 14 }
      ],
      "createdAt": "2026-11-04 11:23"
    }
  ],
  "total": 204,
  "page": 1,
  "pageSize": 10
}
```

- **业务规则**：
  - 排序：`createdAt` 倒序（Mock 用字符串 `localeCompare` 倒序）；分页需稳定，建议契约固定为 `createdAt desc, id desc`（**待后端确认**，Mock 无 tie-break）；
  - 筛选条件为 **AND** 关系；参数缺失 / 空串 / `all` 不参与过滤；
  - 日期区间：按 `createdAt` 的日期部分（`YYYY-MM-DD`）比较，`startDate`、`endDate` 均为闭区间，即当天 00:00:00~23:59:59 都命中；`startDate > endDate` 返回 `40001`；
  - `keyword` 先 `trim`；为空不参与；订单号匹配忽略大小写（`bs...` 也能命中），客户姓名按包含匹配；
  - 门店权限：`X-Store-Id` 有值时仅返回该门店订单；不传表示总部/全部门店视角；无权限返回 `40300`；
  - 分页：`page ≥ 1`、`1 ≤ pageSize ≤ 100`；`total` 为筛选后总数；
  - 列表返回完整 `items`（与前端类型一致）；若生产做列表瘦身，需放宽前端 `Order.items` 为可选并在详情接口补全。
- **错误**：`40001`（`page`/`pageSize`/`channel`/`status` 非法、日期格式错误或 `startDate > endDate`）；`40100`；`40300`（门店数据权限）。

### GET /api/v1/orders/{id}

- **说明**：订单详情，包含基础信息与完整商品明细。
- **前端来源**：`src/services/order.ts` → `fetchOrderById()`；当前页面详情抽屉使用列表行数据渲染，该接口为预留 / 独立刷新用
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 订单号，如 `BS202611040011` |

- **入参（Query）**：无
- **出参（data）**：完整订单对象，以下为 Mock 真实种子数据：

```json
{
  "id": "BS202611040011",
  "storeId": "ST003",
  "storeName": "北京朝阳店",
  "channel": "dine-in",
  "status": "completed",
  "tableNo": "A11",
  "customer": "杨静",
  "phone": "177****1521",
  "amount": 44,
  "items": [
    { "dishId": "D028", "name": "柠檬水", "qty": 2, "price": 10 },
    { "dishId": "D011", "name": "小笼包（6只）", "qty": 1, "price": 24 }
  ],
  "createdAt": "2026-11-04 13:38"
}
```

- **业务规则**：
  - 订单不存在 → `40400`（Mock 返回 `undefined`，前端需容错并提示「订单不存在」）；
  - 明细按 `items` 原顺序返回；金额合计由前端 `Σ(price × qty)` 计算展示，生产应保证 `amount` 与明细合计一致（若引入优惠，需另给 `discountAmount` / `payAmount`，见差异表）；
  - 电话按数据权限返回明文或脱敏；跨门店查看需校验门店数据权限，无权限 `40300`；
  - 详情为只读，不返回售后单列表；售后工单通过 `GET /api/v1/after-sales?keyword={orderId}` 查询。
- **错误**：`40001`（`id` 格式非法）；`40100`；`40300`；`40400`。

## 五、Mock 与生产差异（联调必读）

| 项 | Mock 现状 | 契约 / 生产要求 |
| --- | --- | --- |
| 存储 | 内存数组（204 条），刷新即恢复 | 落库，订单主表 + 明细表 |
| 时间精度 | `createdAt` 只到分钟（`2026-11-04 16:18`） | 按 README 统一 `YYYY-MM-DD HH:mm:ss` |
| 订单状态 | 种子随机生成，无状态机、无变更接口 | 后端状态机 + 操作日志；按需扩展 `PATCH /orders/{id}/status` |
| 金额 | 仅有 `amount`，无优惠/配送费/支付信息 | 扩展 `discountAmount`、`deliveryFee`、`payAmount`、`payMethod` 等字段并升级文档 |
| 门店筛选 | 服务层按 `storeName` 精确过滤 | 建议同时支持 `storeId`；门店数据权限按 `X-Store-Id` 过滤 |
| 搜索性能 | Mock 全量遍历 | 订单号前缀/精确、手机号精确走索引；模糊搜索限制范围或异步导出 |
| 明细快照 | 已保存 `dishId/name/price/qty` | 生产同样落快照，禁止直接 join 当前菜品表 |
| 明细重复行 | 随机生成可能重复同一 `dishId` | 建议增加 `itemId`，明确定义同菜品是否合并 |
| 售后联动 | 审核通过不修改订单状态 | 退款/退货通过后订单应转 `refunded`（事务/最终一致） |
| 分页 | 前端内存分页 | 服务端分页并返回 `total` |

## 六、覆盖自检

| 序号 | 前端函数 | HTTP 接口 | 覆盖 |
| --- | --- | --- | --- |
| 1 | `fetchOrders(query)` | `GET /api/v1/orders` | ✅ |
| 2 | `fetchOrderById(id)` | `GET /api/v1/orders/{id}` | ✅ |

- **导出函数覆盖**：`src/services/order.ts` 共 2 个导出函数（`fetchOrders` / `fetchOrderById`），已全部覆盖；
- **接口覆盖**：2 个函数对应 2 个 HTTP 接口，已全部覆盖；
- **筛选覆盖**：订单号/客户搜索（`keyword`）、门店（`storeName`，建议扩展 `storeId`）、渠道、状态、日期区间（`startDate` / `endDate`）均已映射；
- **示例数据**：JSON 示例中的订单号、门店、渠道、桌号、客户、金额、明细、时间均取自 `src/mock/db.ts` 固定种子实际生成值（Mock 今日为 `2026-11-04`）。
