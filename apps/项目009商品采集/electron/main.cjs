/**
 * Electron 主进程（桌面原生壳）
 *
 * 设计要点：
 * 1. 不用 file:// 直接加载 dist —— file:// 下 origin 为 null，跨域请求（地图瓦片 / 地理编码 API）
 *    与 Service Worker 注册都会失效，导致地图与离线能力不可用。
 * 2. 改为内置一个本地静态服务器 serve dist，应用跑在 http://127.0.0.1:<随机端口>，
 *    与 Web 版行为完全一致（CORS / SW / localStorage / IndexedDB 均正常）。
 * 3. 开发模式可用 VITE_DEV_SERVER_URL 指向 vite dev server。
 */
const { app, BrowserWindow, Menu, shell, dialog } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const DIST = path.join(__dirname, '..', 'dist')
const DEV_URL = process.env.VITE_DEV_SERVER_URL || ''

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
}

/** 启动本地静态服务器（端口由系统分配，避免冲突） */
function serveDist() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
        let filePath = path.normalize(path.join(DIST, urlPath === '/' ? 'index.html' : urlPath))
        // 防目录穿越
        if (!filePath.startsWith(DIST)) {
          res.writeHead(403)
          res.end('Forbidden')
          return
        }
        // SPA 回退：未知路径一律返回 index.html
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(DIST, 'index.html')
        }
        if (!fs.existsSync(filePath)) {
          res.writeHead(404)
          res.end('Not Found')
          return
        }
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        })
        res.end(fs.readFileSync(filePath))
      } catch (err) {
        res.writeHead(500)
        res.end(String(err))
      }
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

async function createWindow() {
  let url = DEV_URL
  if (!url) {
    try {
      const { port } = await serveDist()
      url = `http://127.0.0.1:${port}/`
    } catch (err) {
      dialog.showErrorBox(
        '启动失败',
        '无法启动本地服务：' + (err && err.message ? err.message : String(err)),
      )
      app.quit()
      return
    }
  }

  const win = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 420,
    minHeight: 560,
    title: '配送定位与路径优化',
    backgroundColor: '#f3f5fa',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // 允许页面请求地图瓦片 / 地理编码等外部资源
      webSecurity: true,
    },
  })

  // 移除默认菜单栏，界面更干净
  Menu.setApplicationMenu(null)

  // 外部链接交给系统浏览器，不在应用内跳转
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:/.test(target)) shell.openExternal(target)
    return { action: 'deny' }
  })

  await win.loadURL(url)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
