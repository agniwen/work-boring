import { Button } from '@heroui/react';
import { orpc } from '@renderer/lib/orpc';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import {
  DashboardHeaderStartContent,
  DashboardHeaderEndContent,
} from '../-components/dashboard-header-portal';

export const Route = createFileRoute('/_dashboard/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const systemInfoQuery = useQuery(orpc.system.info.queryOptions());

  return (
    <div className='space-y-6'>
      <DashboardHeaderStartContent>Start</DashboardHeaderStartContent>
      <DashboardHeaderEndContent>End</DashboardHeaderEndContent>

      <div className='space-y-3'>
        <h2 className='text-xl font-bold'>Dashboard 内容</h2>
        <p className='text-gray-600'>
          上方的标题和按钮是通过 DashboardHeaderContent 渲染到 layout header 中的。
        </p>
        <Button onPress={() => void systemInfoQuery.refetch()}>
          {systemInfoQuery.isFetching ? '刷新中...' : '重新获取 oRPC 数据'}
        </Button>
      </div>

      <section className='rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h3 className='text-sm font-semibold tracking-[0.2em] text-gray-500 uppercase'>
              oRPC / Electron
            </h3>
            <p className='mt-2 text-lg font-semibold text-gray-900'>
              这个卡片的数据来自 renderer {'->'} preload {'->'} main 的 oRPC 调用链路。
            </p>
          </div>
          <div className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'>
            {systemInfoQuery.isPending ? '连接中' : '已连接'}
          </div>
        </div>

        {systemInfoQuery.error ? (
          <p className='mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700'>
            {systemInfoQuery.error instanceof Error
              ? systemInfoQuery.error.message
              : 'oRPC 请求失败'}
          </p>
        ) : null}

        {systemInfoQuery.data ? (
          <div className='mt-4 grid gap-3 md:grid-cols-2'>
            <div className='rounded-xl bg-gray-50 p-4'>
              <p className='text-xs tracking-[0.18em] text-gray-500 uppercase'>App</p>
              <p className='mt-2 font-mono text-sm text-gray-900'>
                {systemInfoQuery.data.appName} v{systemInfoQuery.data.appVersion}
              </p>
            </div>
            <div className='rounded-xl bg-gray-50 p-4'>
              <p className='text-xs tracking-[0.18em] text-gray-500 uppercase'>Platform</p>
              <p className='mt-2 font-mono text-sm text-gray-900'>
                {systemInfoQuery.data.platform} / {systemInfoQuery.data.arch}
              </p>
            </div>
            <div className='rounded-xl bg-gray-50 p-4'>
              <p className='text-xs tracking-[0.18em] text-gray-500 uppercase'>Electron</p>
              <p className='mt-2 font-mono text-sm text-gray-900'>
                {systemInfoQuery.data.versions.electron}
              </p>
            </div>
            <div className='rounded-xl bg-gray-50 p-4'>
              <p className='text-xs tracking-[0.18em] text-gray-500 uppercase'>Node / Chrome</p>
              <p className='mt-2 font-mono text-sm text-gray-900'>
                {systemInfoQuery.data.versions.node} / {systemInfoQuery.data.versions.chrome}
              </p>
            </div>
          </div>
        ) : (
          <p className='mt-4 text-sm text-gray-500'>正在从主进程加载系统信息…</p>
        )}

        <pre className='mt-4 overflow-x-auto rounded-xl bg-gray-950 p-4 text-xs leading-6 text-gray-100'>
          {JSON.stringify(systemInfoQuery.data ?? null, null, 2)}
        </pre>
      </section>
    </div>
  );
}
