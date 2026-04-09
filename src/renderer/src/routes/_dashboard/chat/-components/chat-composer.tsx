import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@renderer/components/ai-elements/prompt-input';
import { Card, CardContent } from '@renderer/components/ui/card';
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
    <div className='mx-auto w-full max-w-4xl px-1.5 pb-1'>
      <Card className='relative border border-border/60 bg-card p-0 shadow-none'>
        <CardContent className='p-0 ring-0!'>
          <PromptInput className='rounded-2xl border border-border/60' onSubmit={onSubmit}>
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
                    variant='ghost'
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
        </CardContent>
      </Card>
    </div>
  );
}
