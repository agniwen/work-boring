import { Button } from '@renderer/components/ui/button';

// Ported from open-agents: stylized Approve/Deny row used under a ToolLayout
// header whenever a tool call is awaiting approval. Stops click propagation
// externally so parents can make the header clickable without double-firing.
export type ApprovalButtonsProps = {
  approvalId: string;
  onApprove?: (id: string) => void;
  onDeny?: (id: string, reason?: string) => void;
};

export function ApprovalButtons({ approvalId, onApprove, onDeny }: ApprovalButtonsProps) {
  return (
    <div className='mt-3 flex items-center gap-2 pl-5'>
      <Button
        className='h-7 border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
        onClick={() => onApprove?.(approvalId)}
        size='sm'
        type='button'
        variant='outline'
      >
        Approve
      </Button>
      <Button
        className='h-7 border-red-600 text-red-600 hover:bg-red-600 hover:text-white'
        onClick={() => onDeny?.(approvalId)}
        size='sm'
        type='button'
        variant='outline'
      >
        Deny
      </Button>
    </div>
  );
}
