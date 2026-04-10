import { createRequire } from 'node:module';

import { createDeepSeek } from '@ai-sdk/deepseek';
import { streamText, wrapLanguageModel, type LanguageModelMiddleware } from 'ai';

// Load @ai-sdk/devtools lazily via createRequire so:
//   1. Vite never tries to bundle it (createRequire is opaque to the bundler).
//   2. The whole block is dead-code-eliminated in production builds.
//   3. It can stay in devDependencies and be absent from packaged apps.
let devToolsMiddleware: LanguageModelMiddleware | null = null;
if (import.meta.env.DEV) {
  try {
    const requireDev = createRequire(import.meta.url);
    const mod = requireDev('@ai-sdk/devtools') as {
      devToolsMiddleware: () => LanguageModelMiddleware;
    };
    devToolsMiddleware = mod.devToolsMiddleware();
  } catch (error) {
    console.warn('[ai-sdk devtools] not enabled:', (error as Error).message);
  }
}

export function getAgentEnv() {
  // Accept both Electron-injected env vars and plain process env so local dev and packaged runs
  // resolve model settings the same way.
  return {
    deepSeekApiKey: import.meta.env.MAIN_VITE_DEEPSEEK_API_KEY ?? process.env['DEEPSEEK_API_KEY'],
    deepSeekBaseUrl:
      import.meta.env.MAIN_VITE_DEEPSEEK_BASE_URL ??
      import.meta.env.MAIN_VITE_DEEPSEEK_BASEURL ??
      process.env['DEEPSEEK_BASE_URL'] ??
      process.env['DEEPSEEK_BASEURL'],
    deepSeekModel: import.meta.env.MAIN_VITE_DEEPSEEK_MODEL ?? process.env['DEEPSEEK_MODEL'],
  };
}

export function getMainLanguageModelName() {
  return getAgentEnv().deepSeekModel?.trim() || 'deepseek-chat';
}

export function createMainLanguageModel(): Parameters<typeof streamText>[0]['model'] {
  const { deepSeekApiKey, deepSeekBaseUrl } = getAgentEnv();
  const apiKey = deepSeekApiKey?.trim();

  if (!apiKey) {
    throw new Error(
      'Missing DeepSeek API key. Set MAIN_VITE_DEEPSEEK_API_KEY in .env or DEEPSEEK_API_KEY in the process environment.',
    );
  }

  const provider = createDeepSeek({
    apiKey,
    baseURL: deepSeekBaseUrl?.trim() || undefined,
  });

  // Build the concrete model instance lazily so startup fails with a clear credential error.
  const baseModel = provider(getMainLanguageModelName());

  // In dev, route every model call through the AI SDK devtools viewer
  // (run `pnpm dlx @ai-sdk/devtools` and open http://localhost:4983).
  if (devToolsMiddleware) {
    return wrapLanguageModel({
      model: baseModel,
      middleware: devToolsMiddleware,
    });
  }
  return baseModel;
}
