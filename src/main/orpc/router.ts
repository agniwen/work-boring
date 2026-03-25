import { os, streamToEventIterator, type } from '@orpc/server';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';

const emptyInput = type<void>();
const chatInput = type<{ chatId: string; messages: UIMessage[] }>();

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

function getMainEnv() {
  return {
    deepSeekApiKey:
      import.meta.env.MAIN_VITE_DEEPSEEK_API_KEY ?? process.env['DEEPSEEK_API_KEY'],
    deepSeekBaseUrl:
      import.meta.env.MAIN_VITE_DEEPSEEK_BASE_URL ??
      import.meta.env.MAIN_VITE_DEEPSEEK_BASEURL ??
      process.env['DEEPSEEK_BASE_URL'] ??
      process.env['DEEPSEEK_BASEURL'],
    deepSeekModel:
      import.meta.env.MAIN_VITE_DEEPSEEK_MODEL ?? process.env['DEEPSEEK_MODEL'],
  };
}

function getDeepSeekProvider() {
  const { deepSeekApiKey, deepSeekBaseUrl } = getMainEnv();
  const apiKey = deepSeekApiKey?.trim();

  if (!apiKey) {
    throw new Error(
      'Missing DeepSeek API key. Set MAIN_VITE_DEEPSEEK_API_KEY in .env or DEEPSEEK_API_KEY in the process environment.',
    );
  }

  return createDeepSeek({
    apiKey,
    baseURL: deepSeekBaseUrl?.trim() || undefined,
  });
}

export function createAppRouter(deps: CreateAppRouterDeps) {
  return {
    chat: {
      stream: os.input(chatInput).handler(async ({ input }) => {
        const provider = getDeepSeekProvider();
        const { deepSeekModel } = getMainEnv();

        const result = streamText({
          model: provider(deepSeekModel?.trim() || 'deepseek-chat'),
          system: 'You are a helpful assistant for a desktop productivity app.',
          messages: await convertToModelMessages(input.messages),
        });

        return streamToEventIterator(result.toUIMessageStream());
      }),
    },
    system: {
      info: os.input(emptyInput).handler(async () => deps.getSystemInfo()),
    },
  };
}
