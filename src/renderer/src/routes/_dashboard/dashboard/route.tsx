import { Button, Card, Chip } from '@heroui/react';
import { orpc } from '@renderer/lib/orpc';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Activity, ChartColumnIncreasing, MessageSquareMore, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  DashboardHeaderEndContent,
  DashboardHeaderStartContent,
} from '../-components/dashboard-header-portal';

export const Route = createFileRoute('/_dashboard/dashboard')({
  component: Dashboard,
});

function formatCompact(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(dateText: string | null | undefined) {
  if (!dateText) {
    return '暂无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateText));
}

function formatDateTime(timestamp: number | null | undefined) {
  if (!timestamp) {
    return '暂无记录';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

function Dashboard() {
  const navigate = Route.useNavigate();
  const summaryQuery = useQuery(orpc.dashboard.summary.queryOptions());
  const summary = summaryQuery.data;

  return (
    <div className='space-y-5 py-4'>
      <DashboardHeaderStartContent>
        <div>
          <div className='text-sm font-semibold text-foreground'>Dashboard</div>
          <div className='text-xs text-muted-foreground'>消息、token 与会话概览</div>
        </div>
      </DashboardHeaderStartContent>

      <DashboardHeaderEndContent />

      <Card>
        <Card.Content className='p-5'>
          <div className='space-y-2'>
            <div className='inline-flex items-center gap-2 text-sm font-medium text-foreground'>
              <Sparkles size={16} />
              <span>Chat Analytics</span>
            </div>
            <h1 className='text-2xl font-semibold text-foreground'>
              每日 token、prompt 次数和最近一次会话概览
            </h1>
            <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
              数据直接来自主进程持久化层。新的 assistant 回复会记录真实 usage，旧消息没有 usage
              时会按文本做兼容估算。
            </p>
          </div>
        </Card.Content>
      </Card>

      {summaryQuery.error ? (
        <Card>
          <Card.Content className='p-4 text-sm text-danger'>
            {summaryQuery.error instanceof Error
              ? summaryQuery.error.message
              : 'Dashboard 数据加载失败'}
          </Card.Content>
        </Card>
      ) : null}

      <div className='grid gap-4 md:grid-cols-2 2xl:grid-cols-4'>
        <MetricCard
          description='当天 assistant 累计 usage'
          icon={<Sparkles size={18} />}
          label='今日消耗 Token'
          value={summary ? formatCompact(summary.todayTokenCount) : '...'}
        />
        <MetricCard
          description='当天用户提交次数'
          icon={<MessageSquareMore size={18} />}
          label='今日 Prompt 次数'
          value={summary ? formatCompact(summary.todayPromptCount) : '...'}
        />
        <MetricCard
          description='全部会话中的用户消息'
          icon={<ChartColumnIncreasing size={18} />}
          label='累计 Prompt 次数'
          value={summary ? formatCompact(summary.totalPromptCount) : '...'}
        />
        <MetricCard
          description='已删除会话不会计入'
          icon={<Activity size={18} />}
          label='当前会话数'
          value={summary ? formatCompact(summary.activeSessionCount) : '...'}
        />
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]'>
        <Card>
          <Card.Header className='flex items-start justify-between gap-4 p-5'>
            <div>
              <Card.Title>最近 14 天趋势</Card.Title>
              <Card.Description>橙色是 token 消耗，蓝色是 prompt 次数。</Card.Description>
            </div>
            <Chip>{summary?.daily.length ?? 0} points</Chip>
          </Card.Header>
          <Card.Content className='px-2 pb-2'>
            {summary ? (
              <div className='h-[320px] w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <ComposedChart
                    data={summary.daily}
                    margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke='rgba(148,163,184,0.18)' vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey='date'
                      minTickGap={24}
                      tickFormatter={(value) => formatDate(value)}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickFormatter={(value) => formatCompact(Number(value))}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      width={52}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(251, 191, 36, 0.08)' }}
                      content={({ active, label, payload }) => {
                        if (!active || !payload?.length) {
                          return null;
                        }

                        const tokenCount = Number(
                          payload.find((item) => item.dataKey === 'tokenCount')?.value ?? 0,
                        );
                        const promptCount = Number(
                          payload.find((item) => item.dataKey === 'promptCount')?.value ?? 0,
                        );

                        return (
                          <div className='rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur'>
                            <div className='text-xs font-medium text-slate-500'>
                              {formatDate(String(label ?? ''))}
                            </div>
                            <div className='mt-2 space-y-1 text-sm text-slate-700'>
                              <div>Token: {formatCompact(tokenCount)}</div>
                              <div>Prompts: {promptCount}</div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey='tokenCount'
                      fill='#d4d4d8'
                      maxBarSize={28}
                      radius={[10, 10, 4, 4]}
                    />
                    <Bar
                      dataKey='promptCount'
                      fill='#a1a1aa'
                      maxBarSize={18}
                      radius={[10, 10, 4, 4]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <DashboardEmptyState text='正在加载趋势数据...' />
            )}
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className='p-5'>
            <Card.Title>最后一次聊天会话</Card.Title>
            <Card.Description>已删除的会话不会出现在这里。</Card.Description>
          </Card.Header>
          <Card.Content className='p-5 pt-0'>
            {summary?.latestSession ? (
              <div className='space-y-4'>
                <div className='space-y-3 rounded-2xl border p-4'>
                  <div className='text-xs tracking-[0.22em] text-muted-foreground uppercase'>
                    Latest Session
                  </div>
                  <div className='text-xl font-semibold text-foreground'>
                    {summary.latestSession.title}
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Chip size='sm'>{summary.latestSession.model ?? 'Unknown model'}</Chip>
                    <Chip size='sm'>{summary.latestSession.status}</Chip>
                  </div>
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <InfoCard
                    label='最后消息时间'
                    value={formatDateTime(summary.latestSession.lastMessageAt)}
                  />
                  <InfoCard
                    label='创建时间'
                    value={formatDateTime(summary.latestSession.createdAt)}
                  />
                </div>

                <Button
                  className='w-full'
                  onPress={() =>
                    void navigate({
                      params: { sessionId: summary.latestSession?.id } as { sessionId?: string },
                      to: '/chat/{-$sessionId}',
                    })
                  }
                >
                  打开这次会话
                </Button>
              </div>
            ) : (
              <DashboardEmptyState text='还没有可展示的聊天会话。' />
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}

function MetricCard(props: { description: string; icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <Card.Content className='p-4'>
        <div className='flex items-center gap-2 text-muted-foreground'>
          {props.icon}
          <div className='text-xs tracking-[0.22em] uppercase'>{props.label}</div>
        </div>
        <div className='mt-4 text-3xl font-semibold tracking-tight text-foreground'>
          {props.value}
        </div>
        <div className='mt-2 text-sm leading-6 text-muted-foreground'>{props.description}</div>
      </Card.Content>
    </Card>
  );
}

function InfoCard(props: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border p-4'>
      <div className='text-xs tracking-[0.18em] text-muted-foreground uppercase'>{props.label}</div>
      <div className='mt-2 text-sm font-medium text-foreground'>{props.value}</div>
    </div>
  );
}

function DashboardEmptyState(props: { text: string }) {
  return (
    <div className='flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed px-6 text-center text-sm text-muted-foreground'>
      {props.text}
    </div>
  );
}
