# 比萨（pisa）· 连锁餐饮 SaaS 管理后台（前端原型）

![CI](https://github.com/xinyunz631-beep/pisa/actions/workflows/ci.yml/badge.svg)

本仓库是**前端部分**：页面 + 内存 Mock 数据，筛选、分页、增删改、抽屉详情等交互都能真实操作。后端服务由后端团队按 [`docs/api/`](./docs/api/README.md) 的接口契约实现，不在本仓库范围内；当前 Mock 层用于后端就绪前的页面联调与演示，接后端时只需替换 `src/services/*` 的实现。

## 技术栈

| 能力 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript + Vite 6 |
| 组件库 | Ant Design 5（中文语言包、主题色 `#d4380d`、图标统一用 `@ant-design/icons`） |
| 路由 | React Router 6（`nav.tsx` 单一配置驱动：顶部模块 + 左侧二级菜单 + 路由） |
| 日期 | dayjs |
| 数据 | 自研 Mock Service 层（`src/services/*` + `src/mock/*`），模拟 200~400ms 网络延迟 |
| 图表 | 自研 SVG 组件（`TrendChart`），不引入图表库 |

## 快速开始

```bash
cd 比萨
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # 类型检查 + 生产构建
```

## 目录结构

```
src/
├── config/nav.tsx        # 导航唯一配置：7 个模块 + 每个模块的二级菜单 + 路由
├── theme.tsx             # 浅色 / 夜间主题（localStorage 持久化 + 跟随系统）
├── layouts/AdminLayout.tsx  # 顶部横排模块菜单 / 左侧二级菜单 / 内容区
├── pages/
│   ├── Dashboard/        # 仪表盘（数据模块）
│   ├── Members/          # 会员信息
│   ├── MemberLevels/     # 等级配置
│   ├── MemberTags/       # 标签管理
│   ├── Marketing/        # 满减 / 满折 / 发券 / 自动化营销 / 消息通知
│   ├── Assets/           # 卡券 / 积分 / 券包
│   ├── Business/         # 菜单 / 门店 / 配送
│   ├── Dishes/           # 菜品管理
│   ├── Orders/           # 订单查询
│   ├── AfterSale/        # 售后处理
│   ├── System/           # 岗位 / 人员 / 系统日志
│   └── Placeholder/      # 占位页
├── components/           # KpiCard / TrendChart（仪表盘使用）
├── services/             # Mock 接口层：member / marketing / assets / business / order / ops / dish / dashboard
├── mock/                 # 内存数据库：db / members / marketing / assets / business / ops
├── utils/format.ts       # 金额、状态文案与颜色
└── types.ts              # 共享领域模型（Member / MemberLevelConfig / MemberTagConfig ...）
```

## 导航结构

顶部横排 7 个模块（菜单名两字），左侧侧边栏展示当前模块的二级菜单，共 21 个页面，全部已实现：

| 模块 | 二级菜单 |
| --- | --- |
| 数据 | 仪表盘（KPI、营业额趋势、门店排行、最近订单） |
| 会员 | 会员信息（手机号/会员号查询）、等级配置（消费金额/频次升降级规则）、标签管理（ClickHouse 人群价值/行为/人口属性，手动+自动更新） |
| 营销 | 满减活动、满折活动、发券活动、自动化营销（活动+人群标签+时间+渠道+通知方式）、消息通知 |
| 资产 | 卡券管理、积分管理（规则/流水 Tab）、券包管理 |
| 业务 | 菜品管理、菜单管理、门店管理、配送管理 |
| 订单 | 订单查询、售后处理 |
| 系统 | 岗位管理、人员管理、系统日志 |

## 夜间模式

- 入口：右上角**头像下拉菜单 → 夜间模式**（带勾选状态）
- 实现：AntD `darkAlgorithm` 全局切换 + CSS 变量（`--page-bg` / `--panel-bg` / `--border-color` / 文本色）同步变色
- 持久化：选择写入 `localStorage`（key `pisa-theme`）；首次进入跟随系统 `prefers-color-scheme`
- 首屏防闪烁：`index.html` 内联脚本在 React 挂载前先设置 `<html data-theme>`

## Mock 数据的边界

- 数据在 `src/mock/*.ts` 里用固定随机种子生成，**每次刷新页面数据一致**。
- 增删改只改内存，**刷新页面即恢复初始数据**——这是原型阶段的预期行为。
- 以后接真实后端时，只替换 `src/services/` 里的实现（保持函数签名不变），页面代码不用动。
- 所有 Mock 时间都收敛在 2026-09 ~ 2026-11-04，不会出现“未来时间”。

## 已实现的页面（21 个）

**数据**
0. 仪表盘：今日营业额 / 订单量 / 客单价 / 新增会员 4 个 KPI、近 7 日营业额趋势（SVG 面积图）、今日门店营业额 TOP 6、最近订单。

**会员**
1. 会员信息：手机号 / 会员号查询、等级筛选、分页、详情抽屉（基础信息 + 标签 + 消费概览）。
2. 等级配置：4 个等级（普通/银卡/金卡/黑卡）的升级条件（累计消费金额 / 消费频次 / 满足任一）、折扣与积分倍率、升降级规则说明、编辑抽屉。
3. 标签管理：自动/手动标签、人群价值/行为/人口属性分类、条件构造器（指标 + 运算符 + 值）、覆盖人数、启用停用。

**营销**
4. 满减活动：多档「满 X 减 Y」规则、门店范围、活动时间、状态流转、新建/编辑/启停/删除。
5. 满折活动：多档「满 X 享 Y 折」，其余同满减。
6. 发券活动：发券任务、券库选择、发放人群标签、领取率进度。
7. 自动化营销：关联营销活动 + 人群标签 + 触发方式/时间 + 渠道（短信/微信/站内信）+ 通知方式。
8. 消息通知：模板列表、场景/渠道、内容预览、启停。

**资产**
9. 卡券管理：统计卡（发行/领取/核销/核销率）、代金券/折扣券/兑换券、动态面额表单。
10. 积分管理：积分统计、积分规则、积分流水（两个 Tab）。
11. 券包管理：券包组合、包含券、有效期、发行量。

**业务**
12. 菜品管理：搜索/分类/状态筛选、毛利率、上下架、新增/编辑抽屉、删除。
13. 菜单管理：菜单名称、所属门店、菜品数量、生效时段；详情抽屉展示菜品清单。
14. 门店管理：门店编号/城市/地址/店长/营业时间/营业状态、增改删。
15. 配送管理：配送范围/起送价/配送费/预计时长 + 配送概览统计。
16. 订单查询：订单号/客户搜索、门店/渠道/状态/日期筛选、详情抽屉（明细 + 合计）。
17. 售后处理：工单列表、类型/状态筛选、详情抽屉（工单 + 商品明细 + 处理记录）、通过/拒绝状态流转。

**系统**
18. 岗位管理：岗位编码/部门/在岗人数、增改删。
19. 人员管理：工号/手机号/岗位/门店、详情抽屉（账号状态）、增改。
20. 系统日志：操作人/模块/类型/时间范围检索、结果与耗时。

## 团队协作

21 个页面由 Lead + 4 个智能体队员并行完成：营销 5 页、资产 3 页、业务 3 页、售后+系统 4 页各自独立目录与 Mock/Service 层，Lead 负责数据/会员模块、导航与公共约定、集成与验收（`tsc`、`vite build`、21 条路由无头渲染检查、截图）。

## 接口契约文档（给后端）

前端 Mock 的入参/出参已反推成完整的后端接口契约，放在 [`docs/api/`](./docs/api/README.md)：

- [README.md](./docs/api/README.md)：通用约定（Base URL、统一响应、分页、字段类型、错误码、跨模块公共接口）
- [01-dashboard.md](./docs/api/01-dashboard.md) 数据 / 仪表盘
- [02-member.md](./docs/api/02-member.md) 会员（会员信息、等级配置、标签管理）
- [03-marketing.md](./docs/api/03-marketing.md) 营销（满减/满折/发券/自动化/通知）
- [04-assets.md](./docs/api/04-assets.md) 资产（卡券/积分/券包）
- [05-business.md](./docs/api/05-business.md) 业务（菜单/门店/配送）
- [06-dish.md](./docs/api/06-dish.md) 菜品
- [07-order.md](./docs/api/07-order.md) 订单查询
- [08-ops.md](./docs/api/08-ops.md) 售后处理 + 系统（岗位/人员/日志）

另外提供机器可读的 **[OpenAPI 3.0.3 规范](<docs/api/openapi/openapi.yaml>)**（`npm run docs:lint` 校验、`npm run docs:preview` 预览），可导入 Swagger UI / Postman / Apifox 直接调试。

接入真实后端时只需替换 `src/services/*` 的实现（保持函数签名），页面代码零改动。

## 持续集成

[`.github/workflows/ci.yml`](<.github/workflows/ci.yml>) 在每次 push / PR 时自动执行：

1. `npm ci` + `npm run build`：前端类型检查与构建
2. `npm run docs:lint`：OpenAPI 规范校验（Redocly）
3. Markdown 链接检查（lychee，仅本地文件链接）

## 下一步

见 [PLAN.md](./PLAN.md)。
