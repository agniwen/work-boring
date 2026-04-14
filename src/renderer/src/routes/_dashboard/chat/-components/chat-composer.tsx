import { ArrowUpIcon, StopIcon } from '@phosphor-icons/react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@renderer/components/ai-elements/prompt-input';
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
    <div className='mx-auto w-full max-w-4xl px-1.5 pb-1'>
      <PromptInput className='rounded-3xl' onSubmit={onSubmit}>
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
                className='cursor-default rounded-full'
                tooltip='Stop generating'
                onClick={onStop}
                variant='ghost'
              >
                <StopIcon size={14} />
              </PromptInputButton>
            ) : (
              <PromptInputButton
                className='cursor-default rounded-full'
                disabled={isSessionLoading}
                tooltip='Send message'
                type='submit'
                variant='default'
              >
                <ArrowUpIcon size={14} />
              </PromptInputButton>
            )}
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
