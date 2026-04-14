import type { ComponentType } from 'react';

import { BashRenderer } from './bash-renderer';
import { EditRenderer } from './edit-renderer';
import { GlobRenderer } from './glob-renderer';
import { GrepRenderer } from './grep-renderer';
import { ReadRenderer } from './read-renderer';
import type { ToolRendererProps } from './types';
import { WebFetchRenderer } from './web-fetch-renderer';
import { WriteRenderer } from './write-renderer';

// Dispatch table from tool UI part type to renderer component. Keys match the
// `tool-<name>` keys emitted by AI SDK for every tool registered in
// createWorkspaceTools. Tools not in this map fall back to a generic renderer.
export const TOOL_RENDERERS: Record<string, ComponentType<ToolRendererProps>> = {
  'tool-bash': BashRenderer,
  'tool-edit': EditRenderer,
  'tool-glob': GlobRenderer,
  'tool-grep': GrepRenderer,
  'tool-read': ReadRenderer,
  'tool-webFetch': WebFetchRenderer,
  'tool-write': WriteRenderer,
};

export type { ToolRendererProps } from './types';
