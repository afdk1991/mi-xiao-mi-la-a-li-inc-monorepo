// 配送员轨迹：采集 → 纠偏 → 存储 → 上云。
//
// 存储提供两条路径，可并存：
//   1) 自建数据服务（默认）：轨迹存本地 IndexedDB，离线可用、无配额、零 Key 依赖。
//   2) 高德猎鹰轨迹服务（可选）：需 Web 服务 Key + sid/tid/trid，适合多端归档与跨设备回看。
//
// 纠偏统一走高德 v4/grasproad（把 GPS 飘点吸附到道路）。腾讯/OSM 无纠偏能力，会给出明确提示。

import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { clearTracks, deleteTrack, getAllTracks, putTrack, type TrackRecord } from '../db'
import { buildSampleTrack, graspRoad, trackLength, type TrackPoint } from '../trajectory'
import { amapChannel } from '../amap'
import {
  falconAddTerminal,
  falconAddTrace,
  falconCreateService,
  falconSearchTrace,
  falconUpload,
  type FalconConfig,
} from '../falcon'

const FALCON_KEY = 'delivery.falcon'

function loadFalcon(): FalconConfig {
  try {
    const raw = localStorage.getItem(FALCON_KEY)
    if (!raw) return { key: '', sid: '', tid: '', trid: '', proxyBase: '' }
    const p = JSON.parse(raw) as Partial<FalconConfig>
    return {
      key: p.key ?? '',
      sid: p.sid ?? '',
      tid: p.tid ?? '',
      trid: p.trid ?? '',
      proxyBase: p.proxyBase ?? '',
    }
  } catch {
    return { key: '', sid: '', tid: '', trid: '', proxyBase: '' }
  }
}

