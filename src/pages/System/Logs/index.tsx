import { useCallback, useEffect, useState } from 'react';
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchLogs } from '../../../services/ops';
import type { LogAction, LogResult, SystemLog } from '../../../services/ops';
import type { Paged } from '../../../types';

const emptyPage: Paged<SystemLog> = { list: [], total: 0, page: 1, pageSize: 10 };

const logActionMeta: Record<LogAction, { label: string; color: string }> = {
  create: { label: '新增', color: 'blue' },
  update: { label: '编辑', color: 'gold' },
  delete: { label: '删除', color: 'red' },
  login: { label: '登录', color: 'cyan' },
  export: { label: '导出', color: 'purple' },
};

const logResultMeta: Record<LogResult, { label: string; color: string }> = {
  success: { label: '成功', color: 'green' },
  fail: { label: '失败', color: 'red' },
};

/** 系统日志：按操作人 / 模块 / 操作类型 / 时间范围检索操作记录。 */
export default function LogsPage() {
  const [keyword, setKeyword] = useState('');
  const [action, setAction] = useState<LogAction | 'all'>('all');
  const [range, setRange] = useState<[string, string]>();
  const [pickerValue, setPickerValue] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<SystemLog>>(emptyPage);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchLogs({ keyword, action, range, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, action, range, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetFilters = () => {
    setKeyword('');
    setAction('all');
    setRange(undefined);
    setPickerValue(null);
    setPage(1);
  };

  const columns: ColumnsType<SystemLog> = [
    { title: '时间', dataIndex: 'time', width: 160 },
    { title: '操作人', dataIndex: 'operator', width: 110 },
    { title: '所属模块', dataIndex: 'module', width: 120 },
    {
      title: '操作类型',
      dataIndex: 'action',
      width: 110,
      render: (value: LogAction) => (
        <Tag color={logActionMeta[value].color}>{logActionMeta[value].label}</Tag>
      ),
    },
    { title: 'IP', dataIndex: 'ip', width: 140 },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: (value: LogResult) => (
        <Tag color={logResultMeta[value].color}>{logResultMeta[value].label}</Tag>
      ),
    },
    {
      title: '耗时(ms)',
      dataIndex: 'duration',
      width: 110,
      align: 'right',
      sorter: (a, b) => a.duration - b.duration,
      render: (value: number) => `${value} ms`,
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>系统日志</h2>
          <p>共 {data.total} 条操作日志，支持按操作人 / 模块 / 操作类型 / 时间范围检索（Mock 数据）</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索操作人 / 所属模块"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={action}
            options={[
              { label: '全部类型', value: 'all' },
              { label: '新增', value: 'create' },
              { label: '编辑', value: 'update' },
              { label: '删除', value: 'delete' },
              { label: '登录', value: 'login' },
              { label: '导出', value: 'export' },
            ]}
            onChange={(value) => {
              setAction(value);
              setPage(1);
            }}
          />
          <DatePicker.RangePicker
            value={pickerValue}
            onChange={(dates) => {
              setPickerValue(dates);
              const next =
                dates && dates[0] && dates[1]
                  ? ([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] as [string, string])
                  : undefined;
              setRange(next);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<SystemLog>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 840 }}
          pagination={{
            current: page,
            pageSize,
            total: data.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          locale={{
            emptyText:
              keyword || action !== 'all' || range ? '没有符合条件的日志' : '暂无系统日志',
          }}
        />
      </Card>
    </div>
  );
}
