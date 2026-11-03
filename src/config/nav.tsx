import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import {
  AppstoreOutlined,
  CarOutlined,
  CoffeeOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  GiftOutlined,
  IdcardOutlined,
  InboxOutlined,
  MessageOutlined,
  OrderedListOutlined,
  PercentageOutlined,
  ProfileOutlined,
  RiseOutlined,
  SendOutlined,
  SettingOutlined,
  ShopOutlined,
  SolutionOutlined,
  StarOutlined,
  TagOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UsergroupAddOutlined,
  WalletOutlined,
} from '@ant-design/icons';

/**
 * 导航配置 = 顶部 6 大模块 + 左侧二级菜单 + 路由的唯一来源。
 * 模块顺序：会员 / 营销 / 资产 / 业务 / 订单 / 系统。
 */
const MembersPage = lazy(() => import('../pages/Members'));
const MemberLevelsPage = lazy(() => import('../pages/MemberLevels'));
const MemberTagsPage = lazy(() => import('../pages/MemberTags'));
const DishesPage = lazy(() => import('../pages/Dishes'));
const OrdersPage = lazy(() => import('../pages/Orders'));
const FullReductionPage = lazy(() => import('../pages/Marketing/FullReduction'));
const FullDiscountPage = lazy(() => import('../pages/Marketing/FullDiscount'));
const CouponPage = lazy(() => import('../pages/Marketing/Coupon'));
const AutomationPage = lazy(() => import('../pages/Marketing/Automation'));
const NotificationsPage = lazy(() => import('../pages/Marketing/Notifications'));
const AfterSalePage = lazy(() => import('../pages/AfterSale'));
const PositionsPage = lazy(() => import('../pages/System/Positions'));
const StaffPage = lazy(() => import('../pages/System/Staff'));
const LogsPage = lazy(() => import('../pages/System/Logs'));
const CardsPage = lazy(() => import('../pages/Assets/Cards'));
const PointsPage = lazy(() => import('../pages/Assets/Points'));
const PackagesPage = lazy(() => import('../pages/Assets/Packages'));
const MenusPage = lazy(() => import('../pages/Business/Menus'));
const StoresPage = lazy(() => import('../pages/Business/Stores'));
const DeliveryPage = lazy(() => import('../pages/Business/Delivery'));

export interface NavChild {
  path: string;
  label: string;
  icon: ReactNode;
  component: LazyExoticComponent<ComponentType>;
}

export interface NavModule {
  path: string;
  label: string;
  icon: ReactNode;
  children: NavChild[];
  /** 无二级菜单的模块，直接渲染这个组件（通常是占位页）。 */
  component?: LazyExoticComponent<ComponentType>;
}

export const modules: NavModule[] = [
  {
    path: '/members',
    label: '会员',
    icon: <TeamOutlined />,
    children: [
      { path: '/members/info', label: '会员信息', icon: <IdcardOutlined />, component: MembersPage },
      { path: '/members/levels', label: '等级配置', icon: <RiseOutlined />, component: MemberLevelsPage },
      { path: '/members/tags', label: '标签管理', icon: <TagsOutlined />, component: MemberTagsPage },
    ],
  },
  {
    path: '/marketing',
    label: '营销',
    icon: <GiftOutlined />,
    children: [
      {
        path: '/marketing/full-reduction',
        label: '满减活动',
        icon: <TagOutlined />,
        component: FullReductionPage,
      },
      {
        path: '/marketing/full-discount',
        label: '满折活动',
        icon: <PercentageOutlined />,
        component: FullDiscountPage,
      },
      {
        path: '/marketing/coupon',
        label: '发券活动',
        icon: <SendOutlined />,
        component: CouponPage,
      },
      {
        path: '/marketing/automation',
        label: '自动化营销',
        icon: <ThunderboltOutlined />,
        component: AutomationPage,
      },
      {
        path: '/marketing/notifications',
        label: '消息通知',
        icon: <MessageOutlined />,
        component: NotificationsPage,
      },
    ],
  },
  {
    path: '/assets',
    label: '资产',
    icon: <WalletOutlined />,
    children: [
      { path: '/assets/cards', label: '卡券管理', icon: <CreditCardOutlined />, component: CardsPage },
      { path: '/assets/points', label: '积分管理', icon: <StarOutlined />, component: PointsPage },
      { path: '/assets/packages', label: '券包管理', icon: <InboxOutlined />, component: PackagesPage },
    ],
  },
  {
    path: '/business',
    label: '业务',
    icon: <AppstoreOutlined />,
    children: [
      { path: '/business/dishes', label: '菜品管理', icon: <CoffeeOutlined />, component: DishesPage },
      { path: '/business/menus', label: '菜单管理', icon: <OrderedListOutlined />, component: MenusPage },
      { path: '/business/stores', label: '门店管理', icon: <ShopOutlined />, component: StoresPage },
      { path: '/business/delivery', label: '配送管理', icon: <CarOutlined />, component: DeliveryPage },
    ],
  },
  {
    path: '/orders',
    label: '订单',
    icon: <ProfileOutlined />,
    children: [
      { path: '/orders/query', label: '订单查询', icon: <FileSearchOutlined />, component: OrdersPage },
      {
        path: '/orders/after-sale',
        label: '售后处理',
        icon: <CustomerServiceOutlined />,
        component: AfterSalePage,
      },
    ],
  },
  {
    path: '/system',
    label: '系统',
    icon: <SettingOutlined />,
    children: [
      { path: '/system/positions', label: '岗位管理', icon: <SolutionOutlined />, component: PositionsPage },
      { path: '/system/staff', label: '人员管理', icon: <UsergroupAddOutlined />, component: StaffPage },
      { path: '/system/logs', label: '系统日志', icon: <FileTextOutlined />, component: LogsPage },
    ],
  },
];

export function findModule(pathname: string): NavModule | undefined {
  return modules.find((mod) => pathname === mod.path || pathname.startsWith(`${mod.path}/`));
}

export function findChild(pathname: string): NavChild | undefined {
  for (const mod of modules) {
    const child = mod.children.find((item) => item.path === pathname);
    if (child) return child;
  }
  return undefined;
}

/** 点击顶部模块时默认跳转的地址：优先第一个二级菜单，否则停在模块本身。 */
export function defaultPath(mod: NavModule): string {
  return mod.children[0]?.path ?? mod.path;
}
