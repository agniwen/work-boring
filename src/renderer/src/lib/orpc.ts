import { createORPCClient, eventIteratorToUnproxiedDataStream, onError } from '@orpc/client';
import { RPCLink } from '@orpc/client/message-port';
import type { RouterClient } from '@orpc/server';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

import type { AppRouter } from '../../../orpc/app-router';
import { ORPC_CLIENT_BOOTSTRAP_EVENT } from '../../../orpc/channel';

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function createORPCBindings() {
  const { port1: clientPort, port2: serverPort } = new MessageChannel();

  window.postMessage(ORPC_CLIENT_BOOTSTRAP_EVENT, '*', [serverPort]);

  const link = new RPCLink({
    port: clientPort,
    interceptors: [
      onError((error) => {
        if (isAbortError(error)) {
          return;
        }

        console.error('oRPC renderer error', error);
      }),
    ],
  });

  clientPort.start();

  const client: RouterClient<AppRouter> = createORPCClient(link);

  return {
    client,
    orpc: createTanstackQueryUtils(client),
  };
}

const globalORPC = globalThis as typeof globalThis & {
  __boringWorkORPC?: ReturnType<typeof createORPCBindings>;
};

const bindings = globalORPC.__boringWorkORPC ?? createORPCBindings();

globalORPC.__boringWorkORPC = bindings;

export const orpcClient = bindings.client;
export const orpc = bindings.orpc;

export const orpcChatTransport = {
  async sendMessages(options: {
    abortSignal: AbortSignal | undefined;
    chatId: string;
    messages: Parameters<typeof orpcClient.chat.stream>[0]['messages'];
  }) {
    const iterator = await orpcClient.chat.stream(
      {
        chatId: options.chatId,
        messages: options.messages,
      },
      {
        signal: options.abortSignal,
      },
    );

    return eventIteratorToUnproxiedDataStream(iterator);
  },
  async reconnectToStream() {
    throw new Error('Reconnecting to chat streams is not implemented.');
  },
};
