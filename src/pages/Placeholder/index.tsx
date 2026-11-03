import { Button, Card, Result } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { ToolOutlined } from '@ant-design/icons';
import { defaultPath, findChild, findModule, modules } from '../../config/nav';

/** 占位页：菜单已定、页面还没做，或模块的二级菜单还没确定。 */
export default function PlaceholderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const mod = findModule(location.pathname);
  const child = findChild(location.pathname);
  const label = child?.label ?? mod?.label ?? '页面';
  const noChildren = mod ? mod.children.length === 0 : false;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{label}</h2>
          <p>
            {noChildren
              ? '该模块的二级菜单还没确定，先留占位。'
              : '该页面已进入规划，等字段和交互确认后再实现。'}
          </p>
        </div>
      </div>
      <Card>
        <Result
          icon={<ToolOutlined />}
          title={`「${label}」待实现`}
          subTitle={
            noChildren
              ? '把模块下的二级菜单确定后，我会在这里铺开页面。'
              : '这是占位页面：先把菜单、字段和交互定下来，再按优先级逐个补齐。'
          }
          extra={
            <Button type="primary" onClick={() => navigate(defaultPath(modules[0]))}>
              回到会员信息
            </Button>
          }
        />
      </Card>
    </div>
  );
}
