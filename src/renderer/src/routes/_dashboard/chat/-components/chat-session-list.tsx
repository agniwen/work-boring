import {
  Modal,
  Button as HeroButton,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOverlayState,
} from '@heroui/react';
import { Link } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';

type ChatSessionListProps = {
  activeSessionId: string | null;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  sessions?: Array<{ id: string; title: string }>;
  sidebarPending: boolean;
};

export const ChatSessionList = memo(function ChatSessionList({
  activeSessionId,
  onCreateSession,
  onDeleteSession,
  sessions,
  sidebarPending,
}: ChatSessionListProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const deleteModalState = useOverlayState({
    onOpenChange: (isOpen) => {
      if (!isOpen && !deletingSessionId) {
        setDeleteError(null);
        setPendingDeleteSession(null);
      }
    },
  });

  const handleDeleteRequest = (session: { id: string; title: string }) => {
    setDeleteError(null);
    setPendingDeleteSession(session);
    deleteModalState.open();
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteSession) {
      return;
    }

    setDeleteError(null);
    setDeletingSessionId(pendingDeleteSession.id);

    try {
      await onDeleteSession(pendingDeleteSession.id);
      deleteModalState.close();
      setPendingDeleteSession(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete session.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const isDeletePending = deletingSessionId === pendingDeleteSession?.id;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-b border-border/70 px-3 pb-3'>
        <div className='flex items-center justify-between gap-2'>
          <div>
            <p className='text-sm font-medium'>Sessions</p>
            <p className='text-xs text-muted-foreground'>{sessions?.length || 0} saved chats</p>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <HeroButton
                aria-label='New session'
                className='size-8 min-w-8 cursor-default'
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
      <div className='h-[calc(100vh-246px)] w-full overflow-auto py-3'>
        <ul aria-label='Sessions' className='w-full p-1' key='session-list'>
          {sessions?.map((session) => (
            <li
              key={session.id}
              id={session.id}
              data-selected={activeSessionId === session.id}
              className={
                'w-full min-w-0 rounded-xl px-2 hover:bg-white hover:ring hover:ring-border/40 **:data-[slot=label]:text-foreground/40 data-[selected=true]:**:data-[slot=label]:text-foreground'
              }
            >
              <div className='group flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden'>
                <Link
                  className='min-w-0 flex-1 cursor-default rounded-xl py-1 outline-none'
                  params={{ sessionId: session.id }}
                  to='/chat/{-$sessionId}'
                >
                  <Tooltip>
                    <TooltipTrigger className='truncate'>
                      <Label className='line block w-full truncate overflow-hidden text-sm font-normal whitespace-nowrap'>
                        {session.title}
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent placement='top start'>
                      <p className='max-w-80 wrap-break-word'>{session.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </Link>
                <button
                  aria-label={`Delete ${session.title}`}
                  className='shrink-0 opacity-0 group-hover:opacity-40 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20'
                  disabled={deletingSessionId === session.id}
                  onClick={() => {
                    handleDeleteRequest(session);
                  }}
                >
                  <Trash2 className='size-3.5' />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {sidebarPending ? (
          <div className='rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground'>
            Loading sessions...
          </div>
        ) : null}
      </div>
      <Modal.Root state={deleteModalState}>
        <Modal.Trigger className='hidden'>
          <span aria-hidden='true' />
        </Modal.Trigger>
        <Modal.Backdrop isDismissable={!isDeletePending}>
          <Modal.Container placement='center' size='sm'>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>确认删除会话？</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className='space-y-3 text-sm text-muted-foreground'>
                  <p>
                    这会永久删除
                    <span className='mx-1 font-medium text-foreground'>
                      {pendingDeleteSession?.title ?? '该会话'}
                    </span>
                    以及该会话下的所有消息。
                  </p>
                  {deleteError ? <p className='text-destructive'>{deleteError}</p> : null}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <HeroButton
                  className='cursor-default'
                  isDisabled={isDeletePending}
                  onPress={() => deleteModalState.close()}
                  variant='tertiary'
                >
                  取消
                </HeroButton>
                <HeroButton
                  className='cursor-default'
                  isDisabled={!pendingDeleteSession || isDeletePending}
                  onPress={() => void handleDeleteConfirm()}
                  variant='danger'
                >
                  {isDeletePending ? '删除中...' : '确认删除'}
                </HeroButton>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
});
