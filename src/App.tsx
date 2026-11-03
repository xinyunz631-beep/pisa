import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import { navItems } from './config/nav';

function NotFound() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="页面不存在"
      subTitle="这个页面还没做，或者地址输错了。"
      extra={
        <Button type="primary" onClick={() => navigate('/dashboard')}>
          回到概览
        </Button>
      }
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {navItems.map(({ path, component: Page }) => (
            <Route key={path} path={path.slice(1)} element={<Page />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
