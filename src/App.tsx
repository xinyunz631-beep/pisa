import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';
import AdminLayout from './layouts/AdminLayout';
import { defaultPath, modules } from './config/nav';

function NotFound() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="页面不存在"
      subTitle="这个页面还没做，或者地址输错了。"
      extra={
        <Button type="primary" onClick={() => navigate(defaultPath(modules[0]))}>
          回到首页
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
          <Route index element={<Navigate to={defaultPath(modules[0])} replace />} />
          {modules.flatMap((mod) => {
            if (mod.children.length > 0) {
              return mod.children.map((child) => (
                <Route key={child.path} path={child.path.slice(1)} element={<child.component />} />
              ));
            }
            const ModulePage = mod.component;
            return [
              <Route
                key={mod.path}
                path={mod.path.slice(1)}
                element={ModulePage ? <ModulePage /> : null}
              />,
            ];
          })}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
