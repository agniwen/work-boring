import { os, type } from '@orpc/server';

const emptyInput = type<void>();

export interface SystemInfo {
  appName: string;
  appVersion: string;
  platform: NodeJS.Platform;
  arch: NodeJS.Architecture;
  versions: {
    chrome: string;
    electron: string;
    node: string;
  };
}

interface CreateAppRouterDeps {
  getSystemInfo: () => Promise<SystemInfo> | SystemInfo;
}

export function createAppRouter(deps: CreateAppRouterDeps) {
  return {
    system: {
      info: os.input(emptyInput).handler(async () => deps.getSystemInfo()),
    },
  };
}
