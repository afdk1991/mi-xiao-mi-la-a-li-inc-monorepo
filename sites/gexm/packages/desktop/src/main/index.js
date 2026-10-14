const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  globalShortcut,
  shell,
  nativeTheme,
} = require('electron')
const path = require('path')
const Store = require('electron-store')
const { autoUpdater } = require('electron-updater')
const { setupUpdateIpcHandlers, getUpdateService } = require('./updater')
const { setupVersionIpcHandlers, getVersionManager } = require('./version')

const store = new Store()

let mainWindow = null
let tray = null
let updateService = null
const windows = new Map()

const isDev = process.env.NODE_ENV === 'development'

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: store.get('window.width', 1280),
    height: store.get('window.height', 800),
    minWidth: 960,
    minHeight: 640,
    x: store.get('window.x'),
    y: store.get('window.y'),
    title: 'Gexm',
    icon: path.join(__dirname, '../../assets/icon.png'),
    backgroundColor: '#f5f7fa',
    show: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
    },
  })

  windows.set('main', mainWindow)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(process.resourcesPath, 'app/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('resize', () => {
    const bounds = mainWindow.getBounds()
    store.set('window.width', bounds.width)
    store.set('window.height', bounds.height)
  })

  mainWindow.on('move', () => {
    const bounds = mainWindow.getBounds()
    store.set('window.x', bounds.x)
    store.set('window.y', bounds.y)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return mainWindow
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, '../../assets/tray.png')
    tray = new Tray(iconPath)
  } catch (err) {
    console.warn('Failed to create tray icon:', err.message)
    return
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        showWindow('main')
      },
    },
    {
      label: '新建窗口',
      click: () => {
        createNewWindow()
      },
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => {
        showWindow('main')
        mainWindow.webContents.send('navigate', '/pages/settings/settings')
      },
    },
    { type: 'separator' },
    {
      label: '检查更新',
      click: () => {
        checkForUpdates()
      },
    },
    {
      label: '关于',
      click: () => {
        showAboutDialog()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('Gexm 全平台应用')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  tray.on('double-click', () => {
    showWindow('main')
  })
}

function createNewWindow() {
  const id = `window_${Date.now()}`

  const newWindow = new BrowserWindow({
    width: 1024,
    height: 680,
    title: 'Gexm - 新窗口',
    icon: path.join(__dirname, '../../assets/icon.png'),
    backgroundColor: '#f5f7fa',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  windows.set(id, newWindow)

  if (isDev) {
    newWindow.loadURL('http://localhost:5173')
  } else {
    newWindow.loadFile(path.join(process.resourcesPath, 'app/index.html'))
  }

  newWindow.on('closed', () => {
    windows.delete(id)
  })

  return id
}

function showWindow(windowId) {
  const win = windows.get(windowId)
  if (win) {
    if (win.isMinimized()) {
      win.restore()
    }
    win.show()
    win.focus()
  }
}

function setupGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    createNewWindow()
  })

  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
    }
  })

  globalShortcut.register('CommandOrControl+K', () => {
    showWindow('main')
    mainWindow.webContents.send('toggle-search')
  })
}

function setupIpcHandlers() {
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
    return win.isMaximized()
  })

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win.close()
  })

  ipcMain.handle('window:new', () => {
    return createNewWindow()
  })

  ipcMain.handle('app:store:get', (_, key) => {
    return store.get(key)
  })

  ipcMain.handle('app:store:set', (_, key, value) => {
    store.set(key, value)
    return true
  })

  ipcMain.handle('app:store:delete', (_, key) => {
    store.delete(key)
    return true
  })

  ipcMain.handle('app:version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:platform', () => {
    return process.platform
  })

  ipcMain.handle('app:theme', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  })

  ipcMain.handle('app:open-external', (_, url) => {
    shell.openExternal(url)
  })

  ipcMain.handle('file:save', async (_, content, defaultPath) => {
    const { dialog } = require('electron')
    const result = await dialog.showSaveDialog({
      defaultPath,
    })
    if (!result.canceled && result.filePath) {
      const fs = require('fs')
      fs.writeFileSync(result.filePath, content)
      return result.filePath
    }
    return null
  })
}

function checkForUpdates() {
  if (updateService) {
    updateService.checkForUpdates()
  } else {
    if (isDev) {
      mainWindow.webContents.send('update-message', '更新服务未初始化')
    }
  }
}

function showAboutDialog() {
  const { dialog } = require('electron')
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '关于 Gexm',
    message: 'Gexm 全平台应用系统',
    detail: `版本: ${app.getVersion()}\n平台: ${process.platform}\n架构: ${process.arch}\n\n一套代码，多端运行`,
    buttons: ['确定'],
  })
}

function createMenu() {
  const isMac = process.platform === 'darwin'

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: '文件',
      submenu: [
        {
          label: '新建窗口',
          accelerator: 'CmdOrCtrl+N',
          click: () => createNewWindow(),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '检查更新',
          click: () => checkForUpdates(),
        },
        {
          label: '关于',
          click: () => showAboutDialog(),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  createMainWindow()
  createTray()
  createMenu()
  setupIpcHandlers()
  setupGlobalShortcuts()

  updateService = setupUpdateIpcHandlers()
  setupVersionIpcHandlers()

  updateService.init(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 不退出，保留在系统托盘
  }
})

app.on('before-quit', () => {
  app.isQuiting = true
  if (updateService) {
    updateService.dispose()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

nativeTheme.on('updated', () => {
  if (mainWindow) {
    mainWindow.webContents.send('theme-change', nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  }
})

module.exports = {
  createMainWindow,
  createNewWindow,
  showWindow,
  mainWindow,
  updateService,
}
