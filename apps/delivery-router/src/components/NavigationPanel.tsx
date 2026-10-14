// 实时导航 HUD。
//
// 与「跳转到高德/百度/腾讯 App」的方案不同：这里显示的每一步引导都来自
// 本项目自己导航引擎的计算结果（GPS 匹配 → 当前步 → 距转弯点距离 → 播报），
// 三家地图只作为算路数据源。整个导航过程不会离开本应用。

import { useStore } from '../store'
import { formatDistance, formatDuration } from '../geo'
import { speechSupported } from '../speech'

/** 由引导文案推断转向图标（各家文案措辞不同，统一用关键字匹配） */
function turnIcon(text: string): string {
  if (!text) return '↑'
  if (/到达|终点|目的地/.test(text)) return '🏁'
  if (/掉头|调头/.test(text)) return '⟲'
  if (/向左|左转|左前方|靠左/.test(text)) return '↰'
  if (/向右|右转|右前方|靠右/.test(text)) return '↱'
  if (/直行|继续|沿/.test(text)) return '↑'
  if (/环岛/.test(text)) return '↻'
  if (/减速|注意/.test(text)) return '⚠'
  return '↑'
}

function statusText(s: string): string {
  switch (s) {
    case 'waiting':
      return '等待定位…'
    case 'navigating':
      return '导航中'
    case 'offroute':
      return '已偏离路线'
    case 'rerouting':
      return '正在重新规划…'
    case 'arrived':
      return '已到达'
    case 'error':
      return '定位异常'
    default:
      return '未开始'
  }
}

export default function NavigationPanel() {
  const navActive = useStore((s) => s.navActive)
  const snap = useStore((s) => s.navSnap)
  const status = useStore((s) => s.navStatus)
  const route = useStore((s) => s.navRoute)
  const legIndex = useStore((s) => s.navLegIndex)
  const muted = useStore((s) => s.navMuted)
  const simulate = useStore((s) => s.navSimulate)
  const stopNav = useStore((s) => s.stopNavigation)
  const toggleMute = useStore((s) => s.toggleNavMute)
  const setSimulate = useStore((s) => s.setNavSimulate)
  const reroute = useStore((s) => s.navReroute)

  if (!navActive) return null

  const next = snap?.nextStep
  const dist = snap?.distanceToManeuver ?? 0
  const offRoute = status === 'offroute' || status === 'rerouting'

  return (
    <div className={`nav-hud ${offRoute ? 'off' : ''}`}>
      <div className="nav-hud-head">
        <span className="nav-badge">导航中</span>
        <span className="nav-target">
          前往「{route?.toName || '目的地'}」
          <span className="muted">（第 {legIndex + 1} 站）</span>
        </span>
        <span className="nav-status">{statusText(status)}</span>
        <button className="btn sm danger" onClick={stopNav}>
          结束
        </button>
      </div>

      <div className="nav-main">
        <div className="nav-turn">{turnIcon(next?.instruction ?? (status === 'arrived' ? '到达' : ''))}</div>
        <div className="nav-guide">
          <div className="nav-dist">{formatDistance(dist)}</div>
          <div className="nav-inst">{next?.instruction || '沿当前道路行驶'}</div>
          {snap?.currentStep && (
            <div className="nav-now muted">当前：{snap.currentStep.instruction}</div>
          )}
        </div>
      </div>

      <div className="nav-meta">
        <div>
          剩余 <b>{formatDistance(snap?.distanceRemaining ?? route?.distance ?? 0)}</b>
        </div>
        <div>
          预计 <b>{formatDuration(snap?.durationRemaining ?? route?.duration ?? 0)}</b>
        </div>
        {snap?.position && snap.position.speed > 0 && (
          <div>
            车速 <b>{Math.round(snap.position.speed * 3.6)}</b> km/h
          </div>
        )}
        {route?.providerLabel && <div className="muted">算路：{route.providerLabel}</div>}
      </div>

      {offRoute && (
        <div className="nav-alert">
          偏离路线 {Math.round(snap?.offRouteDistance ?? 0)} 米，正在用高德/腾讯/百度聚合重算…
        </div>
      )}
      {status === 'error' && <div className="nav-alert">{snap?.message}</div>}
      {simulate && <div className="nav-note">模拟导航中（未使用真实 GPS，按固定速度沿路线推进）</div>}
      {!speechSupported() && (
        <div className="nav-note">当前浏览器不支持语音播报，仅显示文字引导</div>
      )}

      <div className="nav-ops">
        <button className="btn sm" onClick={toggleMute}>
          {muted ? '🔇 已静音' : '🔊 播报中'}
        </button>
        <button className="btn sm" onClick={reroute} disabled={status === 'rerouting'}>
          重新规划
        </button>
        <label className="chk" title="桌面或无 GPS 环境下用模拟定位演示完整引导流程">
          <input
            type="checkbox"
            checked={simulate}
            onChange={(e) => setSimulate(e.target.checked)}
          />
          模拟导航
        </label>
      </div>
    </div>
  )
}
