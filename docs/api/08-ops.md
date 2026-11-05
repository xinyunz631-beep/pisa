# 售后与系统模块 · 接口契约

- **模块**：订单（售后处理）/ 系统（岗位管理、人员管理、系统日志）
- **页面**：
  - 售后处理（`/orders/after-sale`）
  - 岗位管理（`/system/positions`）
  - 人员管理（`/system/staff`）
  - 系统日志（`/system/logs`）
- **前端 service**：`src/services/ops.ts`（10 个导出函数，另 re-export 12 个 DTO 类型）
- **Mock 数据**：`src/mock/ops.ts`（售后工单 24 条、岗位 22 条、人员 26 条、系统日志 60 条）
- **接口数量**：12 个（售后 2、岗位 5、人员 4、日志 1；`savePosition` / `saveStaff` 为 upsert，按是否传 `id` 拆成 `POST` + `PUT`）

> 通用约定（Base URL、统一响应包裹、分页、字段约定、错误码、REST 命名）见 [README.md](./README.md)。

## 一、模块概览

### 1.1 页面与能力

| 页面 | 路由 | 能力 |
| --- | --- | --- |
| 售后处理 | `/orders/after-sale` | 工单列表（关键词/状态/类型筛选 + 分页）；详情抽屉（工单信息、订单商品明细、处理记录时间线）；「通过」/「拒绝」审核 |
| 岗位管理 | `/system/positions` | 岗位列表（名称/状态筛选 + 分页）；部门下拉选项；新增 / 编辑（名称、编码、部门、状态）；删除 |
| 人员管理 | `/system/staff` | 人员列表（姓名/工号/手机号、岗位、门店、状态筛选 + 分页）；表单选项（岗位/门店/角色）；新增 / 编辑；详情（只读，展示账号信息） |
| 系统日志 | `/system/logs` | 只读检索：操作人/模块关键词、操作类型、时间范围 + 分页 |

### 1.2 数据流与共性约定

- 前端数据流：`页面 → src/services/ops.ts → src/mock/ops.ts 内存数组`。真实后端只需替换 service 层实现，页面无需改动。
- **操作人**：Mock 审核接口固定写 `当前客服`，岗位/人员操作不记录操作人；生产必须从登录态（token）取当前用户，并写入系统日志。
- **系统日志联动**：Mock 的日志为独立种子数据，CRUD 操作不会产生日志；生产要求岗位/人员/售后/菜品等所有写操作都写系统日志（见 `GET /api/v1/logs` 规则）。
- **时间**：Mock 的「当前时刻」固定为 `2026-11-04 06:30`（`MOCK_NOW`），审核记录、新建岗位/人员的日期均用它，保证不出现未来时间；生产使用服务端当前时间。
- **分页**：Mock 为前端内存分页，真实接口由服务端分页并返回 `total`。
- **权限**：售后审核需售后/运营审核权限，岗位/人员/日志等系统设置建议仅总部管理员可见；门店数据权限按 `X-Store-Id` 过滤（Mock 未隔离）。

## 二、前端函数 → HTTP 接口映射

| 序号 | 前端函数 | 用途 | Method | Path |
| --- | --- | --- | --- | --- |
| 1 | `fetchAfterSales(query)` | 售后工单列表（关键词/状态/类型筛选 + 分页） | `GET` | `/api/v1/after-sales` |
| 2 | `auditAfterSale(id, action)` | 售后审核（通过 / 拒绝） | `POST` | `/api/v1/after-sales/{id}/audit` |
| 3 | `fetchPositions(query)` | 岗位列表（名称/状态筛选 + 分页） | `GET` | `/api/v1/positions` |
| 4 | `fetchPositionDepartments()` | 岗位所属部门下拉选项 | `GET` | `/api/v1/positions/departments/options` |
| 5 | `savePosition(input)`（`input.id` 为空） | 新增岗位 | `POST` | `/api/v1/positions` |
| 6 | `savePosition(input)`（`input.id` 非空） | 编辑岗位 | `PUT` | `/api/v1/positions/{id}` |
| 7 | `removePosition(id)` | 删除岗位 | `DELETE` | `/api/v1/positions/{id}` |
| 8 | `fetchStaff(query)` | 人员列表（关键词/岗位/门店/状态筛选 + 分页） | `GET` | `/api/v1/staff` |
| 9 | `fetchStaffFormOptions()` | 人员表单选项（岗位/门店/角色） | `GET` | `/api/v1/staff/form-options` |
| 10 | `saveStaff(input)`（`input.id` 为空） | 新增人员 | `POST` | `/api/v1/staff` |
| 11 | `saveStaff(input)`（`input.id` 非空） | 编辑人员 | `PUT` | `/api/v1/staff/{id}` |
| 12 | `fetchLogs(query)` | 系统日志列表（操作人/模块/类型/时间范围筛选 + 分页） | `GET` | `/api/v1/logs` |

> 说明：
> - 映射表按 HTTP 接口拆行，共 12 个接口；对应 10 个导出函数（`savePosition`、`saveStaff` 各拆 2 条）。
> - `src/services/ops.ts` 还 re-export 了 `AfterSaleTicket`、`AfterSaleItem`、`AfterSaleRecord`、`Position`、`Staff`、`SystemLog` 等 12 个类型，它们是 DTO 定义，不产生接口。
> - 售后工单**没有单独的详情接口**：页面列表返回完整 `items` / `records`，详情抽屉直接用列表行对象。生产建议列表瘦身并扩展 `GET /api/v1/after-sales/{id}`（本期不交付，需前端同步调整）。
> - 人员**没有删除接口**：页面只提供新增/编辑/详情；离职/停用通过编辑 `status=disabled` 处理（生产建议扩展 `PATCH /api/v1/staff/{id}/status` 或 `DELETE`）。

## 三、枚举与状态字典

### 3.1 售后类型（`AfterSaleType`）

| 值 | 中文 | 审核通过后的业务动作 | Mock 追加的处理文案 |
| --- | --- | --- | --- |
| `refund` | 退款 | 原路退回售后金额 | 审核通过，款项已原路退回 |
| `return` | 退货 | 退货退款（原路退回） | 审核通过，款项已原路退回 |
| `exchange` | 换货 | 安排换货补发 | 审核通过，已安排换货补发 |

