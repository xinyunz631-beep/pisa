# 比萨斯 · 连锁餐饮 SaaS 管理后台（前端原型）

纯前端页面原型：**不做后端**，所有数据来自内存 Mock 层，交互（筛选、分页、增删改、抽屉详情）都能真实点。

## 技术栈

| 能力 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript + Vite 6 |
| 组件库 | Ant Design 5（中文语言包、主题色 `#d4380d`） |
| 路由 | React Router 6（`nav.tsx` 单一配置驱动菜单 + 路由） |
| 日期 | dayjs |
| 数据 | 自研 Mock Service 层（`src/services/*` + `src/mock/db.ts`），模拟 200~400ms 网络延迟 |
| 图表 | 自研 SVG 组件（`TrendChart`），不引入图表库 |

## 快速开始

```bash
cd 比萨斯
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # 类型检查 + 生产构建
```

## 目录结构

```
src/
├── config/nav.tsx        # 菜单 + 路由的唯一来源（菜单结构定稿后只改这里）
├── layouts/AdminLayout.tsx  # 侧边栏 / 顶栏 / 内容区框架
├── pages/
│   ├── Dashboard/        # 经营概览
│   ├── Dishes/           # 菜品管理（列表 + 增改抽屉 + 上下架 + 删除）
│   ├── Orders/           # 订单管理（列表 + 详情抽屉）
│   └── Placeholder/      # 未实现模块的占位页
├── components/           # KpiCard / TrendChart
├── services/             # Mock 接口层：dashboard / dish / order
├── mock/                 # 内存数据库 db.ts + 工具函数
├── utils/format.ts       # 金额、状态文案与颜色
└── types.ts              # 领域模型（Dish / Order / Store / Kpi ...）
```

## Mock 数据的边界

- 数据在 `src/mock/db.ts` 里用固定随机种子生成，**每次刷新页面数据一致**。
- 增删改只改内存，**刷新页面即恢复初始数据**——这是原型阶段的预期行为。
- 以后接真实后端时，只替换 `src/services/` 里的实现（保持函数签名不变），页面代码不用动。

## 已完成的页面

1. **经营概览**：4 个 KPI 卡片（营业额 / 订单量 / 客单价 / 新增会员）、近 7 日营业额面积图、门店营业额 TOP 6、最近订单。
2. **菜品管理**：名称/编码搜索、分类与状态筛选、分页、毛利率计算、上下架开关、新增/编辑抽屉表单（含校验）、删除确认。
3. **订单管理**：订单号/客户搜索、门店/渠道/状态/日期范围筛选、分页、详情抽屉（含菜品明细与合计）。

其余菜单（门店管理、会员营销、数据报表、系统设置）目前是占位页，等菜单结构和字段确认后再实现。

## 下一步

见 [PLAN.md](./PLAN.md)。
