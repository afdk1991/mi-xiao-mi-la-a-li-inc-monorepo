const { autoUpdater } = require('electron-updater')
const { BrowserWindow, ipcMain, app } = require('electron')
const path = require('path')
const fs = require('fs')

class UpdateService {
  constructor() {
    this.mainWindow = null
    this.isChecking = false
    this.downloading = false
    this.updateInfo = null
    this.checkInterval = null
    this.checkIntervalMs = 30 * 60 * 1000
    this.logger = this._createLogger()
  }

  _createLogger() {
    const logDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    const logFile = path.join(logDir, `updater-${this._getDateString()}.log`)
    return {
      info: (...args) => this._writeLog('INFO', args, logFile),
      error: (...args) => this._writeLog('ERROR', args, logFile),
      warn: (...args) => this._writeLog('WARN', args, logFile),
    }
  }

  _getDateString() {
    return new Date().toISOString().split('T')[0]
  }

  _writeLog(level, args, logFile) {
    const timestamp = new Date().toISOString()
    const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')
    const logLine = `[${timestamp}] [${level}] ${message}\n`
    fs.appendFileSync(logFile, logLine)
    console.log(logLine.trim())
  }

  init(mainWindow) {
    this.mainWindow = mainWindow
    this._configureAutoUpdater()
    this._setupEventHandlers()
    this._startAutoCheck()
    this.logger.info('UpdateService initialized')
  }

  _configureAutoUpdater() {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = this.logger

    autoUpdater.setFeedURL({
      provider: 'generic',
      url: process.env.UPDATE_SERVER_URL || 'https://your-update-server.com/releases',
    })
  }

  _setupEventHandlers() {
    autoUpdater.on('checking-for-update', () => {
      this.logger.info('Checking for updates...')
      this._sendToRenderer('update-checking')
    })

    autoUpdater.on('update-available', (info) => {
      this.updateInfo = info
      this.logger.info('Update available:', info.version)
      this._sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        size: info.files?.[0]?.size,
      })
    })

    autoUpdater.on('update-not-available', (info) => {
      this.logger.info('No update available, current version:', app.getVersion())
      this._sendToRenderer('update-not-available', {
        currentVersion: app.getVersion(),
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.logger.info(`Download progress: ${progress.percent.toFixed(2)}%`)
      this._sendToRenderer('update-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.downloading = false
      this.logger.info('Update downloaded:', info.version)
      this._sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
      })
    })

    autoUpdater.on('error', (err) => {
      this.logger.error('AutoUpdater error:', err.message)
      this.isChecking = false
      this.downloading = false
      this._sendToRenderer('update-error', {
        message: err.message,
        code: err.code,
      })
    })
  }

  _startAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    this.checkInterval = setInterval(() => {
      if (!this.isChecking && !this.downloading) {
        this.checkForUpdates()
      }
    }, this.checkIntervalMs)
    this.logger.info(`Auto check scheduled every ${this.checkIntervalMs / 60000} minutes`)
  }

  _stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  _sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
    const allWindows = BrowserWindow.getAllWindows()
    allWindows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    })
  }

  async checkForUpdates() {
    if (process.env.NODE_ENV === 'development') {
      this.logger.warn('Skipping update check in development mode')
      this._sendToRenderer('update-message', '开发环境不支持自动更新')
      return { success: false, message: '开发环境不支持自动更新' }
    }

    if (this.isChecking) {
      this.logger.warn('Update check already in progress')
      return { success: false, message: '正在检查更新中' }
    }

    if (this.downloading) {
      this.logger.warn('Update download in progress')
      return { success: false, message: '正在下载更新' }
    }

    try {
      this.isChecking = true
      this.logger.info('Starting update check')
      const result = await autoUpdater.checkForUpdates()
      this.isChecking = false
      return { success: true, result }
    } catch (err) {
      this.isChecking = false
      this.logger.error('Failed to check for updates:', err.message)
      this._sendToRenderer('update-error', { message: err.message })
      return { success: false, message: err.message }
    }
  }

  async downloadUpdate() {
    if (this.downloading) {
      this.logger.warn('Download already in progress')
      return { success: false, message: '正在下载更新' }
    }

    if (!this.updateInfo) {
      this.logger.warn('No update info available')
      return { success: false, message: '没有可用更新' }
    }

    try {
      this.downloading = true
      this.logger.info('Starting update download')
      this._sendToRenderer('update-downloading', { version: this.updateInfo.version })
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err) {
      this.downloading = false
      this.logger.error('Failed to download update:', err.message)
      this._sendToRenderer('update-error', { message: err.message })
      return { success: false, message: err.message }
    }
  }

  quitAndInstall() {
    this.logger.info('Quitting and installing update')
    autoUpdater.quitAndInstall(false, true)
  }

  cancelDownload() {
    if (this.downloading) {
      autoUpdater.cancelDownload()
      this.downloading = false
      this.logger.info('Download cancelled')
      return { success: true }
    }
    return { success: false, message: '没有正在进行的下载' }
  }

  getUpdateInfo() {
    return this.updateInfo
  }

  setCheckInterval(ms) {
    this.checkIntervalMs = ms
    this._startAutoCheck()
    this.logger.info(`Check interval updated to ${ms / 60000} minutes`)
  }

  dispose() {
    this._stopAutoCheck()
    this.logger.info('UpdateService disposed')
  }
}

let updateServiceInstance = null

function getUpdateService() {
  if (!updateServiceInstance) {
    updateServiceInstance = new UpdateService()
  }
  return updateServiceInstance
}

function setupUpdateIpcHandlers() {
  const service = getUpdateService()

  ipcMain.handle('updater:check', async () => {
    return service.checkForUpdates()
  })

  ipcMain.handle('updater:download', async () => {
    return service.downloadUpdate()
  })

  ipcMain.handle('updater:install', () => {
    service.quitAndInstall()
  })

  ipcMain.handle('updater:cancel', () => {
    return service.cancelDownload()
  })

  ipcMain.handle('updater:get-info', () => {
    return service.updateInfo
  })

  ipcMain.handle('updater:set-interval', (_, ms) => {
    service.setCheckInterval(ms)
    return { success: true }
  })

  return service
}

module.exports = {
  UpdateService,
  getUpdateService,
  setupUpdateIpcHandlers,
}
