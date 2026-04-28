import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const sidebarWidthAtom = atomWithStorage('sidebarWidth', 280, undefined, {
  getOnInit: true,
});
export const sidebarOpenAtom = atomWithStorage('sidebarOpen', true, undefined, {
  getOnInit: true,
});

export const terminalOpenAtom = atom(false);
export const terminalHeightAtom = atomWithStorage('terminalHeight', 320, undefined, {
  getOnInit: true,
});
