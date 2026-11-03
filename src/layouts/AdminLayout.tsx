import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Dropdown,
  Layout,
  Menu,
  Select,
  Space,
  Spin,
} from 'antd';
import {
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { findNav, navItems } from '../config/nav';
import { fetchStoreOptions } from '../services/dashboard';

const { Header, Sider, Content } = Layout;

function PageLoading() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
      <Spin size="large" />
    </div>
  );
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [storeOptions, setStoreOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [storeId, setStoreId] = useState<string>();
  const location = useLocation();
  const navigate = useNavigate();
  const current = findNav(location.pathname);

  useEffect(() => {
    fetchStoreOptions().then((options) => {
      setStoreOptions(options);
      setStoreId((prev) => prev ?? options[0]?.value);
    });
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={216}
        collapsedWidth={72}
        collapsed={collapsed}
        style={{ borderRight: '1px solid #f0f0f0', position: 'sticky', top: 0, height: '100vh' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '0 24px' : '0 20px',
            borderBottom: '1px solid #f0f0f0',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#d4380d',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            比
          </div>
          {!collapsed && (
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>比萨斯</div>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>连锁餐饮 SaaS</div>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={current ? [current.path] : []}
          items={navItems.map((item) => ({ key: item.path, icon: item.icon, label: item.label }))}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none', marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            height: 64,
            padding: '0 20px',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Space size={12}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((v) => !v)}
              aria-label="切换侧边栏"
            />
            <Breadcrumb items={[{ title: '比萨斯' }, { title: current?.label ?? '经营概览' }]} />
          </Space>

          <Space size={16}>
            <Select
              showSearch
              optionFilterProp="label"
              value={storeId}
              onChange={setStoreId}
              options={storeOptions}
              style={{ width: 168 }}
              prefix={<ShopOutlined />}
              placeholder="全部门店"
            />
            <Badge count={3} size="small" offset={[-2, 4]}>
              <Button type="text" icon={<BellOutlined />} aria-label="通知" />
            </Badge>
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', label: '个人资料' },
                  { key: 'logout', label: '退出登录' },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ background: '#d4380d' }} size={32}>
                  周
                </Avatar>
                <span style={{ fontSize: 13 }}>周明 · 总部运营</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: 20 }}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}
