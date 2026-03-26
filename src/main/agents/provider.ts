import { createDeepSeek } from '@ai-sdk/deepseek';
import { streamText } from 'ai';

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
  return provider(getMainLanguageModelName());
}
