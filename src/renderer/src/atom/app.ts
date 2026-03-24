import { atomWithStorage } from "jotai/utils"


export const SIDEBAR_MIN_WIDTH = 240; // 最小宽度（像素）
export const SIDEBAR_MAX_WIDTH = 480; // 最大宽度（像素）
export const SIDEBAR_DEFAULT_WIDTH = 280; // 默认宽度（像素）

export const sidebarWidthAtom = atomWithStorage('sidebarWidth',SIDEBAR_DEFAULT_WIDTH)


export const sidebarOpenAtom = atomWithStorage("sidebarOpen",JSON.parse(localStorage.getItem('sidebarOpen') as string)||true)
