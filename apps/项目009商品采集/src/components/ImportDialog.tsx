import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { useStore } from '../store'
import type { CoordSource } from '../geocode'

/** 坐标来源选项：值对应官方坐标转换接口的 type */
const COORD_SOURCES: Array<{ value: CoordSource; label: string }> = [
  { value: 'amap', label: '高德 / 腾讯（GCJ-02）' },
  { value: 'gps', label: 'GPS / 设备原始（WGS-84）' },
  { value: 'baidu', label: '百度（BD-09）' },
  { value: 'sogou', label: '搜狗' },
  { value: 'mapbar', label: '图吧' },
]

interface Row {
  name: string
  phone?: string
  address: string
  lat?: number
  lng?: number
  note?: string
}

const SAMPLE = `name,phone,address,lat,lng,note
张三,13800000001,北京市朝阳区建国路88号,39.9088,116.4570,写字楼前台
李四,13800000002,上海市浦东新区世纪大道100号,,,
王五,,,31.2304,121.4737,仅坐标无地址`

export default function ImportDialog({ onClose }: { onClose: () => void }) {
  const importRows = useStore((s) => s.importRows)
  const importing = useStore((s) => s.importing)
  const progress = useStore((s) => s.importProgress)
  const service = useStore((s) => s.settings.service)

  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<{ added: number; failed: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // 默认按当前底图坐标系免转换：OSM=WGS-84，高德/腾讯=GCJ-02
  const [coordSource, setCoordSource] = useState<CoordSource>(service === 'osm' ? 'gps' : 'amap')

  function parse(content: string, name: string): Row[] {
    const isJson = name.toLowerCase().endsWith('.json') || content.trim().startsWith('[')
    if (isJson) {
      const arr = JSON.parse(content)
      if (!Array.isArray(arr)) throw new Error('JSON 需为对象数组')
      return arr.map((o: Record<string, unknown>) => ({
        name: String(o.name ?? ''),
        phone: o.phone ? String(o.phone) : undefined,
        address: String(o.address ?? ''),
        lat: o.lat !== undefined && o.lat !== '' ? Number(o.lat) : undefined,
        lng: o.lng !== undefined && o.lng !== '' ? Number(o.lng) : undefined,
        note: o.note ? String(o.note) : undefined,
      }))
    }
    const res = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    })
    if (res.errors.length) throw new Error('CSV 解析失败：' + res.errors[0].message)
    return res.data.map((r) => ({
      name: r.name ?? '',
      phone: r.phone || undefined,
      address: r.address ?? '',
      lat: r.lat ? Number(r.lat) : undefined,
      lng: r.lng ? Number(r.lng) : undefined,
      note: r.note || undefined,
    }))
  }

  async function run() {
    setErr('')
    setDone(null)
    let rows: Row[] = []
    try {
      if (file) {
        const content = await file.text()
        rows = parse(content, file.name)
      } else if (text.trim()) {
        rows = parse(text, 'paste.csv')
      } else {
        setErr('请粘贴数据或选择文件')
        return
      }
    } catch (e) {
      setErr('解析错误：' + (e as Error).message)
      return
    }
    if (!rows.length) {
      setErr('未解析到任何行')
      return
    }
    const cleaned = rows.map((r) => ({
      name: (r.name || '').trim(),
      phone: r.phone?.trim() || undefined,
      address: (r.address || '').trim(),
      lat: r.lat,
      lng: r.lng,
      note: r.note?.trim() || undefined,
    }))
    const res = await importRows(cleaned, coordSource)
    setDone(res)
  }

  return (
    <div className="modal-mask" onClick={importing ? undefined : onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h3>批量导入客户地址</h3>
        <p className="muted">
          支持 CSV / JSON / 直接粘贴。字段：<code>name, phone, address, lat, lng, note</code>。
          提供 <code>lat/lng</code> 则直接使用坐标；否则按 <code>address</code> 自动地理编码（需联网，逐条限速）。
        </p>

        <div className="row">
          <button className="btn" onClick={() => fileRef.current?.click()}>
            选择文件 (CSV/JSON)
          </button>
          <span className="muted">{file ? file.name : '未选择'}</span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,.txt"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard?.writeText(SAMPLE)
              setText(SAMPLE)
            }}
          >
            填入模板示例
          </button>
        </div>

        <textarea
          className="import-area"
          placeholder="或直接粘贴 CSV / JSON 文本…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
        />

        <label className="coord-src">
          坐标来源（仅对含 <code>lat/lng</code> 的行生效）
          <select value={coordSource} onChange={(e) => setCoordSource(e.target.value as CoordSource)}>
            {COORD_SOURCES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          {service === 'osm'
            ? '当前底图为 OSM（WGS-84）；选择非 GPS 来源时会自动调用官方坐标转换接口校正。'
            : '当前底图为 GCJ-02；若坐标来自 GPS / 百度 / 搜狗 / 图吧，会自动调用官方坐标转换接口校正（转换失败则原样保留，绝不丢点）。'}
        </p>

        {err && <div className="hint warn">{err}</div>}

        {importing && progress && (
          <div className="progress">
            <div className="bar" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            <span>
              地理编码中 {progress.done}/{progress.total}
              {progress.failed > 0 ? ` · ${progress.failed} 条定位失败` : ''}
            </span>
          </div>
        )}

        {done && (
          <div className="hint ok">
            导入完成：成功 {done.added} 条{done.failed > 0 ? `，定位失败 ${done.failed} 条` : ''}。
          </div>
        )}

        <div className="modal-ops">
          <button className="btn" disabled={importing} onClick={onClose}>
            关闭
          </button>
          <button className="btn primary" disabled={importing || done !== null} onClick={run}>
            {importing ? '导入中…' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  )
}
