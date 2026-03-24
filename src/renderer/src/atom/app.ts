import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 480;
export const SIDEBAR_DEFAULT_WIDTH = 280;

export const sidebarWidthAtom = atomWithStorage('sidebarWidth', SIDEBAR_DEFAULT_WIDTH, undefined, {
  getOnInit: true,
});
export const sidebarOpenAtom = atomWithStorage('sidebarOpen', true, undefined, {
  getOnInit: true,
});
export const sidebarResizingAtom = atom(false);
