import { useEffect, useRef, useState } from 'react'
import {
  applyBackup,
  buildBackup,
  downloadBackup,
  listSnapshots,
  parseBackup,
  removeSnapshot,
  restoreSnapshot,
  saveSnapshot,
  summarize,
  type BackupPayload,
  type SnapshotMeta,
} from '../backup'
import { useStore } from '../store'
import {
  cloudDelete,
  cloudDownload,
  cloudStatus,
  cloudUpload,
  isValidCode,
  lastSyncAt,
  randomCode,
  savedCode,
  saveCode,
  type CloudStatus,
} from '../cloudsync'

function fmt(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`
}

export default function BackupPanel() {
  const load = useStore((s) => s.load)
  const customers = useStore((s) => s.customers)
  const settings = useStore((s) => s.settings)

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [snaps, setSnaps] = useState<SnapshotMeta[]>([])
  // 已解析待确认的备份文件
  const [pending, setPending] = useState<BackupPayload | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  // 云同步
  const [code, setCode] = useState(() => savedCode() || randomCode())
  const [cloud, setCloud] = useState<CloudStatus | null>(null)

  const refresh = async () => {
    setSnaps(await listSnapshots())
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    let alive = true
    setCloud(null)
    if (!isValidCode(code)) return
    cloudStatus(code, settings)
      .then((s) => alive && setCloud(s))
      .catch(() => alive && setCloud(null))
    return () => {
      alive = false
    }
  }, [code, settings])

  async function onCloudUpload() {
    if (!isValidCode(code)) {
      setMsg('同步码需为 6-16 位字母或数字')
      return
    }
    setBusy(true)
    try {
      const r = await cloudUpload(code, settings)
      setMsg(`已上传云端：${r.customers} 条客户 / ${r.tracks} 条轨迹（${(r.bytes / 1024).toFixed(0)} KB）`)
      setCloud(await cloudStatus(code, settings))
    } catch (e) {
      setMsg(`上传失败：${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onCloudDownload() {
    setBusy(true)
    try {
      const payload = await cloudDownload(code, settings)
      if (!window.confirm(`云端数据：${summarize(payload)}\n恢复会覆盖本机当前数据，确定继续？`)) {
        setBusy(false)
        return
      }
      const r = await applyBackup(payload, 'replace')
      await load()
      await refresh()
      setMsg(`已从云端恢复：${r.customers} 条客户、${r.tracks} 条轨迹`)
    } catch (e) {
      setMsg(`恢复失败：${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onCloudDelete() {
    if (!window.confirm('删除云端该同步码下的全部数据？本机数据不受影响。')) return
    setBusy(true)
    try {
      await cloudDelete(code, settings)
      setCloud(await cloudStatus(code, settings))
      setMsg('云端数据已删除')
    } catch (e) {
      setMsg(`删除失败：${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onExport() {
    setBusy(true)
    setMsg('')
    try {
      const payload = await buildBackup()
      downloadBackup(payload)
      setMsg(`已导出 ${payload.customers.length} 条客户、${payload.tracks.length} 条轨迹`)
    } catch (e) {
      setMsg(`导出失败：${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return
    setMsg('')
    try {
      const payload = parseBackup(await file.text())
      setPending(payload)
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  async function doImport(mode: 'merge' | 'replace') {
    if (!pending) return
    setBusy(true)
    try {
      const r = await applyBackup(pending, mode)
      setPending(null)
      await load()
      await refresh()
      setMsg(`导入完成：新增 ${r.customers} 条客户、${r.tracks} 条轨迹`)
    } catch (e) {
      setMsg(`导入失败：${(e as Error).message}`)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onSnapshot() {
    setBusy(true)
    try {
      const m = await saveSnapshot('手动')
      await refresh()
      setMsg(`已建立快照（${m.customers} 条客户）`)
    } finally {
      setBusy(false)
    }
  }

  async function onRestore(key: string) {
    if (!window.confirm('恢复快照会覆盖当前全部客户与轨迹，确定继续？')) return
    setBusy(true)
    try {
      const r = await restoreSnapshot(key)
      await load()
      setMsg(`已恢复快照：${r.customers} 条客户、${r.tracks} 条轨迹`)
    } catch (e) {
      setMsg(`恢复失败：${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onRemove(key: string) {
    await removeSnapshot(key)
    await refresh()
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>数据备份与恢复</h3>
        <p className="muted">
          数据只存本机，清缓存或换设备会丢失。建议定期导出备份文件；重大改动前可先建快照。
        </p>
        <div className="row sub">
          <button className="btn primary sm" onClick={onExport} disabled={busy}>
            ⬇ 导出备份
          </button>
          <button className="btn sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            ⬆ 导入备份
          </button>
          <button className="btn sm" onClick={onSnapshot} disabled={busy}>
            📌 建快照
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />
        {msg && <p className="backup-msg">{msg}</p>}
      </div>

      {pending && (
        <div className="backup-confirm">
          <div className="backup-confirm-txt">
            待导入：{summarize(pending)}
            <br />
            <span className="muted">
              备份不含任何地图 Key；导入后如使用国内精准服务需重新填写。
            </span>
          </div>
          <div className="row sub">
            <button className="btn primary sm" onClick={() => doImport('merge')} disabled={busy}>
              合并（保留现有）
            </button>
            <button className="btn danger sm" onClick={() => doImport('replace')} disabled={busy}>
              覆盖（清空后导入）
            </button>
            <button className="btn sm" onClick={() => setPending(null)}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className="backup-section">
        <div className="backup-title">
          云同步
          <span className="muted">（同一同步码可在多设备间搬运数据）</span>
        </div>
        <div className="row">
          <input
            className="search"
            value={code}
            onChange={(e) => {
              const v = e.target.value
              setCode(v)
              if (isValidCode(v)) saveCode(v)
            }}
            placeholder="同步码（6-16 位）"
            style={{ flex: '1 1 auto', minWidth: 0 }}
          />
          <button
            className="btn sm"
            onClick={() => {
              const c = randomCode()
              setCode(c)
              saveCode(c)
            }}
            title="换一个同步码"
          >
            🎲
          </button>
        </div>
        <div className="backup-note muted" style={{ marginTop: 6 }}>
          {cloud === null
            ? '正在查询云端…'
            : !cloud.enabled
              ? '云同步未开通（需在 EdgeOne 控制台开通 KV 存储并绑定变量名 sync_kv）'
              : cloud.exists
                ? `云端有数据：${cloud.customers} 条客户 / ${cloud.tracks} 条轨迹 · ${fmt(cloud.updatedAt ?? 0)}`
                : '该同步码下暂无云端数据'}
          {lastSyncAt() && cloud?.enabled ? ` · 上次同步 ${fmt(lastSyncAt() as number)}` : ''}
        </div>
        <div className="row sub">
          <button className="btn primary sm" onClick={onCloudUpload} disabled={busy}>
            ☁ 上传
          </button>
          <button className="btn sm" onClick={onCloudDownload} disabled={busy}>
            ⬇ 恢复
          </button>
          <button className="btn sm danger" onClick={onCloudDelete} disabled={busy}>
            删除云端
          </button>
        </div>
      </div>

      <div className="backup-section">
        <div className="backup-title">
          本地快照
          <span className="muted">（最多保留 5 份，自动快照随数据变化生成）</span>
        </div>
        {snaps.length === 0 ? (
          <div className="empty">暂无快照，点「建快照」保存当前数据状态</div>
        ) : (
          <div className="backup-list">
            {snaps.map((s) => (
              <div className="backup-item" key={s.key}>
                <div className="backup-main">
                  <div className="backup-name">
                    {s.label} · {s.customers} 条客户 / {s.tracks} 条轨迹
                  </div>
                  <div className="backup-sub muted">{fmt(s.createdAt)}</div>
                </div>
                <div className="backup-ops">
                  <button className="btn sm" onClick={() => onRestore(s.key)} disabled={busy}>
                    恢复
                  </button>
                  <button
                    className="btn sm danger"
                    onClick={() => onRemove(s.key)}
                    disabled={busy}
                    title="删除该快照"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="backup-section">
        <div className="backup-title">当前状态</div>
        <div className="backup-note muted">
          本机客户 <b>{customers.length}</b> 条 · 快照 <b>{snaps.length}</b> 份
        </div>
      </div>
    </div>
  )
}
