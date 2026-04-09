import { atomWithStorage } from 'jotai/utils';

export const sidebarWidthAtom = atomWithStorage('sidebarWidth', 280, undefined, {
  getOnInit: true,
});
export const sidebarOpenAtom = atomWithStorage('sidebarOpen', true, undefined, {
  getOnInit: true,
});