function saveFalcon(c: FalconConfig): void {
  try {
    localStorage.setItem(FALCON_KEY, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}

function km(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
}

function timeText(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 均匀抽稀，保证不超过 grasproad 的 500 点上限 */
function downsample(src: [number, number][], max = 480): [number, number][] {
  if (src.length <= max) return src
  const step = src.length / max
  const out: [number, number][] = []
  for (let i = 0; i < max; i++) out.push(src[Math.floor(i * step)])
  return out
}

export default function TrajectoryPanel() {
  const result = useStore((s) => s.result)
  const settings = useStore((s) => s.settings)
  const trajectory = useStore((s) => s.trajectory)
  const trajectoryMeta = useStore((s) => s.trajectoryMeta)
  const setTrajectory = useStore((s) => s.setTrajectory)
  const clearTrajectory = useStore((s) => s.clearTrajectory)

  const [tracks, setTracks] = useState<TrackRecord[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [falcon, setFalcon] = useState<FalconConfig>(loadFalcon)
  const [showFalcon, setShowFalcon] = useState(false)

  useEffect(() => {
    getAllTracks().then(setTracks).catch(() => setTracks([]))
  }, [])

  // 纠偏依赖 v4/grasproad，只有「高德 + Web 服务通道」可用（JS API 通道无此能力）。
  // 注意不能用 keys.amap（JS Key）判定 —— 那会导致 JS-only 场景下不提示、点了才报错。
  const graspReady = settings.service === 'amap' && amapChannel(settings) === 'web'

  async function refresh() {
    setTracks(await getAllTracks())
  }

  /** 用当前路线几何生成带噪声的示例轨迹（无真实设备时用于演示） */
  function genSample() {
    const geom: [number, number][] = []
    result?.segments.forEach((s) => {
      ;(s.geometry as [number, number][]).forEach((p) => geom.push(p))
    })
    if (geom.length < 2) {
      setMsg({ kind: 'err', text: '请先生成配送路线，再用路线几何生成示例轨迹。' })
      return
    }
    const raw = buildSampleTrack(downsample(geom))
    setTrajectory({ original: raw.map((p) => [p.lat, p.lng] as [number, number]), corrected: [] }, {
      originalCount: raw.length,
      correctedDistance: 0,
    })
    setMsg({ kind: 'ok', text: `已生成示例轨迹 ${raw.length} 点，可点击「纠偏」。 ` })
  }

  async function doGrasp() {
    if (!trajectory || trajectory.original.length < 2) {
      setMsg({ kind: 'err', text: '暂无轨迹点，请先生成或导入轨迹。' })
      return
    }
    setBusy('grasp')
    const pts: TrackPoint[] = trajectory.original.map(([lat, lng]) => ({ lat, lng }))
    const r = await graspRoad(pts, settings)
    setBusy(null)
    if (!r.ok || !r.result) {
      setMsg({ kind: 'err', text: r.msg || '纠偏失败。' })
      return
    }
    setTrajectory({ original: trajectory.original, corrected: r.result.points }, {
      originalCount: pts.length,
      correctedDistance: r.result.distance,
    })
    setMsg({ kind: 'ok', text: `纠偏完成：${r.result.points.length} 点，里程 ${km(r.result.distance)}。` })
  }

  async function saveLocal() {
    if (!trajectory || trajectory.original.length < 2) {
      setMsg({ kind: 'err', text: '暂无轨迹可保存。' })
      return
    }
    const rec: TrackRecord = {
      id: crypto.randomUUID(),
      name: `轨迹 ${timeText(Date.now())}`,
      createdAt: Date.now(),
      source: 'local',
      original: trajectory.original,
      corrected: trajectory.corrected,
      distance: trajectoryMeta?.correctedDistance ?? (trajectory.corrected.length ? trackLength(trajectory.corrected) : 0),
      rawDistance: trackLength(trajectory.original),
      pointCount: trajectory.original.length,
    }
    await putTrack(rec)
    await refresh()
    setMsg({ kind: 'ok', text: '已存入本地轨迹库（自建数据服务）。' })
  }

  function loadToMap(t: TrackRecord) {
    setTrajectory({ original: t.original, corrected: t.corrected }, {
      originalCount: t.pointCount,
      correctedDistance: t.distance,
    })
    setMsg({ kind: 'ok', text: `已加载「${t.name}」到地图。` })
  }

  function exportTrack(t: TrackRecord) {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `track-${t.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function removeTrack(id: string) {
    await deleteTrack(id)
    await refresh()
  }

  async function wipeTracks() {
    await clearTracks()
    await refresh()
    setMsg({ kind: 'ok', text: '本地轨迹库已清空。' })
  }

  /* ---------- 猎鹰轨迹服务 ---------- */

  function patchFalcon(p: Partial<FalconConfig>) {
    const next = { ...falcon, ...p }
    setFalcon(next)
    saveFalcon(next)
  }

  /** 走代理时 Key 由服务端环境变量注入，前端可留空 */
  const viaProxy = !!falcon.proxyBase?.trim()

  async function createService() {
    if (!viaProxy && !falcon.key) {
      return setMsg({ kind: 'err', text: '请填写高德 Web 服务 Key，或填写代理地址由服务端注入 Key。' })
    }
    setBusy('svc')
    const r = await falconCreateService({ key: falcon.key, proxyBase: falcon.proxyBase }, '配送轨迹服务')
    setBusy(null)
    if (!r.ok || !r.data) return setMsg({ kind: 'err', text: r.msg || '创建服务失败。' })
    patchFalcon({ sid: String(r.data.sid) })
    setMsg({ kind: 'ok', text: `服务已创建，sid=${r.data.sid}` })
  }

  async function createTerminal() {
    if (!falcon.sid || (!viaProxy && !falcon.key)) {
      return setMsg({ kind: 'err', text: '需先有 sid（以及 key 或代理）。' })
    }
    setBusy('tid')
    const r = await falconAddTerminal(
      { key: falcon.key, sid: falcon.sid, proxyBase: falcon.proxyBase },
      `配送员-${Date.now()}`,
    )
    setBusy(null)
    if (!r.ok || !r.data) return setMsg({ kind: 'err', text: r.msg || '创建终端失败。' })
    patchFalcon({ tid: String(r.data.tid) })
    setMsg({ kind: 'ok', text: `终端已创建，tid=${r.data.tid}` })
  }

  async function createTrace() {
    if (!falcon.sid || !falcon.tid || (!viaProxy && !falcon.key)) {
      return setMsg({ kind: 'err', text: '需先有 sid / tid（以及 key 或代理）。' })
    }
    setBusy('trid')
    const r = await falconAddTrace(
      { key: falcon.key, sid: falcon.sid, tid: falcon.tid, proxyBase: falcon.proxyBase },
      `配送-${Date.now()}`,
    )
    setBusy(null)
    if (!r.ok || !r.data) return setMsg({ kind: 'err', text: r.msg || '创建轨迹失败。' })
    patchFalcon({ trid: String(r.data.trid) })
    setMsg({ kind: 'ok', text: `轨迹已创建，trid=${r.data.trid}` })
  }

  async function uploadFalcon(t?: TrackRecord) {
    const src = t ?? (trajectory ? { original: trajectory.original, corrected: trajectory.corrected } : null)
    if (!src || !src.original?.length) return setMsg({ kind: 'err', text: '没有可上传的轨迹。' })
    if (!falcon.sid || !falcon.tid || !falcon.trid || (!viaProxy && !falcon.key)) {
      return setMsg({ kind: 'err', text: '上传前请完整填写 sid / tid / trid（以及 key 或代理）。' })
    }
    setBusy('upload')
    const useCorrected = src.corrected && src.corrected.length > 1
    const arr = useCorrected ? src.corrected : src.original
    const now = Date.now()
    const pts = arr.map((p, i) => ({
      lat: p[0],
      lng: p[1],
      timeMs: now - (arr.length - i) * 8000,
    }))
    const r = await falconUpload(falcon, pts)
    setBusy(null)
    if (r.errors.length) return setMsg({ kind: 'err', text: r.errors.join('；') })
    if (t) {
      await putTrack({ ...t, source: 'falcon', falcon: { sid: falcon.sid, tid: falcon.tid, trid: falcon.trid } })
      await refresh()
    }
    setMsg({ kind: 'ok', text: `已上传 ${r.uploaded} 点到猎鹰（trid=${falcon.trid}）。` })
  }

  async function searchFalcon() {
    if (!falcon.sid || !falcon.tid || (!viaProxy && !falcon.key)) {
      return setMsg({ kind: 'err', text: '需先有 sid / tid（以及 key 或代理）。' })
    }
    setBusy('search')
    const nowSec = Math.floor(Date.now() / 1000)
    const r = await falconSearchTrace(falcon, {
      startSec: nowSec - 24 * 3600,
      endSec: nowSec,
      trid: falcon.trid || undefined,
      correct: true,
    })
    setBusy(null)
    if (!r.ok || !r.data?.points?.length) return setMsg({ kind: 'err', text: r.msg || '未查询到轨迹点。' })
    const corrected = r.data.points.map((p) => [p.lat, p.lng] as [number, number])
    setTrajectory({ original: corrected, corrected }, {
      originalCount: corrected.length,
      correctedDistance: trackLength(corrected),
    })
    setMsg({ kind: 'ok', text: `从猎鹰取回 ${corrected.length} 点（已纠偏）。` })
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <strong>配送员轨迹</strong>
        <span className="muted">自建库 · 猎鹰上云</span>
      </div>

      <div className="row sub">
        <button className="btn" onClick={genSample} disabled={!!busy}>
          生成示例轨迹
        </button>
        <button className="btn primary" onClick={doGrasp} disabled={!!busy}>
          {busy === 'grasp' ? '纠偏中…' : '轨迹纠偏'}
        </button>
        <button className="btn" onClick={saveLocal} disabled={!!busy}>
          存入本地库
        </button>
        <button className="btn danger" onClick={clearTrajectory}>
          清除
        </button>
      </div>

      <div className="hint">
        {trajectory ? (
          <>
            当前轨迹：原始 <b>{trajectory.original.length}</b> 点
            {trajectory.corrected.length > 1 ? (
              <>
                ，纠偏后 <b>{trajectory.corrected.length}</b> 点 · 里程{' '}
                <b>{km(trajectoryMeta?.correctedDistance ?? trackLength(trajectory.corrected))}</b>
              </>
            ) : (
              '，尚未纠偏'
            )}
          </>
        ) : (
          '暂无轨迹：可基于当前配送路线生成示例轨迹，或后续接入设备上报。'
        )}
      </div>

      {settings.service !== 'amap' ? (
        <div className="hint warn">
          ⚠️ 轨迹纠偏仅支持「高德 + Web 服务通道」，当前服务为 {settings.service}。
        </div>
      ) : (
        !graspReady && (
          <div className="hint warn">
            ⚠️ 当前高德走 JS API 通道，轨迹纠偏需「Web 服务」Key（<code>v4/grasproad</code>
            ）。请在顶部设置启用服务端代理，或在直连模式下填写高德 Web 服务 Key。
          </div>
        )
      )}

      {msg && (
        <div className="hint" style={{ color: msg.kind === 'err' ? 'var(--danger)' : 'var(--ok)' }}>
          {msg.text}
        </div>
      )}

      {/* 自建数据服务：本地轨迹库 */}
      <div className="row sub" style={{ justifyContent: 'space-between' }}>
        <strong>本地轨迹库（自建数据服务）</strong>
        <button className="btn sm danger" onClick={wipeTracks} disabled={!tracks.length}>
          清空
        </button>
      </div>
      {tracks.length === 0 ? (
        <div className="empty">暂无存档轨迹</div>
      ) : (
        <div className="stop-list">
          {tracks.map((t) => (
            <div className="stop-item" key={t.id}>
              <div className="stop-no">{t.pointCount}</div>
              <div className="stop-main">
                <div className="stop-name">
                  {t.name}
                  {t.source === 'falcon' ? (
                    <span className="tag ok" style={{ marginLeft: 6 }}>
                      猎鹰
                    </span>
                  ) : (
                    <span className="tag" style={{ marginLeft: 6 }}>
                      本地
                    </span>
                  )}
                </div>
                <div className="stop-meta">
                  {timeText(t.createdAt)} · {t.distance ? km(t.distance) : '未纠偏'}
                </div>
              </div>
              <div className="row">
                <button className="btn sm" onClick={() => loadToMap(t)}>
                  查看
                </button>
                <button className="btn sm" onClick={() => exportTrack(t)}>
                  导出
                </button>
                <button className="btn sm" onClick={() => uploadFalcon(t)} disabled={!!busy}>
                  上传
                </button>
                <button className="btn sm danger" onClick={() => removeTrack(t.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 猎鹰轨迹服务 */}
      <div className="row sub">
        <button className="btn sm" onClick={() => setShowFalcon((v) => !v)}>
          {showFalcon ? '收起猎鹰配置' : '猎鹰轨迹服务（可选上云）'}
        </button>
      </div>
      {showFalcon && (
        <>
          <div className="hint">
            浏览器直连 tsapi.amap.com 会被 CORS 拦截且 Key 暴露。点「用本站代理」走 <b>/api/falcon</b> 边缘函数：
            Key 由服务端环境变量注入，前端可不填 Key。
          </div>
          <div className="row sub">
            <button className="btn sm" onClick={() => patchFalcon({ proxyBase: '/api/falcon' })}>
              用本站代理 /api/falcon
            </button>
            {viaProxy && <span className="tag ok">已启用代理</span>}
            {viaProxy && (
              <button className="btn sm" onClick={() => patchFalcon({ proxyBase: '' })}>
                取消代理
              </button>
            )}
          </div>
          <div className="row sub">
            <input
              className="search"
              placeholder={viaProxy ? '高德 Key（可选，留空则用服务端 Key）' : '高德 Web 服务 Key'}
              value={falcon.key}
              onChange={(e) => patchFalcon({ key: e.target.value })}
            />
          </div>
          <div className="row sub">
            <input
              className="search"
              placeholder="sid 服务ID"
              value={falcon.sid}
              onChange={(e) => patchFalcon({ sid: e.target.value })}
            />
            <button className="btn sm" onClick={createService} disabled={!!busy}>
              {busy === 'svc' ? '…' : '创建服务'}
            </button>
          </div>
          <div className="row sub">
            <input
              className="search"
              placeholder="tid 终端ID"
              value={falcon.tid}
              onChange={(e) => patchFalcon({ tid: e.target.value })}
            />
            <button className="btn sm" onClick={createTerminal} disabled={!!busy}>
              {busy === 'tid' ? '…' : '创建终端'}
            </button>
          </div>
          <div className="row sub">
            <input
              className="search"
              placeholder="trid 轨迹ID"
              value={falcon.trid || ''}
              onChange={(e) => patchFalcon({ trid: e.target.value })}
            />
            <button className="btn sm" onClick={createTrace} disabled={!!busy}>
              {busy === 'trid' ? '…' : '创建轨迹'}
            </button>
          </div>
          <div className="row sub">
            <input
              className="search"
              placeholder="代理地址（可选，如 https://api.example.com/falcon）"
              value={falcon.proxyBase || ''}
              onChange={(e) => patchFalcon({ proxyBase: e.target.value })}
            />
          </div>
          <div className="row sub">
            <button className="btn primary sm" onClick={() => uploadFalcon()} disabled={!!busy}>
              {busy === 'upload' ? '上传中…' : '上传当前轨迹'}
            </button>
            <button className="btn sm" onClick={searchFalcon} disabled={!!busy}>
              {busy === 'search' ? '查询中…' : '查询并纠偏'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
