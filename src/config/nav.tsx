import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import {
  BarChartOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  ProfileOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';

/**
 * 导航配置 = 菜单 + 路由的唯一来源。
 * 目前是按典型连锁餐饮 SaaS 草拟的菜单，等你的正式菜单结构给到后，只改这个文件即可。
 */
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Dishes = lazy(() => import('../pages/Dishes'));
const Orders = lazy(() => import('../pages/Orders'));
const Placeholder = lazy(() => import('../pages/Placeholder'));

export interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  component: LazyExoticComponent<ComponentType>;
}

export const navItems: NavItem[] = [
  { path: '/dashboard', label: '经营概览', icon: <DashboardOutlined />, component: Dashboard },
  { path: '/stores', label: '门店管理', icon: <ShopOutlined />, component: Placeholder },
  { path: '/dishes', label: '菜品管理', icon: <CoffeeOutlined />, component: Dishes },
  { path: '/orders', label: '订单管理', icon: <ProfileOutlined />, component: Orders },
  { path: '/members', label: '会员营销', icon: <TeamOutlined />, component: Placeholder },
  { path: '/reports', label: '数据报表', icon: <BarChartOutlined />, component: Placeholder },
  { path: '/settings', label: '系统设置', icon: <SettingOutlined />, component: Placeholder },
];

export function findNav(pathname: string): NavItem | undefined {
  return navItems.find((item) => pathname.startsWith(item.path));
}
