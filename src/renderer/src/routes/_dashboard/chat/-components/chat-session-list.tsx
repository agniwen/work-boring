import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@renderer/components/ui/sidebar';
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDeleteRequest = (session: { id: string; title: string }) => {
    setDeleteError(null);
    setPendingDeleteSession(session);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteSession) {
      return;
    }

    setDeleteError(null);
    setDeletingSessionId(pendingDeleteSession.id);

    try {
      await onDeleteSession(pendingDeleteSession.id);
      setDeleteModalOpen(false);
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
      <SidebarGroup className='p-0'>
        <SidebarGroupLabel className='px-3'>
          Sessions
          <span className='ml-1 text-sidebar-foreground/40'>
            {sessions?.length || 0}
          </span>
        </SidebarGroupLabel>
        <Button
          aria-label='New session'
          title='New session'
          onClick={onCreateSession}
          size='icon-sm'
          variant='ghost'
          className='absolute top-1/2 right-2 -translate-y-1/2 cursor-default'
        >
          <Plus />
        </Button>
      </SidebarGroup>

      <div className='min-h-0 flex-1 overflow-auto px-2 py-0.5'>
        <SidebarMenu>
          {sessions?.map((session) => (
            <SidebarMenuItem key={session.id}>
              <SidebarMenuButton
                asChild
                isActive={activeSessionId === session.id}
                size='sm'
                className='cursor-default'
              >
                <Link
                  params={{ sessionId: session.id }}
                  to='/chat/{-$sessionId}'
                >
                  <span className='truncate'>{session.title}</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuAction
                showOnHover
                className='cursor-default'
                disabled={deletingSessionId === session.id}
                onClick={() => handleDeleteRequest(session)}
                title={`Delete ${session.title}`}
              >
                <Trash2 />
                <span className='sr-only'>Delete</span>
              </SidebarMenuAction>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        {sidebarPending ? (
          <div className='rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground'>
            Loading sessions...
          </div>
        ) : null}
      </div>

      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => {
          if (!open && !isDeletePending) {
            setDeleteModalOpen(false);
            setDeleteError(null);
            setPendingDeleteSession(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>确认删除会话？</DialogTitle>
            <DialogDescription>
              这会永久删除
              <span className='mx-1 font-medium text-foreground'>
                {pendingDeleteSession?.title ?? '该会话'}
              </span>
              以及该会话下的所有消息。
            </DialogDescription>
            {deleteError ? <p className='text-sm text-destructive'>{deleteError}</p> : null}
          </DialogHeader>
          <DialogFooter>
            <Button
              className='cursor-default'
              disabled={isDeletePending}
              onClick={() => setDeleteModalOpen(false)}
              variant='outline'
            >
              取消
            </Button>
            <Button
              className='cursor-default'
              disabled={!pendingDeleteSession || isDeletePending}
              onClick={() => void handleDeleteConfirm()}
              variant='destructive'
            >
              {isDeletePending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
