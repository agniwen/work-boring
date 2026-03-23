import { createMagicPortal } from 'foxact/magic-portal';

/**
 * Dashboard Header Portal
 *
 * 使用方法：
 * 1. 在 DashboardLayout 中使用 DashboardHeaderStartProvider 包裹内容
 * 2. 在 header 位置放置 DashboardHeaderStartTarget
 * 3. 在子页面中使用 DashboardHeaderStartContent 渲染内容到 header
 */
export const [
  DashboardHeaderStartProvider,
  DashboardHeaderStartTarget,
  DashboardHeaderStartContent,
] = createMagicPortal('dashboard-header-start');

export const [DashboardHeaderEndProvider, DashboardHeaderEndTarget, DashboardHeaderEndContent] =
  createMagicPortal('dashboard-header-end');