> 售后原因（`reason`）为字符串，Mock 按类型给出候选值：
> - `refund`：菜品口味与描述不符 / 上菜时间过长 / 重复下单 / 误点下单 / 少送商品
> - `return`：食材不新鲜 / 包装破损 / 菜品温度不足 / 分量与菜单不符
> - `exchange`：菜品撒漏 / 错送菜品 / 餐具缺失 / 菜品与订单不符
>
> 生产建议将售后原因做成按类型配置的字典（`reasonCode` + 展示文案），并允许补充文字说明。

### 3.2 售后状态（`AfterSaleStatus`）

| 值 | 中文 | 说明 | 是否可审核 |
| --- | --- | --- | --- |
| `pending` | 待处理 | 客户已提交申请，等待客服受理/审核 | 是 |
| `processing` | 处理中 | 客服已受理、正在核实订单信息，等待审核 | 是 |
| `done` | 已完成 | 审核通过（退款/退货/换货完成） | 否（终态） |
| `rejected` | 已拒绝 | 审核拒绝 | 否（终态） |

> **以代码为准**：`src/mock/ops.ts` 实际枚举为 `pending` / `processing` / `done` / `rejected`，**不存在** `serving` / `completed` / `refunded`。前端标签映射为「待处理 / 处理中 / 已完成 / 已拒绝」；后端若使用其他命名，必须在 service 层做映射，接口契约以本表为准。

### 3.3 售后状态流转（必读）

```text
                       ┌──── approve（审核通过）────▶ done（已完成，终态）
pending（待处理）──────┤
                       └──── reject（审核拒绝）─────▶ rejected（已拒绝，终态）

                     ┌──── approve（审核通过）────▶ done（已完成，终态）
processing（处理中）──┤
                     └──── reject（审核拒绝）─────▶ rejected（已拒绝，终态）
```

| 当前状态 | 允许动作 | 目标状态 | 触发接口 | 前置条件 |
| --- | --- | --- | --- | --- |
| `pending` | `approve` | `done` | `POST /api/v1/after-sales/{id}/audit` | 有审核权限 |
| `pending` | `reject` | `rejected` | `POST /api/v1/after-sales/{id}/audit` | 有审核权限，建议备注拒绝原因 |
| `processing` | `approve` | `done` | `POST /api/v1/after-sales/{id}/audit` | 有审核权限 |
| `processing` | `reject` | `rejected` | `POST /api/v1/after-sales/{id}/audit` | 有审核权限，建议备注拒绝原因 |
| `done` / `rejected` | 任意审核 | 不变 | 同上，返回 `40900` | 终态，不允许再次审核 |

**流转规则**

1. 前端按钮可用条件：`detail.status === 'pending' || detail.status === 'processing'`；`done` / `rejected` 时「通过」「拒绝」按钮禁用，并提示「该工单已处理完成，无需重复操作」。
2. **`pending → processing` 当前没有接口**：Mock 的 `processing` 仅来自种子数据；真实后端应在客服「受理/接单」动作时落 `processing`（建议扩展 `POST /api/v1/after-sales/{id}/accept`，本期不交付，需前端补按钮）。
3. 每次审核都要向 `records` **追加**一条处理记录，禁止修改/删除历史记录；记录包含 `time`、`operator`、`action`。
4. 审核通过的业务联动（生产）：`refund` / `return` 调用支付退款并记录退款单号，`exchange` 生成换货补发单；同时把关联订单状态改为 `refunded`（Mock 未实现，需后端事务/最终一致处理）。
5. 审核拒绝：必须记录拒绝原因（备注），并通知客户（Mock 仅追加文案，不发送通知）。
6. 金额不可修改：审核动作不改变 `amount`；`amount = Σ(items.price × qty)`，退款金额以工单金额为准（如有部分退款，需扩展 `refundAmount` 字段，本期不建模）。

### 3.4 审核处理记录与文案（`AfterSaleRecord`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `time` | string | 处理时间（Mock 审核固定写 `2026-11-04 06:30`；生产为服务端当前时间） |
| `operator` | string | 操作人（Mock 种子为客户/客服/审核人昵称；审核接口固定 `当前客服`；生产取登录用户姓名/工号） |
| `action` | string | 处理描述，前端 Timeline 展示 |

`auditAfterSale()` 追加记录文案规则（以代码为准）：

| 动作 | 售后类型 | 追加记录 `action` |
| --- | --- | --- |
| `approve` | `exchange` | 审核通过，已安排换货补发 |
| `approve` | `refund` / `return` | 审核通过，款项已原路退回 |
| `reject` | 任意 | 审核拒绝，已通知客户并说明原因 |

> Mock 种子历史数据中的拒绝记录文案为「审核拒绝：不符合售后条件」，与审核接口文案略有不同；本契约统一为「审核拒绝，已通知客户并说明原因」，并要求携带备注原因。建议 `records` 扩展 `operatorId`、`remark` 字段（生产）。

### 3.5 岗位状态（`PositionStatus`）

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `active` | 启用 | 可被人员岗位选择使用 |
| `disabled` | 停用 | 不再新增该岗位人员；历史人员保留 |

### 3.6 人员状态（`StaffStatus`）

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `active` | 在职 | 账号可用 |
| `disabled` | 停用 | 账号不可登录；Mock 展示规则：`lastLogin` 显示「账号已停用」、`loginIp` 显示「—」 |

### 3.7 系统日志操作类型（`LogAction`）

| 值 | 中文 |
| --- | --- |
| `create` | 新增 |
| `update` | 编辑 |
| `delete` | 删除 |
| `login` | 登录 |
| `export` | 导出 |

### 3.8 系统日志结果（`LogResult`）

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `success` | 成功 | — |
| `fail` | 失败 | 失败请求仍需记录，`duration` 通常更长（Mock 失败耗时 800~1700ms） |

