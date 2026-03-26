import {
  Button as HeroButton,
  Label,
  ListBox,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import { memo } from 'react';

type ChatSessionListProps = {
  activeSessionId: string | null;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onSelectSession: (sessionId: string) => void;
  sessions?: Array<{ id: string; title: string }>;
  sidebarPending: boolean;
};

export const ChatSessionList = memo(function ChatSessionList({
  activeSessionId,
  onCreateSession,
  onDeleteSession,
  onSelectSession,
  sessions,
  sidebarPending,
}: ChatSessionListProps) {
  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-b border-border/70 px-3 py-3'>
        <div className='flex items-center justify-between gap-2'>
          <div>
            <p className='text-sm font-medium'>Sessions</p>
            <p className='text-xs text-muted-foreground'>{sessions?.length || 0} saved chats</p>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <HeroButton
                aria-label='New session'
                className='size-8 min-w-8'
                isIconOnly
                onPress={onCreateSession}
                size='sm'
                variant='ghost'
              >
                <Plus className='size-4' />
              </HeroButton>
            </TooltipTrigger>
            <TooltipContent>New session</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className='w-full py-3'>
        <ListBox
          aria-label='Sessions'
          className='w-full'
          selectedKeys={activeSessionId ? [activeSessionId] : []}
          selectionMode='single'
        >
          {sessions?.map((session) => (
            <ListBox.Item
              key={session.id}
              id={session.id}
              textValue={session.title}
              className='w-full min-w-0 cursor-default py-0 hover:bg-white/40 **:data-[slot=label]:text-foreground/60 data-[selected=true]:**:data-[slot=label]:text-foreground'
              onPress={() => onSelectSession(session.id)}
            >
              <div className='flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden'>
                <div className='line-clamp-1 min-w-0 flex-1 overflow-hidden'>
                  <Label className='line block max-w-full truncate overflow-hidden text-sm font-medium whitespace-nowrap'>
                    {session.title}
                  </Label>
                </div>
                <button
                  className='shrink-0 opacity-20 hover:opacity-100'
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteSession(session.id);
                  }}
                >
                  <Trash2 className='size-3.5' />
                </button>
              </div>
            </ListBox.Item>
          ))}
        </ListBox>
        {sidebarPending ? (
          <div className='rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground'>
            Loading sessions...
          </div>
        ) : null}
      </div>
    </div>
  );
});
