import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchMembers, fetchMemberLevelNames } from '../../services/member';
import type { Member, Paged } from '../../types';
import { memberLevelMeta, memberStatusMeta, money } from '../../utils/format';

const emptyPage: Paged<Member> = { list: [], total: 0, page: 1, pageSize: 10 };

/** 会员信息：按手机号 / 会员号查询会员基础信息。 */
export default function MembersPage() {
  const { message } = App.useApp();

  const [keyword, setKeyword] = useState('');
  const [level, setLevel] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [levels, setLevels] = useState<string[]>([]);
  const [data, setData] = useState<Paged<Member>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Member | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchMembers({ keyword, level, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, level, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchMemberLevelNames().then(setLevels);
  }, []);

  const search = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const reset = () => {
    setKeyword('');
    setLevel(undefined);
    setPage(1);
    setDetail(null);
    message.info('已重置查询条件');
  };

  const columns: ColumnsType<Member> = [
    { title: '会员号', dataIndex: 'memberNo', width: 110 },
    { title: '昵称', dataIndex: 'nickname', width: 140 },
    { title: '手机号', dataIndex: 'phone', width: 140 },
    {
      title: '等级',
      dataIndex: 'level',
      width: 110,
      render: (value: string) => (
        <Tag color={memberLevelMeta[value]?.color ?? 'default'}>{value}</Tag>
      ),
    },
    {
      title: '累计消费',
      dataIndex: 'totalSpent',
      width: 120,
      align: 'right',
      render: (value: number) => <span style={{ fontWeight: 600 }}>{money(value)}</span>,
    },
    { title: '积分', dataIndex: 'points', width: 100, align: 'right' },
    {
      title: '最近消费',
      dataIndex: 'lastVisit',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: Member['status']) => (
        <Tag color={memberStatusMeta[value].color}>{memberStatusMeta[value].label}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, member) => (
        <Button type="link" size="small" onClick={() => setDetail(member)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>会员信息</h2>
          <p>支持按手机号、会员号查询会员基础信息与消费概览（Mock 数据）</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="输入手机号 / 会员号"
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
            onSearch={search}
          />
          <Select
            allowClear
            placeholder="全部等级"
            style={{ width: 140 }}
            options={levels.map((item) => ({ label: item, value: item }))}
            value={level}
            onChange={(value) => {
              setLevel(value);
              setPage(1);
            }}
          />
          <Button onClick={reset}>重置</Button>
        </Space>

        <Table<Member>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1040 }}
          pagination={{
            current: page,
            pageSize,
            total: data.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 位会员`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          locale={{ emptyText: keyword || level ? '没有找到匹配的会员' : '暂无会员数据' }}
        />
      </Card>

      <Drawer
        title={detail ? `会员详情 · ${detail.memberNo}` : '会员详情'}
        width={520}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        destroyOnClose
      >
        {detail && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="会员号">{detail.memberNo}</Descriptions.Item>
              <Descriptions.Item label="昵称">{detail.nickname}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="等级">
                <Tag color={memberLevelMeta[detail.level]?.color ?? 'default'}>{detail.level}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">{detail.joinedAt}</Descriptions.Item>
              <Descriptions.Item label="生日">{detail.birthday}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={memberStatusMeta[detail.status].color}>
                  {memberStatusMeta[detail.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最近消费">{detail.lastVisit}</Descriptions.Item>
              <Descriptions.Item label="会员标签" span={2}>
                <Space size={4} wrap>
                  {detail.tags.length
                    ? detail.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                    : '—'}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="消费概览" column={3} size="small" bordered>
              <Descriptions.Item label="累计消费">{money(detail.totalSpent)}</Descriptions.Item>
              <Descriptions.Item label="消费次数">{detail.orderCount} 次</Descriptions.Item>
              <Descriptions.Item label="当前积分">{detail.points}</Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
