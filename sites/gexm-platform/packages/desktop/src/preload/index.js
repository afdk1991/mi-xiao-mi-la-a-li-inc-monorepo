const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('gexmDesktop', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    new: () => ipcRenderer.invoke('window:new'),
  },

  app: {
    store: {
      get: (key) => ipcRenderer.invoke('app:store:get', key),
      set: (key, value) => ipcRenderer.invoke('app:store:set', key, value),
      delete: (key) => ipcRenderer.invoke('app:store:delete', key),
    },
    version: () => ipcRenderer.invoke('app:version'),
    platform: () => ipcRenderer.invoke('app:platform'),
    theme: () => ipcRenderer.invoke('app:theme'),
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  },

  file: {
    save: (content, defaultPath) => ipcRenderer.invoke('file:save', content, defaultPath),
  },

  on: (channel, callback) => {
    const validChannels = [
      'theme-change',
      'update-available',
      'update-not-available',
      'update-progress',
      'update-downloaded',
      'update-error',
      'update-message',
      'update-downloading',
      'update-checking',
      'navigate',
      'toggle-search',
    ]

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args))
    }
  },

  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  },

  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    cancel: () => ipcRenderer.invoke('updater:cancel'),
    getInfo: () => ipcRenderer.invoke('updater:get-info'),
    setInterval: (ms) => ipcRenderer.invoke('updater:set-interval', ms),
  },

  version: {
    getCurrent: () => ipcRenderer.invoke('version:current'),
    getInfo: () => ipcRenderer.invoke('version:info'),
    getHistory: () => ipcRenderer.invoke('version:history'),
    getRollbackPoints: () => ipcRenderer.invoke('version:rollback-points'),
    rollback: (version) => ipcRenderer.invoke('version:rollback', version),
  },
})
