// Shared tool-render-state abstraction ported from open-agents. Converts a raw
// ai-sdk ToolUIPart into a uniform shape every renderer can consume, so each
// tool renderer only cares about input/output — not the AI SDK state machine.

export type ToolRenderState = {
  /** Tool is currently running (input flushed, waiting on execute). */
  running: boolean;
  /** Tool was running when the stream closed (no output will arrive). */
  interrupted: boolean;
  /** Error message when execution failed. */
  error?: string;
  /** User denied the approval. */
  denied: boolean;
  /** Optional reason the user gave when denying. */
  denialReason?: string;
  /** Approval is being requested right now. */
  approvalRequested: boolean;
  /** Approval id, if approvalRequested. */
  approvalId?: string;
};

export type GenericToolPart = {
  state: string;
  approval?: {
    id?: string;
    approved?: boolean;
    reason?: string;
  };
  errorText?: string;
  input?: unknown;
  output?: unknown;
};

// Derive the unified render state from a tool part + surrounding stream state.
// Mirrors open-agents' extractRenderState but drops the activeApprovalId branch
// (codez does not track a single focused approval yet).
export function extractRenderState(part: GenericToolPart, isStreaming: boolean): ToolRenderState {
  const isRunningState = part.state === 'input-streaming' || part.state === 'input-available';
  const approval = part.approval;
  const denied = part.state === 'output-denied' || approval?.approved === false;
  const denialReason = denied ? approval?.reason : undefined;
  const approvalRequested = part.state === 'approval-requested' && !denied;
  const error = part.state === 'output-error' ? part.errorText : undefined;
  const approvalId = approvalRequested ? approval?.id : undefined;

  const interrupted = isRunningState && !isStreaming;
  const running = isRunningState && isStreaming;

  return {
    running,
    interrupted,
    error,
    denied,
    denialReason,
    approvalRequested,
    approvalId,
  };
}

// Convert absolute file path to workspace-relative for display.
export function toRelativePath(filePath: string, cwd: string) {
  if (!cwd) return filePath;
  const prefix = cwd.endsWith('/') ? cwd : cwd + '/';
  if (filePath.startsWith(prefix)) return filePath.slice(prefix.length);
  if (filePath === cwd) return '.';
  return filePath;
}
