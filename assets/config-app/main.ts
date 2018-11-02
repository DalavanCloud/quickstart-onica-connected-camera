import { app, BrowserWindow, screen, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as url from 'url';

let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

import { DiscoveryService } from './discoveryService';
import { ProvisioningService } from './provisioningService';
let discoveryService, provisioningService;

function createWindow() {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    width: 900,
    height: 900
  });

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  //win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

}

//copy/paste support on mac requires menu
function createMenu() {

  const template = []
  if (process.platform == 'darwin') {
    template.push({
      label: app.getName(),
      submenu: [
        // { role: 'about' },
        // { type: 'separator' },
        // { role: 'services', submenu: [] },
        // { type: 'separator' },
        // { role: 'hide' },
        // { role: 'hideothers' },
        // { role: 'unhide' },
        // { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }
  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteandmatchstyle' },
      { role: 'delete' },
      { role: 'selectall' }
    ]
  })

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

try {

  discoveryService = new DiscoveryService();
  discoveryService.registerMainProcessIPC();
  provisioningService = new ProvisioningService();
  provisioningService.registerMainProcessIPC();

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', () => {
    createWindow();
    createMenu();
  });

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  console.log("Error starting electron.")
  console.log(e)
  // Catch Error
  // throw e;
}
