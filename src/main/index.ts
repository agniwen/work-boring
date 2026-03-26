import { join } from 'path';

import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { RPCHandler } from '@orpc/server/message-port';
import { app, shell, BrowserWindow, ipcMain } from 'electron';

import icon from '../../resources/icon.png?asset';
import { ORPC_SERVER_CHANNEL } from '../orpc/channel';
import { getDatabaseInfo } from './db/client';
import { runMigrations } from './db/migrate';
import { createAppRouter } from './orpc/router';

let orpcHandler: RPCHandler<any> | null = null;

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset', // 隐藏标题栏但保留 macOS 红绿灯按钮
    trafficLightPosition: { x: 16, y: 16 }, // 调整红绿灯位置
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Enable transparent visuals for the app
app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-gpu-vsync');

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  app.setName('Boring Work');
  electronApp.setAppUserModelId('com.boringwork.app');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));
  ipcMain.on(ORPC_SERVER_CHANNEL, (event) => {
    if (!orpcHandler) {
      console.error('oRPC server is not ready yet.');
      return;
    }

    const [serverPort] = event.ports;

    if (!serverPort) {
      return;
    }

    orpcHandler.upgrade(serverPort, { context: appRouter as any });
    serverPort.start();
  });

  runMigrations();

  const appRouter = createAppRouter({
    getSystemInfo: () => ({
      appName: app.getName(),
      appVersion: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      versions: {
        chrome: process.versions.chrome,
        electron: process.versions.electron,
        node: process.versions.node,
      },
      ...getDatabaseInfo(),
    }),
  });

  orpcHandler = new RPCHandler(appRouter);

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
