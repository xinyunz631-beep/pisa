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
  Timeline,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { auditAfterSale, fetchAfterSales } from '../../services/ops';
import type {
  AfterSaleStatus,
  AfterSaleTicket,
  AfterSaleType,
} from '../../services/ops';
import type { Paged } from '../../types';
import { money } from '../../utils/format';

const emptyPage: Paged<AfterSaleTicket> = { list: [], total: 0, page: 1, pageSize: 10 };

const afterSaleTypeMeta: Record<AfterSaleType, { label: string; color: string }> = {
  refund: { label: '退款', color: 'volcano' },
  return: { label: '退货', color: 'blue' },
  exchange: { label: '换货', color: 'cyan' },
};

const afterSaleStatusMeta: Record<AfterSaleStatus, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'gold' },
  processing: { label: '处理中', color: 'blue' },
  done: { label: '已完成', color: 'green' },
  rejected: { label: '已拒绝', color: 'red' },
};

/** 售后处理：筛选工单、查看订单明细与处理记录，并通过 / 拒绝走 Mock 状态流转。 */
export default function AfterSalePage() {
  const { message } = App.useApp();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<AfterSaleStatus | 'all'>('all');
  const [type, setType] = useState<AfterSaleType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Paged<AfterSaleTicket>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AfterSaleTicket | null>(null);
  const [auditing, setAuditing] = useState<'approve' | 'reject' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAfterSales({ keyword, status, type, page, pageSize }));
    } finally {
      setLoading(false);
    }
  }, [keyword, status, type, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetFilters = () => {
    setKeyword('');
    setStatus('all');
    setType('all');
    setPage(1);
  };

  const handleAudit = async (action: 'approve' | 'reject') => {
    if (!detail) return;
    setAuditing(action);
    try {
      const updated = await auditAfterSale(detail.id, action);
      setDetail(updated);
      message.success(action === 'approve' ? '已通过售后申请' : '已拒绝售后申请');
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setAuditing(null);
    }
  };

  const columns: ColumnsType<AfterSaleTicket> = [
    { title: '工单号', dataIndex: 'id', width: 160, fixed: 'left' },
    { title: '订单号', dataIndex: 'orderId', width: 160 },
    { title: '门店', dataIndex: 'storeName', width: 120 },
    { title: '客户', dataIndex: 'customer', width: 90 },
    {
      title: '售后类型',
      dataIndex: 'type',
      width: 100,
      render: (value: AfterSaleType) => (
        <Tag color={afterSaleTypeMeta[value].color}>{afterSaleTypeMeta[value].label}</Tag>
      ),
    },
    { title: '售后原因', dataIndex: 'reason', width: 110, ellipsis: true },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      align: 'right',
      render: (value: number) => <span style={{ fontWeight: 600 }}>{money(value)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: AfterSaleStatus) => (
        <Tag color={afterSaleStatusMeta[value].color}>{afterSaleStatusMeta[value].label}</Tag>
      ),
    },
    { title: '申请时间', dataIndex: 'appliedAt', width: 165 },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, ticket) => (
        <Button type="link" size="small" onClick={() => setDetail(ticket)}>
          处理
        </Button>
      ),
    },
  ];

  const canAudit = detail ? detail.status === 'pending' || detail.status === 'processing' : false;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>售后处理</h2>
          <p>
            共 {data.total} 个售后工单，支持按状态 / 类型 / 关键词筛选并在线处理（Mock 数据）
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索工单号 / 订单号 / 客户 / 门店"
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '待处理', value: 'pending' },
              { label: '处理中', value: 'processing' },
              { label: '已完成', value: 'done' },
              { label: '已拒绝', value: 'rejected' },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 130 }}
            value={type}
            options={[
              { label: '全部类型', value: 'all' },
              { label: '退款', value: 'refund' },
              { label: '退货', value: 'return' },
              { label: '换货', value: 'exchange' },
            ]}
            onChange={(value) => {
              setType(value);
              setPage(1);
            }}
          />
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <Table<AfterSaleTicket>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.list}
          scroll={{ x: 1170 }}
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
          locale={{ emptyText: keyword || status !== 'all' || type !== 'all' ? '没有符合条件的工单' : '暂无售后工单' }}
        />
      </Card>

      <Drawer
        title={detail ? `售后处理 · ${detail.id}` : '售后处理'}
        width={680}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        destroyOnClose
        footer={
          detail ? (
            <Space style={{ float: 'right' }}>
              <Button onClick={() => setDetail(null)}>关闭</Button>
              <Button
                danger
                disabled={!canAudit}
                loading={auditing === 'reject'}
                onClick={() => void handleAudit('reject')}
              >
                拒绝
              </Button>
              <Button
                type="primary"
                disabled={!canAudit}
                loading={auditing === 'approve'}
                onClick={() => void handleAudit('approve')}
              >
                通过
              </Button>
            </Space>
          ) : null
        }
      >
        {detail && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="工单号" span={2}>
                {detail.id}
              </Descriptions.Item>
              <Descriptions.Item label="订单号" span={2}>
                {detail.orderId}
              </Descriptions.Item>
              <Descriptions.Item label="门店">{detail.storeName}</Descriptions.Item>
              <Descriptions.Item label="客户">{detail.customer}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="申请时间">{detail.appliedAt}</Descriptions.Item>
              <Descriptions.Item label="售后类型">
                <Tag color={afterSaleTypeMeta[detail.type].color}>
                  {afterSaleTypeMeta[detail.type].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="售后金额">
                <span style={{ fontWeight: 600 }}>{money(detail.amount)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="售后原因" span={2}>
                {detail.reason}
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={afterSaleStatusMeta[detail.status].color}>
                  {afterSaleStatusMeta[detail.status].label}
                </Tag>
                {!canAudit && (
                  <span style={{ marginLeft: 8, color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                    该工单已处理完成，无需重复操作
                  </span>
                )}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>订单商品明细</div>
              <Table
                rowKey={(item) => item.name}
                size="small"
                pagination={false}
                dataSource={detail.items}
                columns={[
                  { title: '菜品', dataIndex: 'name' },
                  {
                    title: '单价',
                    dataIndex: 'price',
                    align: 'right',
                    width: 90,
                    render: (value: number) => money(value),
                  },
                  { title: '数量', dataIndex: 'qty', align: 'right', width: 70 },
                  {
                    title: '小计',
                    align: 'right',
                    width: 100,
                    render: (_, item) => money(item.price * item.qty),
                  },
                ]}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <strong>售后金额合计</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong>{money(detail.amount)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>处理记录</div>
              <Timeline
                items={detail.records.map((record) => ({
                  color: record.action.includes('拒绝')
                    ? 'red'
                    : record.action.includes('通过')
                      ? 'green'
                      : 'blue',
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>{record.action}</div>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                        {record.time} · {record.operator}
                      </div>
                    </div>
                  ),
                }))}
              />
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
