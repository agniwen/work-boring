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
  return (
    <div className='mx-auto w-full max-w-4xl px-4 pb-2'>
      <Card className='relative z-9999 bg-white p-0'>
        <PromptInput className='rounded-2xl' onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              className='pt-4'
              disabled={isSessionLoading}
              placeholder='Send a message...'
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div className='ml-auto'>
              {isStreaming ? (
                <PromptInputButton tooltip='Stop generating' onClick={onStop} variant='tertiary'>
                  <Square size={14} />
                </PromptInputButton>
              ) : (
                <PromptInputButton
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
