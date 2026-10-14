/** Electron 预加载脚本：仅向渲染进程暴露只读的运行环境信息（不开启 node 集成） */
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
  /** 是否为桌面原生壳（Web 版为 undefined，可用于差异化逻辑） */
  isDesktop: true,
})
