import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import AddressManager from './components/AddressManager'
import BackupPanel from './components/BackupPanel'
import PoiSearchPanel from './components/PoiSearchPanel'
import MapView from './components/MapView'
import RoutePanel from './components/RoutePanel'
import TrajectoryPanel from './components/TrajectoryPanel'
import ImportDialog from './components/ImportDialog'
import MapSettingsPanel from './components/MapSettingsPanel'
import NavigationPanel from './components/NavigationPanel'
import PrivacyNotice from './components/PrivacyNotice'
import { formatDistance } from './geo'
import { ackPrivacy, privacyAcked } from './privacy'
import { hasCredentials, needsKey, serviceLabel, KEYLESS_HINT } from './mapservice'
import { maybeAutoSnapshot } from './backup'
import { initInstallPrompt, promptInstall } from './pwa'

export default function App() {
  const load = useStore((s) => s.load)
  const customers = useStore((s) => s.customers)
  const depot = useStore((s) => s.depot)
  const result = useStore((s) => s.result)
  const currentStop = useStore((s) => s.currentStop)
  const setCurrentStop = useStore((s) => s.setCurrentStop)
  const settings = useStore((s) => s.settings)
  const liveTracking = useStore((s) => s.liveTracking)
  const livePosition = useStore((s) => s.livePosition)
  const liveError = useStore((s) => s.liveError)
  const startLiveTracking = useStore((s) => s.startLiveTracking)
  const stopLiveTracking = useStore((s) => s.stopLiveTracking)
  const locateMe = useStore((s) => s.locateMe)
  const setLiveFollow = useStore((s) => s.setLiveFollow)
  const liveFollow = useStore((s) => s.liveFollow)

  const [showImport, setShowImport] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftTab, setLeftTab] = useState<'addr' | 'poi' | 'backup'>('addr')
  const [rightTab, setRightTab] = useState<'route' | 'track'>('route')
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  // 移动端：哪个抽屉（底栏标签）被打开
  const [mobilePane, setMobilePane] = useState<'none' | 'left' | 'right'>('none')
  // 隐私合规：位置属敏感个人信息，首次开启前必须告知用途并征得同意
  const [privacyOpen, setPrivacyOpen] = useState(false)
  // PWA 可安装时显示「安装应用」按钮
  const [canInstall, setCanInstall] = useState(false)
  // 记住用户点的是哪个定位入口，同意后执行对应动作（持续跟踪 / 单次定位）
  const pendingAction = useRef<'track' | 'locate'>('track')

  useEffect(() => {
    load()
  }, [load])

  // 自动快照：数据变化后静默存一份，误删/误改可一键回滚（内部按指纹去重）
  useEffect(() => {
    if (!customers.length) return
    const t = window.setTimeout(() => {
      maybeAutoSnapshot(customers, depot).catch(() => {
        /* 快照失败不影响主流程 */
      })
    }, 1500)
    return () => window.clearTimeout(t)
  }, [customers, depot])

  // PWA 安装引导（浏览器支持且未安装时显示入口）
  useEffect(() => {
    initInstallPrompt(setCanInstall)
  }, [])

  /** 开启/关闭实时位置跟踪：关闭随时允许，开启前需先征得同意 */
  const toggleLiveTracking = () => {
    if (liveTracking) {
      stopLiveTracking()
      return
    }
    if (!privacyAcked()) {
      pendingAction.current = 'track'
      setPrivacyOpen(true)
      return
    }
    startLiveTracking()
  }

  /** 单次「定位到我」：同样属于获取位置，需先征得同意 */
  const doLocateMe = () => {
    if (!privacyAcked()) {
      pendingAction.current = 'locate'
      setPrivacyOpen(true)
      return
    }
    locateMe()
  }

  /** 用户在告知弹窗中同意：记录同意状态并执行原触发动作 */
  const onPrivacyAccept = () => {
    ackPrivacy()
    setPrivacyOpen(false)
    if (pendingAction.current === 'locate') locateMe()
    else startLiveTracking()
  }

  const located = customers.filter((c) => c.lat !== 0 || c.lng !== 0).length
  const visited = customers.filter((c) => c.visited).length
  const credOk = !needsKey(settings.service) || hasCredentials(settings)

  // 关闭左/右栏：桌面收起，移动端收起抽屉
  const closeLeft = () => {
    setLeftCollapsed(true)
    setMobilePane((p) => (p === 'left' ? 'none' : p))
  }
  const closeRight = () => {
    setRightCollapsed(true)
    setMobilePane((p) => (p === 'right' ? 'none' : p))
  }
  const openLeft = (t: 'addr' | 'poi') => {
    setLeftTab(t)
    setLeftCollapsed(false)
    setMobilePane('left')
  }
  const openRight = (t: 'route' | 'track') => {
    setRightTab(t)
    setRightCollapsed(false)
    setMobilePane('right')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="logo">🛵</span>
          <div className="brand-txt">
            <h1>配送定位与路径优化</h1>
            <p className="muted">批量地址 · 最优排序 · 实时导航</p>
          </div>
        </div>

        <div className="stat-chips">
          <div className="stat">
            <span className="stat-val">{customers.length}</span>
            <span className="stat-label">客户</span>
          </div>
          <div className="stat">
            <span className="stat-val">{located}</span>
            <span className="stat-label">已定位</span>
          </div>
          <div className="stat">
            <span className="stat-val">{visited}</span>
            <span className="stat-label">已送达</span>
          </div>
          {result && (
            <div className="stat">
              <span className="stat-val">{formatDistance(result.totalDistance)}</span>
              <span className="stat-label">总里程</span>
            </div>
          )}
        </div>

        <div className="header-actions">
          {credOk ? (
            <span
              className="svc-chip"
              onClick={() => setSettingsOpen(true)}
              title="点击修改地图服务"
            >
              🗺 {serviceLabel(settings.service)}
            </span>
          ) : (
            <span
              className="svc-chip keyless"
              onClick={() => setSettingsOpen(true)}
              title="未配置 Key，已回退 OpenStreetMap 公开服务（免 Key、无偏移）。点击到「设置」填入高德/腾讯 Key 或开启服务端代理"
            >
              🗺 OSM 公开服务
            </span>
          )}
          {liveError && <span className="svc-chip warn" title={liveError}>⚠ 定位异常</span>}
          {canInstall && (
            <button
              className="btn"
              onClick={() => promptInstall()}
              title="安装到桌面 / 主屏幕（离线可用）"
            >
              📥<span className="btn-label"> 安装应用</span>
            </button>
          )}
          <button
            className={`btn ${liveTracking ? 'primary' : ''}`}
            onClick={toggleLiveTracking}
            title="开启/关闭实时位置跟踪"
          >
            📍 {liveTracking ? '定位中' : '实时位置'}
          </button>
          <button className="btn icon-only" onClick={() => setSettingsOpen(true)} title="设置">
            ⚙<span className="btn-label"> 设置</span>
          </button>
          <button className="btn primary icon-only" onClick={() => setShowImport(true)} title="批量导入">
            ＋<span className="btn-label"> 批量导入</span>
          </button>
        </div>
      </header>

      {!credOk && (
        <div className="app-notice">
          <span>{KEYLESS_HINT}</span>
          <button className="btn sm" onClick={() => setSettingsOpen(true)}>
            去设置
          </button>
        </div>
      )}

      <div className="shell">
        <aside
          className={`side side--left ${leftCollapsed ? 'is-collapsed' : ''} ${
            mobilePane === 'left' ? 'is-sheet' : ''
          }`}
        >
          <div className="tabbar">
            <button
              className={`tab ${leftTab === 'addr' ? 'is-active' : ''}`}
              onClick={() => setLeftTab('addr')}
            >
              客户地址
            </button>
            <button
              className={`tab ${leftTab === 'poi' ? 'is-active' : ''}`}
              onClick={() => setLeftTab('poi')}
            >
              商户搜索
            </button>
            <button
              className={`tab ${leftTab === 'backup' ? 'is-active' : ''}`}
              onClick={() => setLeftTab('backup')}
            >
              备份
            </button>
            <button
              className="side-close"
              onClick={closeLeft}
              title="收起 / 关闭"
            >
              ✕
            </button>
          </div>
          <div className={`tabpane ${leftTab === 'addr' ? 'is-active' : ''}`}>
            <AddressManager />
          </div>
          <div className={`tabpane ${leftTab === 'poi' ? 'is-active' : ''}`}>
            <PoiSearchPanel />
          </div>
          <div className={`tabpane ${leftTab === 'backup' ? 'is-active' : ''}`}>
            <BackupPanel />
          </div>
        </aside>

        {leftCollapsed && mobilePane !== 'left' && (
          <button
            className="side-reopen side-reopen--left"
            onClick={() => {
              setLeftCollapsed(false)
              setMobilePane('left')
            }}
          >
            ⟩ 客户 / 商户
          </button>
        )}

        <main className="map-area">
          <MapView
            customers={customers}
            depot={depot}
            result={result}
            currentStop={currentStop}
            onSelectStop={setCurrentStop}
          />
          <div className="legend-float">
            <span>
              <i className="dot dep" /> 起点
            </span>
            <span>
              <i className="dot todo" /> 待送
            </span>
            <span>
              <i className="dot cur" /> 当前
            </span>
            <span>
              <i className="dot done" /> 已送达
            </span>
            <span>
              <i className="dot poi" /> 商户
            </span>
          </div>

          <div className="map-ctl">
            {livePosition && (
              <div className="live-card">
                <span className="live-dot" />
                {liveTracking ? '实时跟踪中' : '已定位'} · 精度 ±{Math.round(livePosition.accuracy)}m
              </div>
            )}
            <button
              className={`map-fab ${liveTracking ? 'on' : ''}`}
              onClick={toggleLiveTracking}
              title={liveTracking ? '停止实时位置跟踪' : '开启实时位置跟踪'}
            >
              📍
            </button>
            <button
              className="map-fab"
              onClick={doLocateMe}
              title="定位到我并居中（未同意定位授权时会先弹出用途告知）"
            >
              🎯
            </button>
            {livePosition && (
              <button
                className={`map-fab ${liveFollow ? 'on' : ''}`}
                onClick={() => setLiveFollow(!liveFollow)}
                title={liveFollow ? '取消跟随我的位置' : '跟随我的位置'}
              >
                🧭
              </button>
            )}
          </div>
        </main>

        {rightCollapsed && mobilePane !== 'right' && (
          <button
            className="side-reopen side-reopen--right"
            onClick={() => {
              setRightCollapsed(false)
              setMobilePane('right')
            }}
          >
            路线 / 轨迹 ⟩
          </button>
        )}

        <aside
          className={`side side--right ${rightCollapsed ? 'is-collapsed' : ''} ${
            mobilePane === 'right' ? 'is-sheet' : ''
          }`}
        >
          <div className="tabbar">
            <button
              className="side-close"
              onClick={closeRight}
              title="收起 / 关闭"
            >
              ✕
            </button>
            <button
              className={`tab ${rightTab === 'route' ? 'is-active' : ''}`}
              onClick={() => setRightTab('route')}
            >
              路线规划
            </button>
            <button
              className={`tab ${rightTab === 'track' ? 'is-active' : ''}`}
              onClick={() => setRightTab('track')}
            >
              轨迹
            </button>
          </div>
          <div className={`tabpane ${rightTab === 'route' ? 'is-active' : ''}`}>
            <RoutePanel />
          </div>
          <div className={`tabpane ${rightTab === 'track' ? 'is-active' : ''}`}>
            <TrajectoryPanel />
          </div>
        </aside>
      </div>

      {/* 移动端底部导航：地图优先，面板以抽屉形式上滑 */}
      <nav className="bottom-nav">
        <button
          className={`bn-btn ${mobilePane === 'left' && leftTab === 'addr' ? 'active' : ''}`}
          onClick={() => (mobilePane === 'left' ? openLeft('addr') : openLeft('addr'))}
        >
          <span className="bn-ico">📋</span>
          <span className="bn-txt">客户</span>
        </button>
        <button
          className={`bn-btn ${mobilePane === 'left' && leftTab === 'poi' ? 'active' : ''}`}
          onClick={() => openLeft('poi')}
        >
          <span className="bn-ico">🔍</span>
          <span className="bn-txt">商户</span>
        </button>
        <button
          className={`bn-btn bn-center ${liveTracking ? 'on' : ''}`}
          onClick={toggleLiveTracking}
          title="实时位置跟踪"
        >
          <span className="bn-ico">📍</span>
          <span className="bn-txt">{liveTracking ? '定位中' : '定位'}</span>
        </button>
        <button
          className={`bn-btn ${mobilePane === 'right' && rightTab === 'route' ? 'active' : ''}`}
          onClick={() => openRight('route')}
        >
          <span className="bn-ico">🧭</span>
          <span className="bn-txt">路线</span>
        </button>
        <button
          className={`bn-btn ${mobilePane === 'right' && rightTab === 'track' ? 'active' : ''}`}
          onClick={() => openRight('track')}
        >
          <span className="bn-ico">🛰</span>
          <span className="bn-txt">轨迹</span>
        </button>
      </nav>

      {mobilePane !== 'none' && <div className="sheet-scrim" onClick={() => setMobilePane('none')} />}

      <NavigationPanel />

      <MapSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}

      <PrivacyNotice
        open={privacyOpen}
        onAccept={onPrivacyAccept}
        onCancel={() => setPrivacyOpen(false)}
      />
    </div>
  )
}