### 3.9 售后工单字段字典（`AfterSaleTicket`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 工单号，`AS` + 申请日期 `YYYYMMDD` + 4 位序号，如 `AS202611040001`；不可变 |
| `orderId` | string | 关联订单号，如 `BS202611042001`；**Mock 售后数据的订单号是按申请日期构造的（`BS` + 日期 + `2001` 起的 4 位序号），与订单模块种子数据不是同一批**；生产必须关联真实订单并校验存在 |
| `storeName` | string | 门店名称，如 `广州天河店` |
| `customer` | string | 客户姓名，如 `李娜` |
| `phone` | string | 联系电话，Mock 为脱敏格式 `138****3275` |
| `type` | string | 售后类型，见 3.1 |
| `reason` | string | 售后原因（字符串），见 3.1 候选值 |
| `amount` | number | 售后金额（元），`= Σ(items.price × qty)` |
| `status` | string | 售后状态，见 3.2 |
| `appliedAt` | string | 申请时间，格式见 README（Mock 只到分钟） |
| `items` | AfterSaleItem[] | 订单商品明细，见下表 |
| `records` | AfterSaleRecord[] | 处理记录时间线，按时间正序追加 |

**AfterSaleItem**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 菜品名称（快照） |
| `price` | number | 单价（元，快照） |
| `qty` | number | 数量，`≥ 1` |

> 售后明细没有 `dishId`（与订单明细不同），生产建议补充 `dishId` / `orderItemId` 以便对账。

### 3.10 岗位字段字典（`Position`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 岗位 ID，`P` + 3 位序号，如 `P001`；服务端生成 |
| `name` | string | 岗位名称，最长 20 字符，如 `门店店长` |
| `code` | string | 岗位编码，保存时去除空格并转大写，如 `POS002`；2~20 位字母/数字/下划线/中划线；全局唯一 |
| `department` | string | 所属部门，如 `门店运营部`，取值见部门选项接口 |
| `staffCount` | number | 在岗人数，只读；新增时置 `0`；生产建议由人员数据实时聚合（Mock 为种子值） |
| `status` | string | 岗位状态，见 3.5 |
| `createdAt` | string | 创建日期 `YYYY-MM-DD` |

### 3.11 人员字段字典（`Staff`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 人员 ID，`S` + 3 位序号，如 `S001`；服务端生成 |
| `name` | string | 姓名，如 `张伟` |
| `employeeNo` | string | 工号，保存时转大写，如 `EMP1001`；3~12 位字母/数字；全局唯一 |
| `phone` | string | 手机号，Mock 为 11 位明文；生产列表建议脱敏、编辑回显按权限处理 |
| `position` | string | 岗位名称（字符串，来自岗位列表），如 `收银员` |
| `storeName` | string | 所属门店名称，如 `武汉江汉路店` |
| `status` | string | 人员状态，见 3.6 |
| `joinedAt` | string | 入职日期 `YYYY-MM-DD`，不得晚于当天 |
| `email` | string | 邮箱，Mock 规则 `staff{3 位序号}@pisa.com`，新增时服务端生成，不可编辑 |
| `role` | string | 权限角色，如 `门店员工`；新增时服务端默认 `门店员工`，不可由表单指定 |
| `lastLogin` | string | 最近登录时间；停用账号显示「账号已停用」 |
| `loginIp` | string | 最近登录 IP；停用账号显示「—」 |

> 人员表单没有「角色」字段（`StaffFormOptions.roles` 只作为选项下发，页面未使用）；生产和后续版本建议开放角色分配，需要同步扩展表单与契约。

### 3.12 系统日志字段字典（`SystemLog`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 日志 ID，`LOG` + 3 位序号，如 `LOG001` |
| `time` | string | 操作时间，格式见 README（Mock 只到分钟） |
| `operator` | string | 操作人姓名，如 `马超` |
| `module` | string | 所属模块，取值示例：订单管理、售后处理、会员管理、菜品管理、营销活动、资产中心、门店管理、岗位管理、人员管理、系统设置 |
| `action` | string | 操作类型，见 3.7 |
| `ip` | string | 操作 IP，如 `10.0.8.102` |
| `result` | string | 操作结果，见 3.8；失败示例：`LOG019`（2026-11-01 16:59，王强，门店管理，create，fail，1114ms） |
| `duration` | number | 耗时（毫秒），成功通常 20~500，失败通常 800~1700（Mock） |

## 四、接口明细

**（一）售后处理**

### GET /api/v1/after-sales

- **说明**：售后工单列表，支持工单号/订单号/客户/门店关键词、售后状态、售后类型筛选，按申请时间倒序分页返回（含商品明细与处理记录）。
- **前端来源**：`src/services/ops.ts` → `fetchAfterSales()`；页面 `src/pages/AfterSale/index.tsx` → `load()`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | string | 否 | — | 工单号 / 订单号（包含，忽略大小写）或客户姓名 / 门店名称（包含）；空串/空白不参与过滤 |
| status | string | 否 | `all` | `pending` / `processing` / `done` / `rejected` / `all` |
| type | string | 否 | `all` | `refund` / `return` / `exchange` / `all` |
| page | number | 否 | 1 | 页码，从 1 开始 |
| pageSize | number | 否 | 10 | 每页条数，最大 100 |

- **出参（data）**：分页结构，以下为 Mock 真实种子数据（按 `appliedAt` 倒序第 1 页前三条）：

```json
{
  "list": [
    {
      "id": "AS202611040001",
      "orderId": "BS202611042001",
      "storeName": "广州天河店",
      "customer": "李娜",
      "phone": "138****3275",
      "type": "return",
      "reason": "包装破损",
      "amount": 112,
      "status": "pending",
      "appliedAt": "2026-11-04 04:30",
      "items": [
        { "name": "红烧肉", "price": 56, "qty": 2 }
      ],
      "records": [
        { "time": "2026-11-04 04:30", "operator": "李娜", "action": "客户提交售后申请" }
      ]
    },
    {
      "id": "AS202611040004",
      "orderId": "BS202611042004",
      "storeName": "武汉江汉路店",
      "customer": "赵强",
      "phone": "138****4307",
      "type": "refund",
      "reason": "重复下单",
      "amount": 58,
      "status": "pending",
      "appliedAt": "2026-11-04 03:21",
      "items": [
        { "name": "柠檬水", "price": 10, "qty": 1 },
        { "name": "担担面", "price": 24, "qty": 2 }
      ],
      "records": [
        { "time": "2026-11-04 03:21", "operator": "赵强", "action": "客户提交售后申请" }
      ]
    },
    {
      "id": "AS202610290012",
      "orderId": "BS202610292012",
      "storeName": "成都春熙店",
      "customer": "杨静",
      "phone": "138****2659",
      "type": "return",
      "reason": "包装破损",
      "amount": 172,
      "status": "processing",
      "appliedAt": "2026-10-29 09:22",
      "items": [
        { "name": "毛血旺", "price": 72, "qty": 2 },
        { "name": "可乐", "price": 8, "qty": 1 },
        { "name": "柠檬水", "price": 10, "qty": 2 }
      ],
      "records": [
        { "time": "2026-10-29 09:22", "operator": "杨静", "action": "客户提交售后申请" },
        { "time": "2026-10-29 10:38", "operator": "客服-王磊", "action": "客服已受理，正在核实订单信息" }
      ]
    }
  ],
  "total": 24,
  "page": 1,
  "pageSize": 10
}
```

