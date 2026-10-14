// 导航语音播报（Web Speech API）。
//
// 三家地图都不提供 Web 端语音导航能力，播报只能由浏览器 SpeechSynthesis 完成。
// 这里做了三件必要的事，否则实际体验会很糟：
//   1. 选中文发音人 —— 不指定 lang 时英文引擎会把中文念成字母；
//   2. 插队播报 —— 导航提示必须打断上一句，否则转弯提示会被积压在队列里晚点才出声；
//   3. 去重与最小间隔 —— 防止同一步骤在阈值附近抖动导致反复播报。

let lastText = ''
let lastTime = 0

function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  return (
    voices.find((v) => /zh[-_]CN/i.test(v.lang)) ??
    voices.find((v) => /^zh/i.test(v.lang)) ??
    null
  )
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * 播报一条导航提示。
 * @param interrupt 为 true 时取消当前正在播的内容（导航提示应当插队）
 */
export function speak(text: string, interrupt = true): void {
  if (!speechSupported() || !text) return

  // 同一句话 1.5 秒内不重复播
  const now = Date.now()
  if (text === lastText && now - lastTime < 1500) return
  lastText = text
  lastTime = now

  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  const v = pickChineseVoice()
  if (v) u.voice = v
  u.rate = 1.05
  u.pitch = 1
  if (interrupt) window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel()
}

/** 中文语音列表是异步加载的，首次访问时为空；先触发一次即可 */
export function primeVoices(): void {
  if (!speechSupported()) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
}
