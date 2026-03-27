import { Card } from '@heroui/react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@renderer/components/ai-elements/prompt-input';
import { SendHorizonal, Square } from 'lucide-react';
import { useRef } from 'react';

type ChatComposerProps = {
  isSessionLoading: boolean;
  isStreaming: boolean;
  onStop: () => void;
  onSubmit: (message: PromptInputMessage) => void;
};

export function ChatComposer({
  isSessionLoading,
  isStreaming,
  onStop,
  onSubmit,
}: ChatComposerProps) {
  const inputRef = useRef<React.ComponentRef<typeof PromptInputTextarea>>(null);

  function handleFocus() {
    inputRef.current?.focus();
  }

  return (
    <div className='mx-auto w-[720px] max-w-full px-4 pb-2 @min-[1020px]/chat-workspace:w-full @min-[1020px]/chat-workspace:max-w-[960px]'>
      <Card className='relative z-9999 bg-white p-0'>
        <PromptInput className='rounded-2xl' onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              className='pt-4'
              ref={inputRef}
              disabled={isSessionLoading}
              placeholder='Send a message...'
            />
          </PromptInputBody>
          <PromptInputFooter onClick={handleFocus}>
            <div className='ml-auto'>
              {isStreaming ? (
                <PromptInputButton
                  className='cursor-default'
                  tooltip='Stop generating'
                  onClick={onStop}
                  variant='tertiary'
                >
                  <Square size={14} />
                </PromptInputButton>
              ) : (
                <PromptInputButton
                  className='cursor-default'
                  disabled={isSessionLoading}
                  tooltip='Send message'
                  type='submit'
                  variant='default'
                >
                  <SendHorizonal size={14} />
                </PromptInputButton>
              )}
            </div>
          </PromptInputFooter>
        </PromptInput>
      </Card>
    </div>
  );
}