- **业务规则**：
  - 排序：`appliedAt` 倒序（Mock 显式排序）；分页稳定性建议 `appliedAt desc, id desc`（**待后端确认**，Mock 无 tie-break）；
  - 筛选条件为 **AND**；`status` / `type` 传 `all` 或缺省不参与过滤；
  - 关键词字段匹配规则：`id`、`orderId` 忽略大小写包含；`customer`、`storeName` 包含（中文无大小写问题）；
  - 列表返回完整 `items` 与 `records`（页面详情抽屉复用列表行对象）；如生产改为列表瘦身，需保留 `id`/`orderId`/`status`/`amount`/`appliedAt` 等列表字段，并新增详情接口；
  - 金额：`amount = Σ(items.price × qty)`；审核动作不改变金额；
  - 门店权限：`X-Store-Id` 有值时仅返回该门店工单，无权限 `40300`；
  - 分页：`page ≥ 1`、`1 ≤ pageSize ≤ 100`，`total` 为筛选后总数。
- **错误**：`40001`（`status`/`type`/`page`/`pageSize` 非法）；`40100`；`40300`。

### POST /api/v1/after-sales/{id}/audit

- **说明**：售后审核接口，一个接口通过 `action` 区分「通过（`approve`）」与「拒绝（`reject`）」，审核成功后原样返回最新工单。
- **前端来源**：`src/services/ops.ts` → `auditAfterSale(id, action)`；页面 `src/pages/AfterSale/index.tsx` → `handleAudit(action)`（详情抽屉底部「拒绝」「通过」按钮）
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 售后工单号，如 `AS202611040001` |

- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| action | string | 是 | 审核动作：`approve`（通过）/ `reject`（拒绝） |
| remark | string | 否（建议 `reject` 必填） | 审核备注/拒绝原因，最长 200 字符。**Mock 的 `auditAfterSale()` 只有 `(id, action)` 两个参数、没有备注字段**；页面当前也未采集备注。本契约将 `remark` 定义为可选扩展字段，生产应写入 `records` 并回显；前端需补备注输入框（拒绝时必填） |

- **出参（data）**：审核后的完整工单对象（`status` 已变更，`records` 追加一条），以下为 `AS202611040001` 执行 `approve` 后的结果：

```json
{
  "id": "AS202611040001",
  "orderId": "BS202611042001",
  "storeName": "广州天河店",
  "customer": "李娜",
  "phone": "138****3275",
  "type": "return",
  "reason": "包装破损",
  "amount": 112,
  "status": "done",
  "appliedAt": "2026-11-04 04:30",
  "items": [
    { "name": "红烧肉", "price": 56, "qty": 2 }
  ],
  "records": [
    { "time": "2026-11-04 04:30", "operator": "李娜", "action": "客户提交售后申请" },
    { "time": "2026-11-04 06:30", "operator": "当前客服", "action": "审核通过，款项已原路退回" }
  ]
}
```

> 执行 `reject` 时：`status` 变为 `rejected`，追加记录 `action` 为「审核拒绝，已通知客户并说明原因」（备注内容一并写入），其余字段不变。

- **业务规则**：
  - **状态流转**：仅 `pending` / `processing` 可审核；`approve` → `done`，`reject` → `rejected`；`done` / `rejected` 为终态（详见 3.3）；
  - **审核文案按类型区分**：`approve` + `exchange` →「审核通过，已安排换货补发」；`approve` + `refund`/`return` →「审核通过，款项已原路退回」；`reject` →「审核拒绝，已通知客户并说明原因」；
  - **记录追加**：`records` 只追加不覆盖；`time` 为服务端当前时间（Mock 固定 `2026-11-04 06:30`），`operator` 为当前登录用户（Mock 固定 `当前客服`）；
  - **副作用**：审核通过后触发退款/换货、联动订单状态（生产），Mock 仅改状态+追加记录；
  - **权限**：需要售后审核权限（建议角色：售后主管/运营经理），无权限 `40300`；
  - 审核成功前端会重新拉取列表（`load()`），并直接刷新详情抽屉为返回值。
- **幂等与并发（必读）**：
  1. **终态幂等**：工单进入 `done` / `rejected` 后，任何重复审核请求都返回 `40900`（`message: "该工单已处理完成"`），**不会重复退款、不会重复追加处理记录**；
  2. **并发保护**：建议后端用状态 CAS 更新（`UPDATE ... WHERE id = ? AND status IN ('pending','processing')`），只有一个请求能成功，其余返回 `40900`；禁止「先查后改」的竞态写法；
  3. **重复提交**：生产建议支持 `X-Idempotency-Key` 请求头（前端每次审核动作生成唯一 key），相同 key 的重复请求返回首次审核结果，HTTP 仍为 200；前端按钮已有 loading 态防连点（`auditing`）；
  4. **事务**：审核状态变更、记录写入、退款调用/换货单创建应在同一事务或可靠最终一致流程中，退款失败返回 `50000` 并回滚状态，避免「已通过但未退款」；
  5. **审核备注**：`remark` 应固化到处理记录中，拒绝时必须提供原因（生产校验 `40001`）。
- **错误**：
  - `40001`：`action` 非 `approve`/`reject`，或 `reject` 缺少 `remark`；
  - `40300`：无审核权限；
  - `40400`：工单不存在（`message: "售后工单不存在"`）；
  - `40900`：工单已处于终态（`message: "该工单已处理完成"`）或并发审核冲突；
  - `50000`：退款/换货等下游调用失败（生产），状态需回滚。

