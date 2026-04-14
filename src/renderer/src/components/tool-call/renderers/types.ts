import type { DynamicToolUIPart, ToolUIPart } from 'ai';

import type { ToolRenderState } from '../tool-state';

// Shared contract for every tool-specific renderer. `part` is the raw ai-sdk
// tool part (static or dynamic); `state` is the derived render state.
// Renderers pick input/output off `part` based on their tool's schema.
export interface ToolRendererProps {
  part: ToolUIPart | DynamicToolUIPart;
  state: ToolRenderState;
  onApprove?: (id: string) => void;
  onDeny?: (id: string, reason?: string) => void;
}
