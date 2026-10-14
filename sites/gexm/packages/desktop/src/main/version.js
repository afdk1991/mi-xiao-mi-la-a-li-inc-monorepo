const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

class VersionManager {
  constructor() {
    this.store = new Store({ name: 'version-history' })
    this.currentVersion = app.getVersion()
    this.updateHistoryKey = 'updateHistory'
  }

  getCurrentVersion() {
    return this.currentVersion
  }

  getVersionInfo() {
    return {
      current: this.currentVersion,
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      v8: process.versions.v8,
    }
  }

  parseVersion(versionStr) {
    const parts = versionStr.split('.')
    return {
      major: parseInt(parts[0], 10) || 0,
      minor: parseInt(parts[1], 10) || 0,
      patch: parseInt(parts[2], 10) || 0,
      prerelease: parts[3] || null,
    }
  }

  compareVersions(v1, v2) {
    const a = this.parseVersion(v1)
    const b = this.parseVersion(v2)

    if (a.major !== b.major) return a.major - b.major
    if (a.minor !== b.minor) return a.minor - b.minor
    if (a.patch !== b.patch) return a.patch - b.patch
    if (a.prerelease && !b.prerelease) return -1
    if (!a.prerelease && b.prerelease) return 1
    if (a.prerelease && b.prerelease) return a.prerelease.localeCompare(b.prerelease)
    return 0
  }

  getUpdateHistory() {
    return this.store.get(this.updateHistoryKey, [])
  }

  addToHistory(updateInfo) {
    const history = this.getUpdateHistory()
    const entry = {
      fromVersion: this.currentVersion,
      toVersion: updateInfo.version,
      timestamp: new Date().toISOString(),
      success: true,
      releaseNotes: updateInfo.releaseNotes || null,
    }
    history.unshift(entry)
    if (history.length > 50) {
      history.pop()
    }
    this.store.set(this.updateHistoryKey, history)
    return entry
  }

  getLastUpdate() {
    const history = this.getUpdateHistory()
    return history.length > 0 ? history[0] : null
  }

  saveRollbackPoint(version, files) {
    const rollbackKey = `rollback_${version}`
    this.store.set(rollbackKey, {
      version,
      timestamp: new Date().toISOString(),
      files: files || [],
    })
  }

  getRollbackPoint(version) {
    const rollbackKey = `rollback_${version}`
    return this.store.get(rollbackKey)
  }

  removeRollbackPoint(version) {
    const rollbackKey = `rollback_${version}`
    this.store.delete(rollbackKey)
  }

  listRollbackPoints() {
    const history = this.getUpdateHistory()
    return history.map((h) => ({
      version: h.toVersion,
      timestamp: h.timestamp,
      success: h.success,
    }))
  }

  async fetchReleaseNotes(version) {
    try {
      const releaseUrl = `${process.env.UPDATE_SERVER_URL || 'https://your-update-server.com'}/releases/${version}/notes.json`
      const response = await fetch(releaseUrl)
      if (response.ok) {
        const notes = await response.json()
        return { success: true, notes }
      }
      return { success: false, message: '无法获取更新日志' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  saveUpdateLog(logData) {
    const logDir = path.join(app.getPath('userData'), 'update-logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    const logFile = path.join(logDir, `update-${this._getDateString()}.json`)
    const existingLogs = this._readJsonFile(logFile, [])
    existingLogs.push({
      ...logData,
      timestamp: new Date().toISOString(),
    })
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2))
  }

  getUpdateLogs(limit = 10) {
    const logDir = path.join(app.getPath('userData'), 'update-logs')
    if (!fs.existsSync(logDir)) {
      return []
    }
    const files = fs
      .readdirSync(logDir)
      .filter((f) => f.startsWith('update-') && f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit)

    const logs = []
    for (const file of files) {
      const filePath = path.join(logDir, file)
      const content = this._readJsonFile(filePath, [])
      logs.push(...content)
    }
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit)
  }

  _getDateString() {
    return new Date().toISOString().split('T')[0]
  }

  _readJsonFile(filePath, defaultValue = null) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      }
    } catch (err) {
      console.error('Failed to read JSON file:', filePath, err)
    }
    return defaultValue
  }

  isVersionNewer(newVersion, currentVersion) {
    return this.compareVersions(newVersion, currentVersion) > 0
  }

  shouldUpdate(targetVersion, currentVersion) {
    return this.isVersionNewer(targetVersion, currentVersion)
  }
}

function setupVersionIpcHandlers() {
  const { ipcMain } = require('electron')

  ipcMain.handle('version:current', () => {
    return versionManagerInstance.getCurrentVersion()
  })

  ipcMain.handle('version:info', () => {
    return versionManagerInstance.getVersionInfo()
  })

  ipcMain.handle('version:history', () => {
    return versionManagerInstance.getUpdateHistory()
  })

  ipcMain.handle('version:rollback-points', () => {
    return versionManagerInstance.listRollbackPoints()
  })

  ipcMain.handle('version:rollback', (_, version) => {
    const rollbackPoint = versionManagerInstance.getRollbackPoint(version)
    if (rollbackPoint) {
      return { success: true, rollbackPoint }
    }
    return { success: false, message: '未找到该版本的回滚点' }
  })

  ipcMain.handle('version:fetch-notes', async (_, version) => {
    return versionManagerInstance.fetchReleaseNotes(version)
  })

  ipcMain.handle('version:logs', (_, limit) => {
    return versionManagerInstance.getUpdateLogs(limit)
  })

  return versionManagerInstance
}

let versionManagerInstance = null

function getVersionManager() {
  if (!versionManagerInstance) {
    versionManagerInstance = new VersionManager()
  }
  return versionManagerInstance
}

module.exports = {
  VersionManager,
  getVersionManager,
  setupVersionIpcHandlers,
}