**（二）岗位管理**

### GET /api/v1/positions

- **说明**：岗位列表，支持岗位名称关键词、状态筛选，分页返回。
- **前端来源**：`src/services/ops.ts` → `fetchPositions()`；页面 `src/pages/System/Positions/index.tsx` → `load()`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | string | 否 | — | 岗位名称包含匹配（Mock 仅匹配名称，不匹配编码）；空串/空白不参与过滤 |
| status | string | 否 | `all` | `active` / `disabled` / `all` |
| page | number | 否 | 1 | 页码，从 1 开始 |
| pageSize | number | 否 | 10 | 每页条数，最大 100 |

- **出参（data）**：分页结构，以下为 Mock 真实种子数据：

```json
{
  "list": [
    {
      "id": "P001",
      "name": "区域经理",
      "code": "POS001",
      "department": "运营中心",
      "staffCount": 9,
      "status": "active",
      "createdAt": "2026-10-15"
    },
    {
      "id": "P010",
      "name": "厨师长",
      "code": "POS010",
      "department": "后厨中心",
      "staffCount": 10,
      "status": "disabled",
      "createdAt": "2026-10-30"
    }
  ],
  "total": 22,
  "page": 1,
  "pageSize": 10
}
```

- **业务规则**：
  - 排序：Mock 直接返回种子数组顺序，未显式排序；契约建议 `createdAt desc, id desc`（**待后端确认**）；
  - 筛选条件为 **AND**；`status = all` 不过滤；
  - `staffCount` 只读：Mock 为种子值（新增岗位置 `0`），生产建议按人员表实时聚合，避免脏数据；
  - 分页：`total` 为筛选后总数；`page` / `pageSize` 越界返回 `40001`；
  - 数据权限：岗位为总部共享字典；门店维度的人员统计由权限控制。
- **错误**：`40001`（`status`/`page`/`pageSize` 非法）；`40100`；`40300`（非系统管理权限）。

### GET /api/v1/positions/departments/options

- **说明**：岗位所属部门下拉选项（列表筛选与新增/编辑表单共用）。
- **前端来源**：`src/services/ops.ts` → `fetchPositionDepartments()`；页面 `src/pages/System/Positions/index.tsx` 挂载时加载
- **入参**：无
- **出参（data）**：字符串数组，以下为 Mock 真实值：

```json
["运营中心", "门店运营部", "后厨中心", "供应链中心", "财务部", "人力资源部", "信息技术部"]
```

- **业务规则**：
  - 从岗位数据 `department` 去重得到，按首次出现顺序返回，不返回空值；
  - Mock 无独立部门字典：新部门只能通过岗位数据产生；生产建议独立部门字典（`id`、名称、排序、状态）并支持岗位/人员引用；
  - 不分页、不做门店过滤。
- **错误**：`40100`；`50000`。

### POST /api/v1/positions

- **说明**：新增岗位（`savePosition()` 未传 `id` 时调用）。
- **前端来源**：`src/services/ops.ts` → `savePosition()`；页面 `src/pages/System/Positions/index.tsx` → `openCreate()` + `handleSave()`
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 岗位名称，最长 20 字符，保存前去除两端空格 |
| code | string | 是 | 岗位编码，2~20 位字母/数字/下划线/中划线（前端校验 `^[A-Za-z0-9_-]{2,20}$`）；保存前去除空格并**转大写**（如输入 `pos023` → 存 `POS023`） |
| department | string | 是 | 所属部门，须来自部门选项 |
| status | string | 是 | `active` / `disabled`，页面新增时默认 `active` |

- **出参（data）**：新增后的岗位对象（`id`、`staffCount`、`createdAt` 由服务端生成）：

```json
{
  "id": "P023",
  "name": "门店督导",
  "code": "POS023",
  "department": "门店运营部",
  "staffCount": 0,
  "status": "active",
  "createdAt": "2026-11-04"
}
```

- **业务规则**：
  - `id` 服务端生成：Mock 规则为 `P` + 内存自增序号（当前 22 条 → 新增为 `P023`）。**Mock 使用内存计数器，刷新后会按 `positions.length` 重置、删除后可能复用已存在编码；生产必须使用独立发号器，保证 ID 永久唯一**；
  - **岗位编码唯一**：先去空格并转大写，再与现有岗位比较（Mock 比较已有 `code`，排除自身）；重复返回 `40900`（`message: "岗位编码已存在，请更换"`）；
  - `staffCount` 新增时固定 `0`，忽略客户端传值；`createdAt` 为服务端当前日期；
  - 部门不存在 / 名称为空 / 编码格式不合法 → `40001`；
  - 前端保存成功后会重新拉取列表并关闭抽屉。
- **错误**：`40001`（字段校验失败）；`40300`；`40900`（岗位编码重复）；`50000`。

### PUT /api/v1/positions/{id}

- **说明**：编辑岗位（`savePosition()` 传 `id` 时调用），更新名称、编码、部门、状态。
- **前端来源**：`src/services/ops.ts` → `savePosition({...values, id: editing.id})`；页面 `src/pages/System/Positions/index.tsx` → `openEdit()` + `handleSave()`
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 岗位 ID，如 `P002` |

- **入参（Body）**：同 `POST /api/v1/positions`（`name`、`code`、`department`、`status`；不传 `id`，以 Path 为准）。

- **出参（data）**：更新后的岗位对象：

```json
{
  "id": "P002",
  "name": "门店店长",
  "code": "POS002",
  "department": "门店运营部",
  "staffCount": 4,
  "status": "disabled",
  "createdAt": "2026-10-17"
}
```

- **业务规则**：
  - 岗位不存在 → `40400`（`message: "岗位不存在"`）；
  - 编码唯一性校验需**排除自身**（`item.id !== input.id`）；重复返回 `40900`；
  - 不可修改：`id`、`staffCount`、`createdAt`；`staffCount` 由人员数据聚合（生产）；
  - 停用岗位不影响已绑定人员，但这些人员不应再被新表单选择（生产校验）；
  - 编码/名称/部门/状态均按全量提交更新。
