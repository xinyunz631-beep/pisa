import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import {
  AppstoreOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  GiftOutlined,
  IdcardOutlined,
  ProfileOutlined,
  RiseOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  WalletOutlined,
} from '@ant-design/icons';

/**
 * 导航配置 = 顶部模块 + 左侧二级菜单 + 路由的唯一来源。
 * 模块顺序：会员管理 / 营销管理 / 资产管理 / 业务管理 / 系统管理。
 */
const MembersPage = lazy(() => import('../pages/Members'));
const DashboardPage = lazy(() => import('../pages/Dashboard'));
const DishesPage = lazy(() => import('../pages/Dishes'));
const OrdersPage = lazy(() => import('../pages/Orders'));
const Placeholder = lazy(() => import('../pages/Placeholder'));

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
    label: '会员管理',
    icon: <TeamOutlined />,
    children: [
      { path: '/members/list', label: '会员信息', icon: <IdcardOutlined />, component: MembersPage },
      { path: '/members/levels', label: '等级配置', icon: <RiseOutlined />, component: Placeholder },
      { path: '/members/tags', label: '标签管理', icon: <TagsOutlined />, component: Placeholder },
    ],
  },
  {
    path: '/marketing',
    label: '营销管理',
    icon: <GiftOutlined />,
    children: [
      {
        path: '/marketing/automation',
        label: '自动化营销',
        icon: <ThunderboltOutlined />,
        component: Placeholder,
      },
    ],
  },
  {
    path: '/assets',
    label: '资产管理',
    icon: <WalletOutlined />,
    children: [],
    component: Placeholder,
  },
  {
    path: '/business',
    label: '业务管理',
    icon: <AppstoreOutlined />,
    children: [
      {
        path: '/business/dashboard',
        label: '经营概览',
        icon: <DashboardOutlined />,
        component: DashboardPage,
      },
      { path: '/business/dishes', label: '菜品管理', icon: <CoffeeOutlined />, component: DishesPage },
      { path: '/business/orders', label: '订单管理', icon: <ProfileOutlined />, component: OrdersPage },
    ],
  },
  {
    path: '/system',
    label: '系统管理',
    icon: <SettingOutlined />,
    children: [],
    component: Placeholder,
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
