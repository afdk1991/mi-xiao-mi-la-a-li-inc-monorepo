// PWA 安装引导：捕获 beforeinstallprompt，支持一键「安装应用」。
// 说明：anonymous 预览链接带 token 时浏览器可能不触发该事件；绑定自定义域名后可用。

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
let installed = false

/** 已在独立窗口/已安装时返回 true */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** 初始化监听；available 回调在「可安装/不可安装」变化时触发 */
export function initInstallPrompt(available: (can: boolean) => void): void {
  installed = isStandalone()
  // 只有浏览器真的抛出了 beforeinstallprompt 才可安装。
  // 早前这里直接 available(!installed)，导致桌面 Firefox 等不支持的环境常驻显示
  // 「安装应用」按钮，点了却毫无反应（promptInstall 返回 unavailable 被丢弃）。
  available(false)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    installed = false
    available(true)
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    available(false)
  })
}

/** 弹出安装提示；返回结果供 UI 提示 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable'
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  if (outcome === 'accepted') {
    deferred = null
    installed = true
  }
  return outcome
}

/** 是否已安装（独立模式或刚完成安装） */
export function isInstalled(): boolean {
  return installed || isStandalone()
}