- **错误**：`40001`；`40300`；`40400`；`40900`（编码重复）；`50000`。

### DELETE /api/v1/positions/{id}

- **说明**：删除岗位。
- **前端来源**：`src/services/ops.ts` → `removePosition()`；页面 `src/pages/System/Positions/index.tsx` → `handleRemove()`
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 岗位 ID，如 `P002` |

- **出参（data）**：`null`

- **业务规则**：
  - Mock 为内存物理删除，`id` 不存在时静默成功；生产建议软删除（`deleted` 标记）或仅允许停用，不存在返回 `40400`；
  - **关联校验**：岗位仍有人员绑定（`staffCount > 0`）时应拒绝删除，返回 `40900`（Mock 未校验，删除后人员会变成无对应岗位的悬空数据）；生产也可选择级联把人员置为离职/停用；
  - 删除后前端会重新拉取列表，当前页删空时自动回退一页（页面已处理 `data.list.length === 1 && page > 1`）；
  - 被删除岗位的历史操作记录（系统日志）保留。
- **错误**：`40300`；`40400`；`40900`（存在关联人员）；`50000`。

**（三）人员管理**

### GET /api/v1/staff

- **说明**：人员列表，支持姓名/工号/手机号关键词、岗位、门店、状态筛选，分页返回。
- **前端来源**：`src/services/ops.ts` → `fetchStaff()`；页面 `src/pages/System/Staff/index.tsx` → `load()`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | string | 否 | — | 姓名（包含）、工号（包含，忽略大小写）、手机号（包含）任一命中；空串/空白不参与过滤 |
| position | string | 否 | — | 岗位名称精确匹配，如 `收银员`（前端传名称，不是岗位 ID） |
| storeName | string | 否 | — | 所属门店名称精确匹配，如 `上海静安店`（前端传名称，不是门店 ID） |
| status | string | 否 | `all` | `active` / `disabled` / `all` |
| page | number | 否 | 1 | 页码，从 1 开始 |
| pageSize | number | 否 | 10 | 每页条数，最大 100 |

- **出参（data）**：分页结构，以下为 Mock 真实种子数据：

```json
{
  "list": [
    {
      "id": "S001",
      "name": "张伟",
      "employeeNo": "EMP1001",
      "phone": "17790768739",
      "position": "收银员",
      "storeName": "武汉江汉路店",
      "status": "active",
      "joinedAt": "2026-09-10",
      "email": "staff001@pisa.com",
      "role": "客服专员",
      "lastLogin": "2026-10-18 13:04",
      "loginIp": "192.168.3.86"
    },
    {
      "id": "S005",
      "name": "陈杰",
      "employeeNo": "EMP1005",
      "phone": "13855941026",
      "position": "财务专员",
      "storeName": "武汉江汉路店",
      "status": "disabled",
      "joinedAt": "2026-10-23",
      "email": "staff005@pisa.com",
      "role": "客服专员",
      "lastLogin": "账号已停用",
      "loginIp": "—"
    }
  ],
  "total": 26,
  "page": 1,
  "pageSize": 10
}
```

- **业务规则**：
  - 排序：Mock 直接返回种子数组顺序，未显式排序；契约建议 `joinedAt desc, id desc`（**待后端确认**）；
  - 筛选条件为 **AND**；`position` / `storeName` 为**名称精确匹配**，生产建议同时接受 `positionId` / `storeId` 并在 service 层做映射（当前 Mock 无 ID 关联）；
  - `keyword` 忽略大小写匹配工号；手机号按包含匹配，生产建议手机号改为精确匹配并走索引；
  - **手机号脱敏**：Mock 返回 11 位明文；生产列表应按权限脱敏（如 `138****1026`），编辑回显单独授权；
  - 分页：`total` 为筛选后总数；
  - 数据权限：店长仅能查看本门店人员；总部/不传 `X-Store-Id` 查看全部。
- **错误**：`40001`（`status`/`page`/`pageSize` 非法）；`40100`；`40300`（门店数据权限）。

### GET /api/v1/staff/form-options

- **说明**：人员新增/编辑表单与列表筛选共用的选项数据（岗位、门店、角色）。
- **前端来源**：`src/services/ops.ts` → `fetchStaffFormOptions()`；页面 `src/pages/System/Staff/index.tsx` 挂载时加载
- **入参**：无
- **出参（data）**：对象，以下为 Mock 真实值（`positions` 取全部岗位名称；`stores` / `roles` 取人员数据去重）：

```json
{
  "positions": [
    "区域经理", "门店店长", "副店长", "值班经理", "前厅主管", "后厨主管",
    "收银员", "服务员", "传菜员", "厨师长", "炒锅厨师", "切配厨师",
    "面点师", "洗碗工", "采购专员", "仓储管理员", "财务专员", "出纳",
    "招聘专员", "培训专员", "数据分析师", "运维工程师"
  ],
  "stores": [
    "武汉江汉路店", "西安钟楼店", "北京海淀店", "广州天河店", "北京朝阳店",
    "成都春熙店", "上海徐汇店", "杭州西湖店", "上海静安店"
  ],
  "roles": ["客服专员", "总部管理员", "门店管理员", "财务专员", "门店员工"]
}
```

- **业务规则**：
  - `positions` 来自岗位列表（**包含停用岗位**，Mock 未过滤；生产建议只返回 `active` 岗位，或返回 `{label,value,status}` 由前端禁用停用项）；
  - `stores` 来自人员数据去重（不是门店模块的完整门店列表）；生产应改为调用门店服务，保证选项完整且与 `X-Store-Id` 权限一致；
  - `roles` 来自人员数据去重，Mock 仅 5 个角色；生产建议独立角色字典；
  - 选项不分页；返回顺序为 Mock 数据首次出现顺序（生产建议按字典排序字段排序）。
- **错误**：`40100`；`40300`；`50000`。

### POST /api/v1/staff

