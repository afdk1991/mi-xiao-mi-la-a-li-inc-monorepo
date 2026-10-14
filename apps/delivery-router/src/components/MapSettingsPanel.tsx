import { useState } from 'react'
import { useStore } from '../store'
import {
  EMPTY_KEYS,
  hasCredentials,
  needsKey,
  serviceLabel,
  KEYLESS_HINT,
  type MapService,
} from '../mapservice'
import { amapChannel, amapWebBlockReason, setAmapWebBlocked } from '../amap'
import { testKey, type KeyTestResult } from '../geocode'
import { DEFAULT_PROXY, usingProxy } from '../proxy'
import type { AmapPref } from '../mapservice'

export default function MapSettingsPanel({
  open = true,
  onClose,
}: {
  open?: boolean
  onClose?: () => void
}) {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  // 代理模式：Key 由服务端注入，前端不需要也不应该出现 Key 输入框
  const proxied = usingProxy(settings)
  const showKey = needsKey(settings.service) && !proxied
  const keyMissing = needsKey(settings.service) && !hasCredentials(settings)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<KeyTestResult | null>(null)
  // Web 服务通道熔断原因（签名失败 / Key 类型不符等），空表示 Web 通道可用
  const [blockReason, setBlockReason] = useState<string>(amapWebBlockReason())
  const proxyProbe = useStore((s) => s.proxyProbe)
  const proxyProbing = useStore((s) => s.proxyProbing)
  const checkProxy = useStore((s) => s.checkProxy)

  // 高德当前生效通道（Web 服务 / JS API / 无）
  const channel = settings.service === 'amap' ? amapChannel(settings) : 'none'

  // 关闭态直接不渲染。注意：必须放在所有 Hooks 之后——
  // 若 early return 早于 Hooks，open 由 true 变 false 时本次渲染的 Hook 数量会变少，
  // React 会抛出 "Rendered fewer hooks than expected"。
  if (!open) return null

  async function runTest() {
    setTesting(true)
    setTest(null)
    try {
      const r = await testKey(settings)
      setTest(r)
      setBlockReason(amapWebBlockReason())
    } finally {
      setTesting(false)
    }
  }

  function patch(field: keyof typeof settings.keys, value: string) {
    setTest(null)
    // 换 Web Key 或补签名私钥后，之前的熔断结论作废
    if (field === 'amapWeb' || field === 'amapSig') {
      setAmapWebBlocked('')
      setBlockReason('')
    }
    setSettings({ ...settings, keys: { ...settings.keys, [field]: value } })
  }

  function setPref(v: AmapPref) {
    setTest(null)
    setSettings({ ...settings, amapPref: v })
  }

  return (
    <div className="drawer-mask" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>地图服务设置</h3>
          <button className="drawer-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="drawer-body">
          <div className="settings-bar">
      <div className="mode-switch" role="tablist" aria-label="凭证模式">
        <button
          type="button"
          className={`mode-opt ${proxied ? 'active' : ''}`}
          onClick={() => {
            setTest(null)
            setSettings({ ...settings, proxy: DEFAULT_PROXY })
            void checkProxy()
          }}
        >
          代理模式（推荐）
        </button>
        <button
          type="button"
          className={`mode-opt ${!proxied ? 'active' : ''}`}
          onClick={() => {
            setTest(null)
            setSettings({ ...settings, proxy: '' })
          }}
        >
          直连填 Key
        </button>
      </div>
      <p className="mode-hint">
        {proxied
          ? 'Key 由服务端注入，浏览器零凭证（最安全）。如部署端未配环境变量，点「检测代理」会提示不可用，届时切到「直连填 Key」即可。'
          : '浏览器直接带 Key 请求官方接口。高德请填「Web端 JS Key + 安全密钥」；腾讯请填「WebServiceAPI Key」。'}
      </p>
      <span className="muted">底图 / 地理编码</span>
      <select
        value={settings.service}
        onChange={(e) => {
          setTest(null)
          setSettings({ ...settings, service: e.target.value as MapService })
        }}
      >
        <option value="amap">高德地图（国内推荐）</option>
        <option value="tencent">腾讯地图</option>
        <option value="baidu">百度地图</option>
        <option value="osm">OpenStreetMap（免 Key）</option>
      </select>

      <label className="key-field" title="留空则回退「直连模式」：浏览器直接请求官方域名并自带 Key（会暴露，仅本地调试）">
        <span className="key-tag">代理</span>
        <input
          className="key-input"
          type="text"
          placeholder="/api/map（留空=直连，需自填 Key）"
          value={settings.proxy ?? ''}
          onChange={(e) => {
            setTest(null)
            setSettings({ ...settings, proxy: e.target.value })
          }}
        />
      </label>

      {proxied && (
        <button className="btn sm" disabled={proxyProbing} onClick={() => void checkProxy()}>
          {proxyProbing ? '检测中…' : '检测代理'}
        </button>
      )}

      {proxied && needsKey(settings.service) && (
        <>
          <span className="tag ok" title="Key 与数字签名均由服务端注入，浏览器内不存在任何凭证">
            前端零 Key
          </span>
          {Object.values(settings.keys).some((v) => (v ?? '').trim()) && (
            <button
              className="btn sm"
              title="抹掉本机 localStorage 里残留的 Key"
              onClick={() => {
                setTest(null)
                setSettings({ ...settings, keys: { ...EMPTY_KEYS } })

              }}
            >
              清除本机 Key
            </button>
          )}
        </>
      )}

      {showKey && settings.service === 'amap' && (
        <span className="key-wrap">
          <label className="key-field">
            <span className="key-tag">Web服务Key</span>
            <input
              className="key-input"
              type="text"
              placeholder="高德「Web服务」Key"
              value={settings.keys.amapWeb}
              onChange={(e) => patch('amapWeb', e.target.value)}
            />
          </label>
          <label className="key-field">
            <span className="key-tag">签名私钥</span>
            <input
              className="key-input"
              type="text"
              placeholder="数字签名私钥（开启签名时必填）"
              value={settings.keys.amapSig}
              onChange={(e) => patch('amapSig', e.target.value)}
            />
          </label>
          <label className="key-field">
            <span className="key-tag">JS Key</span>
            <input
              className="key-input"
              type="text"
              placeholder="高德「Web端」Key"
              value={settings.keys.amap}
              onChange={(e) => patch('amap', e.target.value)}
            />
          </label>
          <label className="key-field">
            <span className="key-tag">安全密钥</span>
            <input
              className="key-input"
              type="text"
              placeholder="securityJsCode（jscode）"
              value={settings.keys.amapSecret}
              onChange={(e) => patch('amapSecret', e.target.value)}
            />
          </label>
        </span>
      )}

      {showKey && settings.service === 'tencent' && (
        <span className="key-wrap">
          <label className="key-field">
            <span className="key-tag">腾讯</span>
            <input
              className="key-input"
              type="text"
              placeholder="腾讯 WebServiceAPI Key"
              value={settings.keys.tencent}
              onChange={(e) => patch('tencent', e.target.value)}
            />
          </label>
        </span>
      )}

      {showKey && settings.service === 'baidu' && (
        <span className="key-wrap">
          <label className="key-field">
            <span className="key-tag">百度AK</span>
            <input
              className="key-input"
              type="text"
              placeholder="百度「服务端」AK（需勾选地理编码/路线规划）"
              value={settings.keys.baidu}
              onChange={(e) => patch('baidu', e.target.value)}
            />
          </label>
          <span className="set-warn" title="百度 Web 服务不返回 CORS 头，直连时走 JSONP；推荐改用服务端代理">
            直连走 JSONP · 底图沿用高德瓦片（百度无兼容 Web 瓦片）
          </span>
        </span>
      )}

      {showKey && settings.service === 'amap' && (
        <span className="key-wrap">
          <label className="key-field">
            <span className="key-tag">通道</span>
            <select
              className="key-input"
              value={settings.amapPref ?? 'auto'}
              onChange={(e) => setPref(e.target.value as AmapPref)}
              title="Web 服务开启数字签名且无私钥时，选「仅 JS API」可跳过必然失败的请求"
            >
              <option value="auto">自动（Web 优先，失败回落 JS）</option>
              <option value="web">仅 Web 服务（restapi）</option>
              <option value="js">仅 JS API v2.0</option>
            </select>
          </label>
        </span>
      )}

      {showKey && (
        <button className="btn sm" disabled={testing || keyMissing} onClick={runTest}>
          {testing ? '验证中…' : '验证当前服务 Key'}
        </button>
      )}

      <span className={`tag ${settings.service === 'osm' ? 'ok' : 'warn'}`} title="坐标系说明">
        坐标：{settings.service === 'osm' ? 'WGS-84' : 'GCJ-02 火星坐标'}
      </span>

      {settings.service === 'amap' && !keyMissing && (
        <span className="tag" title="高德当前生效通道">
          通道：
          {channel === 'web'
            ? 'Web 服务（restapi）'
            : channel === 'js'
              ? 'JS API v2.0'
              : '未配置'}
        </span>
      )}

      {proxied && proxyProbe && !proxyProbe.ok && (
        <span className="set-warn">
          服务端代理不可用：{proxyProbe.msg}。已自动切回直连模式（填了 Key 走直连，未填则回落 OSM）。
        </span>
      )}
      {!proxied && proxyProbe && proxyProbe.ok && (
        <span className="muted">代理可用，Key 由服务端注入</span>
      )}

      {test && (
        <span className={`set-warn ${test.ok ? 'ok-text' : ''}`}>
          {test.ok ? '✓ ' : '✗ '}
          {test.msg}
        </span>
      )}

      {keyMissing && <span className="keyless-banner">{KEYLESS_HINT}</span>}
      {!keyMissing && showKey && !test && (
        <span className="muted">已启用 {serviceLabel(settings.service)} 国内精准服务</span>
      )}
      {settings.service === 'amap' && blockReason && (
        <span className="set-warn">
          Web 服务通道已熔断：{blockReason}
          。当前自动使用 JS API v2.0（功能不受影响，仅「距离矩阵 / 轨迹纠偏」不可用）
          <button
            className="btn sm"
            style={{ marginLeft: 8 }}
            onClick={() => {
              setAmapWebBlocked('')
              setBlockReason('')
              setTest(null)
            }}
          >
            重试 Web 通道
          </button>
        </span>
      )}
      {settings.service === 'amap' &&
        !proxied &&
        !blockReason &&
        channel === 'web' &&
        !settings.keys.amapSig.trim() && (
          <span className="set-warn">
            当前走 Web 服务通道但未填「签名私钥」：若控制台开启了该 Key 的数字签名，请求会返回
            INVALID_USER_SIGNATURE(10007)，此时自动回退 JS 通道（可在上方「通道」里直接选「仅 JS
            API」避免每次多一次失败请求）
          </span>
        )}
      {!needsKey(settings.service) && <span className="muted">免 Key，适合海外/测试</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
