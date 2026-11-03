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
import { BellOutlined, ShopOutlined } from '@ant-design/icons';
import { defaultPath, findChild, findModule, modules } from '../config/nav';
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
  const [storeOptions, setStoreOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [storeId, setStoreId] = useState<string>();
  const location = useLocation();
  const navigate = useNavigate();

  const activeModule = findModule(location.pathname);
  const activeChild = findChild(location.pathname);
  const sidebarItems = activeModule?.children ?? [];

  useEffect(() => {
    fetchStoreOptions().then((options) => {
      setStoreOptions(options);
      setStoreId((prev) => prev ?? options[0]?.value);
    });
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          height: 64,
          padding: '0 20px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          onClick={() => navigate(defaultPath(modules[0]))}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}
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
            }}
          >
            比
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>比萨斯</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>连锁餐饮 SaaS</div>
          </div>
        </div>

        <Menu
          mode="horizontal"
          selectedKeys={activeModule ? [activeModule.path] : []}
          items={modules.map((mod) => ({ key: mod.path, icon: mod.icon, label: mod.label }))}
          onClick={({ key }) => {
            const target = modules.find((mod) => mod.path === key);
            if (target) navigate(defaultPath(target));
          }}
          style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
        />

        <Space size={16} style={{ flexShrink: 0 }}>
          <Select
            showSearch
            optionFilterProp="label"
            value={storeId}
            onChange={setStoreId}
            options={storeOptions}
            style={{ width: 160 }}
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

      <Layout>
        {activeModule && sidebarItems.length > 0 && (
          <Sider
            theme="light"
            width={200}
            style={{
              borderRight: '1px solid #f0f0f0',
              position: 'sticky',
              top: 64,
              height: 'calc(100vh - 64px)',
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={activeChild ? [activeChild.path] : []}
              items={sidebarItems.map((child) => ({
                key: child.path,
                icon: child.icon,
                label: child.label,
              }))}
              onClick={({ key }) => navigate(key)}
              style={{ borderInlineEnd: 'none', paddingTop: 8 }}
            />
          </Sider>
        )}

        <Content style={{ padding: '16px 20px', minWidth: 0 }}>
          <Breadcrumb
            items={[
              { title: activeModule?.label ?? '比萨斯' },
              ...(activeChild ? [{ title: activeChild.label }] : []),
            ]}
            style={{ marginBottom: 12 }}
          />
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}