- **说明**：新增人员（`saveStaff()` 未传 `id` 时调用）。
- **前端来源**：`src/services/ops.ts` → `saveStaff()`；页面 `src/pages/System/Staff/index.tsx` → `openCreate()` + `handleSave()`
- **入参（Body）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 姓名，最长 20 字符，保存前去除两端空格 |
| employeeNo | string | 是 | 工号，3~12 位字母/数字（前端校验 `^[A-Za-z0-9]{3,12}$`）；保存前去空格并**转大写** |
| phone | string | 是 | 手机号，必须匹配 `^1[3-9]\d{9}$`（前端校验） |
| position | string | 是 | 岗位名称，来自表单选项 |
| storeName | string | 是 | 所属门店名称，来自表单选项 |
| status | string | 是 | `active` / `disabled`，页面新增时默认 `active` |
| joinedAt | string | 是 | 入职日期 `YYYY-MM-DD`；页面禁用未来日期（不得晚于当天） |

- **出参（data）**：新增后的人员对象（`id`、`email`、`role`、`lastLogin`、`loginIp` 由服务端生成）：

```json
{
  "id": "S027",
  "name": "周琳",
  "employeeNo": "EMP1027",
  "phone": "13812345678",
  "position": "收银员",
  "storeName": "上海静安店",
  "status": "active",
  "joinedAt": "2026-11-01",
  "email": "staff027@pisa.com",
  "role": "门店员工",
  "lastLogin": "—",
  "loginIp": "—"
}
```

- **业务规则**：
  - `id` 服务端生成：Mock 规则为 `S` + 内存自增序号补零 3 位（当前 26 条 → 新增为 `S027`）。**Mock 使用内存计数器，刷新后会按 `staff.length` 重置；生产必须使用独立发号器**；
  - **工号唯一**：去空格转大写后校验（排除自身）；重复返回 `40900`（`message: "工号已存在，请更换"`）；
  - **服务端默认值**（忽略客户端传值）：`email = staff{3 位 id 序号}@pisa.com`、`role = 门店员工`、`lastLogin = "—"`、`loginIp = "—"`；
  - 姓名/工号去空格；手机号、入职日期校验失败 → `40001`；岗位/门店不存在 → `40001`；
  - 新增人员默认不创建登录账号（Mock 无账号开通流程）；生产建议异步创建账号并返回初始密码/邀请状态，或在人员详情中单独「开通账号」；
  - 前端保存成功后重新拉取列表并关闭抽屉。
- **错误**：`40001`（字段校验失败，`message` 指明具体字段）；`40300`；`40900`（工号重复）；`50000`。

### PUT /api/v1/staff/{id}

- **说明**：编辑人员（`saveStaff()` 传 `id` 时调用），更新基础信息与状态。
- **前端来源**：`src/services/ops.ts` → `saveStaff({...values, id: editing.id})`；页面 `src/pages/System/Staff/index.tsx` → `openEdit()` + `handleSave()`
- **入参（Path）**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 人员 ID，如 `S002` |

- **入参（Body）**：同 `POST /api/v1/staff`（`name`、`employeeNo`、`phone`、`position`、`storeName`、`status`、`joinedAt`；不传 `id`，以 Path 为准）。

- **出参（data）**：更新后的人员对象：

```json
{
  "id": "S002",
  "name": "王芳",
  "employeeNo": "EMP1002",
  "phone": "13927991728",
  "position": "后厨主管",
  "storeName": "西安钟楼店",
  "status": "active",
  "joinedAt": "2026-09-06",
  "email": "staff002@pisa.com",
  "role": "总部管理员",
  "lastLogin": "2026-10-31 11:43",
  "loginIp": "192.168.3.22"
}
```

- **业务规则**：
  - 人员不存在 → `40400`（`message: "人员不存在"`）；
  - 工号唯一性校验需**排除自身**；重复返回 `40900`；
  - 可修改：姓名、工号、手机号、岗位、门店、状态、入职日期；不可修改：`id`、`email`、`role`、`lastLogin`、`loginIp`（Mock 编辑时保留原值；生产角色分配应走独立权限接口）；
  - 将 `status` 改为 `disabled` 即停用账号：立即失去登录能力，已登录会话建议失效；重新启用后 `lastLogin` 为停用前最后登录时间；
  - 岗位/门店变更影响后续门店数据权限，生产需同步刷新权限缓存；
  - 手机号/入职日期校验同新增。
- **错误**：`40001`；`40300`；`40400`；`40900`（工号重复）；`50000`。

**（四）系统日志**

### GET /api/v1/logs

- **说明**：系统操作日志列表，只读，支持操作人/模块关键词、操作类型、时间范围筛选，按操作时间倒序分页返回。
- **前端来源**：`src/services/ops.ts` → `fetchLogs()`；页面 `src/pages/System/Logs/index.tsx` → `load()`
- **入参（Query）**：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | string | 否 | — | 操作人（包含）或所属模块（包含）；空串/空白不参与过滤 |
| action | string | 否 | `all` | `create` / `update` / `delete` / `login` / `export` / `all` |
| startDate | string | 否 | — | 操作开始日期 `YYYY-MM-DD`（闭区间，含当天），对应 Mock 的 `range[0]` |
| endDate | string | 否 | — | 操作结束日期 `YYYY-MM-DD`（闭区间，含当天），对应 Mock 的 `range[1]` |
| page | number | 否 | 1 | 页码，从 1 开始 |
| pageSize | number | 否 | 10 | 每页条数，最大 100 |

> 参数映射：前端 `LogQuery.range` 为 `[startDate, endDate]` 二元组（`DatePicker.RangePicker` 生成），HTTP 层拆为 `startDate` / `endDate`。

- **出参（data）**：分页结构，以下为 Mock 真实种子数据（按时间倒序第 1 页前三条）：

```json
{
  "list": [
    {
      "id": "LOG001",
      "time": "2026-11-04 03:34",
      "operator": "马超",
      "module": "营销活动",
      "action": "create",
      "ip": "10.0.8.102",
      "result": "success",
      "duration": 487
    },
    {
      "id": "LOG005",
      "time": "2026-11-04 03:16",
      "operator": "李婷",
      "module": "会员管理",
      "action": "export",
      "ip": "192.168.1.88",
      "result": "success",
      "duration": 268
    },
    {
      "id": "LOG002",
      "time": "2026-11-04 03:01",
      "operator": "刘洋",
      "module": "资产中心",
      "action": "update",
      "ip": "10.0.12.45",
      "result": "success",
      "duration": 411
    }
  ],
  "total": 60,
  "page": 1,
  "pageSize": 10
}
```

