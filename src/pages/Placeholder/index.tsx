import { Button, Card, Result } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { ToolOutlined } from '@ant-design/icons';
import { findNav } from '../../config/nav';

/** 占位页：菜单已定、页面还没做。等菜单结构确认后逐个替换。 */
export default function PlaceholderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = findNav(location.pathname);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{nav?.label ?? '页面建设中'}</h2>
          <p>该模块已进入规划，等菜单结构和字段确认后再实现。</p>
        </div>
      </div>
      <Card>
        <Result
          icon={<ToolOutlined />}
          title={`「${nav?.label ?? '该页面'}」待实现`}
          subTitle="这是一个占位页面。先把菜单、字段和交互定下来，再按优先级逐个补齐。"
          extra={
            <Button type="primary" onClick={() => navigate('/dashboard')}>
              回到经营概览
            </Button>
          }
        />
      </Card>
    </div>
  );
}
