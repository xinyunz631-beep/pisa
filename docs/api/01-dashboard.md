# 数据模块 · 接口契约

- **模块**：数据（顶部第一个模块）
- **页面**：仪表盘（`/data/dashboard`）
- **前端 service**：`src/services/dashboard.ts`
- **Mock 数据**：`src/mock/db.ts`（门店 `stores`、订单 `orders`）
- **接口数量**：2 个（1 个聚合看板 + 1 个通用门店下拉）

> 通用约定（Base URL、响应包裹、分页、字段类型、错误码）见 [README.md](./README.md)。

## 一、前端函数 → HTTP 接口映射

| 前端函数 | 用途 | Method | Path |
| --- | --- | --- | --- |
| `fetchDashboard()` | 仪表盘聚合数据 | `GET` | `/api/v1/dashboard/summary` |
| `fetchStoreOptions()` | 顶栏门店切换下拉 | `GET` | `/api/v1/stores/options` |

## 二、枚举与字典

### 订单状态（`OrderStatus`，用于最近订单）

| 值 | 中文 |
| --- | --- |
| `pending` | 待接单 |
| `serving` | 制作中 |
| `completed` | 已完成 |
| `refunded` | 已退款 |

### 订单渠道（`OrderChannel`）

| 值 | 中文 |
| --- | --- |
| `dine-in` | 堂食 |
| `takeaway` | 自提 |
| `delivery` | 外卖 |

### KPI 指标键（`Kpi.key`）

| key | 含义 | 单位 |
| --- | --- | --- |
| `turnover` | 今日营业额 | 元 |
| `orders` | 今日订单量 | 单 |
| `avg` | 客单价 | 元 |
| `members` | 新增会员 | 人 |

## 三、接口明细

### GET /api/v1/dashboard/summary

- **说明**：返回仪表盘全部聚合数据（KPI、近 7 日营业额趋势、今日门店营业额排行、最近订单）。
- **前端来源**：`src/services/dashboard.ts` → `fetchDashboard()`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| date | string | 否 | 统计日期 `YYYY-MM-DD`，默认今天 |
| storeId | string | 否 | 指定门店；不传=全部门店。也可用请求头 `X-Store-Id` |

- **出参（data）**：

```json
{
  "kpis": [
    { "key": "turnover", "title": "今日营业额", "value": 6128, "unit": "元", "delta": 20.2, "hint": "较昨日" },
    { "key": "orders", "title": "今日订单量", "value": 43, "unit": "单", "delta": 22.9, "hint": "较昨日" },
    { "key": "avg", "title": "客单价", "value": 143, "unit": "元", "delta": -2.2, "hint": "较昨日" },
    { "key": "members", "title": "新增会员", "value": 123, "unit": "人", "delta": 24.2, "hint": "较昨日" }
  ],
  "trend": [
    { "label": "10-29 周四", "value": 1233 },
    { "label": "10-30 周五", "value": 2750 },
    { "label": "10-31 周六", "value": 3300 },
    { "label": "11-01 周日", "value": 3560 },
    { "label": "11-02 周一", "value": 3580 },
    { "label": "11-03 周二", "value": 4700 },
    { "label": "11-04 周三", "value": 6128 }
  ],
  "ranking": [
    { "storeId": "ST008", "name": "成都春熙店", "turnover": 1208, "orders": 6 },
    { "storeId": "ST004", "name": "北京海淀店", "turnover": 1186, "orders": 5 },
    { "storeId": "ST005", "name": "广州天河店", "turnover": 834, "orders": 4 }
  ],
  "recentOrders": [
    {
      "id": "BS202611040048",
      "storeId": "ST012",
      "storeName": "苏州观前店",
      "channel": "takeaway",
      "status": "completed",
      "tableNo": null,
      "customer": "周涛",
      "phone": "138****5678",
      "amount": 92,
      "items": [
        { "dishId": "D003", "name": "宫保鸡丁", "qty": 1, "price": 38 },
        { "dishId": "D009", "name": "蛋炒饭", "qty": 3, "price": 18 }
      ],
      "createdAt": "2026-11-04 21:56:00"
    }
  ]
}
```

- **字段说明**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| kpis[].key | string | 指标键，见上方字典 |
| kpis[].value | number | 指标值（金额单位元） |
| kpis[].delta | number | 较昨日变化百分比，正数上升、负数下降，保留 1 位小数 |
| trend[].label | string | `MM-DD 周X` |
| trend[].value | number | 当日营业额（元，已剔除已退款订单） |
| ranking[].turnover | number | 当日营业额（元，已剔除已退款订单） |
| ranking[].orders | number | 当日有效订单数 |
| recentOrders | Order[] | 最近 5 笔订单，结构同 [07-order.md](./07-order.md) |

- **计算口径（Mock 已实现，后端需保持一致）**：
  - 有效订单：排除 `status = refunded`
  - 今日营业额 = 当日有效订单 `amount` 求和
  - 今日订单量 = 当日有效订单数
  - 客单价 = 今日营业额 / 今日订单量，四舍五入取整
  - 新增会员 = 当日会员新增数（Mock 用订单量 × 2 + 37 模拟，真实实现需按会员注册时间统计当日新增）
  - 环比 `delta` = (今日 − 昨日) / 昨日 × 100，保留 1 位小数；昨日为 0 时返回 0
  - 趋势：最近 7 个自然日（含今日）每日营业额
  - 排行：按今日营业额倒序取 TOP 6
  - 最近订单：按 `createdAt` 倒序取 5 条
- **性能建议**：看板为高频聚合接口，建议 Redis 缓存 1~5 分钟；`date` 参数用于补看历史看板。

### GET /api/v1/stores/options

- **说明**：门店下拉选项，供顶栏「门店切换」、订单/配送/营销等模块的筛选使用（跨模块通用）。
- **前端来源**：`src/services/dashboard.ts` → `fetchStoreOptions()`；`src/services/business.ts` → `fetchBusinessStoreOptions()`、`src/services/marketing.ts` → `fetchStoreOptions()`
- **入参**：无
- **出参（data）**：

```json
[
  { "label": "上海静安店", "value": "ST001" },
  { "label": "上海徐汇店", "value": "ST002" },
  { "label": "北京朝阳店", "value": "ST003" }
]
```

- **业务规则**：
  - 只返回正常营业 / 筹备中 / 停业中的全部门店（Mock 返回全部 12 家）
  - 按用户数据权限过滤门店（总部看全部，店长只看本店）
  - `value` 与订单、配送规则等接口中的 `storeId` 一致

## 四、覆盖自检

- [x] `fetchDashboard` → `GET /api/v1/dashboard/summary`
- [x] `fetchStoreOptions` → `GET /api/v1/stores/options`（跨模块公共接口，见 README「跨模块公共接口与引用约定」）
- [x] KPI 计算口径、趋势/排行/最近订单取数逻辑已写明