- **业务规则**：
  - 排序：`time` 倒序（Mock 数据预排序，service 未再排序）；契约建议 `time desc, id desc`（**待后端确认**，Mock 无 tie-break）；
  - 筛选条件为 **AND**；日期区间按 `time` 的日期部分比较，闭区间；
  - 日志**只读**：不提供新增/编辑/删除接口。生产由各业务模块在写操作时埋点写入（岗位/人员/菜品/售后/订单/营销等），登录、导出也需记录；
  - 失败请求也要记录（`result=fail`），并保留请求耗时 `duration`；
  - 日志为审计数据，生产需保证不可篡改（只追加、最小权限、定期归档），建议保留 ≥ 180 天；
  - 分页：`total` 为筛选后总数；`page` / `pageSize` 越界 `40001`；
  - 数据权限：系统日志建议仅总部管理员/审计角色可见；门店角色只看本门店相关模块日志（生产需在日志中冗余 `storeId`，当前 Mock 无此字段，**建议扩展**）。
- **错误**：`40001`（`action`/日期格式/页码非法，或 `startDate > endDate`）；`40100`；`40300`（无审计权限）。

## 五、Mock 与生产差异（联调必读）

| 项 | Mock 现状 | 契约 / 生产要求 |
| --- | --- | --- |
| 存储 | 内存数组，刷新即恢复 | 落库；岗位/人员删除建议软删除 |
| 时间 | `MOCK_NOW = 2026-11-04 06:30` 固定；列表时间只到分钟 | 服务端当前时间；按 README 统一 `YYYY-MM-DD HH:mm:ss` |
| 操作人 | 审核固定写 `当前客服`；岗位/人员不记录 | 从 token 取当前用户，写入处理记录与系统日志 |
| 售后状态流转 | 有 `pending`→`done/rejected`、`processing`→`done/rejected`；无「受理」接口；`processing` 来自种子 | 补 `pending → processing` 受理动作（建议 `POST /after-sales/{id}/accept`）；完整状态机 + 操作日志 |
| 售后审核副作用 | 仅改状态 + 追加记录，不退款、不联动订单 | 退款调用/换货单/订单 `refunded` 联动，事务或最终一致 |
| 售后订单关联 | `orderId` 为 `BS` + 日期 + `2001` 起的构造值，与订单种子非同一批 | 关联真实订单并校验存在；售后明细补 `dishId`/`orderItemId` |
| 审核备注 | 无 `remark` 字段/入参 | Body 增加 `remark`，`reject` 必填，写入处理记录 |
| 岗位 ID | `P` + 内存计数器（刷新重置，删除后可能复用） | 独立发号器，永久唯一 |
| 人员 ID | `S` + 内存计数器（同上） | 独立发号器，永久唯一 |
| 唯一性校验 | 仅岗位编码、工号；无外键校验 | 完整唯一性 + 岗位/门店存在性校验 |
| 删除校验 | 岗位删除不检查关联人员 | `staffCount > 0` 拒绝删除（`40900`） |
| 人员账号 | 无账号创建、无角色分配、无删除 | 账号开通/角色分配/离职停用流程 |
| 手机号 | 人员列表返回 11 位明文 | 列表脱敏、编辑按权限回显 |
| 系统日志 | 独立种子数据，CRUD 不产生日志 | 全模块操作埋点，日志只追加、可审计、可归档 |
| 数据权限 | 未隔离门店 | 按 `X-Store-Id` 过滤；日志冗余 `storeId` |
| 分页 | 前端内存分页 | 服务端分页并返回 `total` |

## 六、覆盖自检

| 序号 | 前端函数 | HTTP 接口 | 覆盖 |
| --- | --- | --- | --- |
| 1 | `fetchAfterSales(query)` | `GET /api/v1/after-sales` | ✅ |
| 2 | `auditAfterSale(id, action)` | `POST /api/v1/after-sales/{id}/audit` | ✅ |
| 3 | `fetchPositions(query)` | `GET /api/v1/positions` | ✅ |
| 4 | `fetchPositionDepartments()` | `GET /api/v1/positions/departments/options` | ✅ |
| 5 | `savePosition(input)`（新增） | `POST /api/v1/positions` | ✅ |
| 6 | `savePosition(input)`（编辑） | `PUT /api/v1/positions/{id}` | ✅ |
| 7 | `removePosition(id)` | `DELETE /api/v1/positions/{id}` | ✅ |
| 8 | `fetchStaff(query)` | `GET /api/v1/staff` | ✅ |
| 9 | `fetchStaffFormOptions()` | `GET /api/v1/staff/form-options` | ✅ |
| 10 | `saveStaff(input)`（新增） | `POST /api/v1/staff` | ✅ |
| 11 | `saveStaff(input)`（编辑） | `PUT /api/v1/staff/{id}` | ✅ |
| 12 | `fetchLogs(query)` | `GET /api/v1/logs` | ✅ |

- **导出函数覆盖**：`src/services/ops.ts` 共 10 个导出函数（`fetchAfterSales` / `auditAfterSale` / `fetchPositions` / `fetchPositionDepartments` / `savePosition` / `removePosition` / `fetchStaff` / `fetchStaffFormOptions` / `saveStaff` / `fetchLogs`），已全部覆盖；
- **接口覆盖**：10 个函数拆为 12 个 HTTP 接口（`savePosition`、`saveStaff` 各拆新增/编辑），已全部覆盖；需求清单中的「售后工单列表、售后审核（通过/拒绝）、岗位列表/部门选项/新增/编辑/删除、人员列表/表单选项/新增/编辑、系统日志列表」均已对应；
- **状态流转覆盖**：`pending`（待处理）→ `processing`（处理中）→ `done`（已完成）/ `rejected`（已拒绝）的流转规则、审核入参（`action` + `remark`）、终态幂等与并发保护已在 3.3 与审核接口中写明（以代码实际枚举为准，不含 `serving` / `completed` / `refunded`）；
- **示例数据**：JSON 示例中的工单号、订单号、门店、客户、金额、状态、处理记录、岗位、人员、日志均取自 `src/mock/ops.ts` 固定种子实际生成值（Mock 今日为 `2026-11-04`）；新增/编辑示例的 ID 与时间按 Mock 生成规则推导。
