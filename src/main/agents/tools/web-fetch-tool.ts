import { tool } from 'ai';
import { z } from 'zod';

const MAX_BODY_CHARACTERS = 20_000;
const FETCH_TIMEOUT_MS = 30_000;

// Lightweight web fetch tool. Runs in the Electron main process so it can use
// node's global fetch directly without renderer/CORS concerns. Output is
// truncated to keep the model context manageable.
export function createWebFetchTool() {
  return tool({
    description: [
      'Fetch an HTTP(S) URL and return the response.',
      '',
      'USAGE:',
      '- Supports GET, POST, PUT, PATCH, DELETE, HEAD',
      '- Body is returned as text and truncated to keep context bounded',
      '- 30s timeout',
    ].join('\n'),
    inputSchema: z.object({
      url: z.string().url().describe('URL to fetch.'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'])
        .optional()
        .describe('HTTP method. Defaults to GET.'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Optional request headers as key-value pairs.'),
      body: z
        .string()
        .optional()
        .describe('Optional request body. Ignored for GET and HEAD requests.'),
    }),
    execute: async ({ url, method = 'GET', headers, body }) => {
      const init: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      };

      if (method !== 'GET' && method !== 'HEAD' && body) {
        init.body = body;
      }

      const response = await fetch(url, init);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody = '';

      try {
        responseBody = await response.text();
      } catch {
        responseBody = '[Could not read response body]';
      }

      const truncated = responseBody.length > MAX_BODY_CHARACTERS;

      if (truncated) {
        responseBody = responseBody.slice(0, MAX_BODY_CHARACTERS);
      }

      return {
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        truncated,
      };
    },
  });
}
