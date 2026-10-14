import { useMemo, useRef, useState } from 'react'
import { useStore, isValidCoord } from '../store'
import { geocode } from '../geocode'
import { inputTips, type AddressTip } from '../addresstips'
import type { Customer } from '../types'

interface EditForm {
  id?: string
  name: string
  phone: string
  address: string
  lat: string
  lng: string
  note: string
}

const empty = (): EditForm => ({ name: '', phone: '', address: '', lat: '', lng: '', note: '' })

export default function AddressManager() {
  const customers = useStore((s) => s.customers)
  const addCustomer = useStore((s) => s.addCustomer)
  const updateCustomer = useStore((s) => s.updateCustomer)
  const removeCustomer = useStore((s) => s.removeCustomer)
  const removeMany = useStore((s) => s.removeMany)
  const clearAll = useStore((s) => s.clearAll)

  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<EditForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  // 地址输入提示（联想补全）
  const [tips, setTips] = useState<AddressTip[]>([])
  const tipTimer = useRef<number | null>(null)
  const tipAbort = useRef<AbortController | null>(null)

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    const list = kw
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(kw) ||
            (c.phone || '').includes(kw) ||
            c.address.toLowerCase().includes(kw),
        )
      : customers
    return list
  }, [customers, q])

  const orderOf = (id: string) => customers.find((c) => c.id === id)?.order

  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  /** 地址输入时做 300ms 防抖联想 */
  function onAddressInput(v: string) {
    if (!editing) return
    setEditing({ ...editing, address: v })
    if (tipTimer.current) window.clearTimeout(tipTimer.current)
    const kw = v.trim()
    if (kw.length < 2) {
      setTips([])
      return
    }
    tipTimer.current = window.setTimeout(async () => {
      tipAbort.current?.abort()
      const ac = new AbortController()
      tipAbort.current = ac
      try {
        const r = await inputTips(kw, useStore.getState().settings, undefined, ac.signal)
        setTips(r.slice(0, 8))
      } catch {
        // 取消上一次请求 / 网络异常都不得冒泡成 unhandled rejection，联想失败也不该影响输入
        setTips([])
      }
    }, 300)
  }

  /** 选中联想项：回填地址，有坐标时一并写入经纬度 */
  function pickTip(t: AddressTip) {
    if (!editing) return
    const addr = t.address || [t.district, t.name].filter(Boolean).join('')
    setEditing({
      ...editing,
      address: addr || t.name,
      name: editing.name || t.name,
      lat: t.location ? String(t.location[0]) : editing.lat,
      lng: t.location ? String(t.location[1]) : editing.lng,
    })
    setTips([])
  }

  function openAdd() {
    setEditing(empty())
    setTips([])
    setMsg('')
  }
  function openEdit(c: Customer) {
    setEditing({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      address: c.address,
      lat: String(c.lat),
      lng: String(c.lng),
      note: c.note || '',
    })
    setMsg('')
  }

  async function save() {
    if (!editing) return
    if (!editing.name.trim() && !editing.address.trim()) {
      setMsg('请填写名称或地址')
      return
    }
    const lat = parseFloat(editing.lat)
    const lng = parseFloat(editing.lng)
    let coords = isValidCoord(lat, lng) ? { lat, lng } : null
    setBusy(true)
    setMsg('')
    try {
      if (!coords && editing.address.trim()) {
        const g = await geocode(editing.address, useStore.getState().settings)
        if (g) coords = g
      }
      const payload = {
        name: editing.name.trim() || '未命名客户',
        phone: editing.phone.trim() || undefined,
        address: editing.address.trim(),
        lat: coords?.lat ?? 0,
        lng: coords?.lng ?? 0,
        note: editing.note.trim() || undefined,
        geocoded: !!coords,
      }
      if (editing.id) {
        await updateCustomer(editing.id, payload)
      } else {
        await addCustomer(payload)
      }
      setEditing(null)
      if (!coords) setMsg('已保存，但地址未能定位（无坐标，不参与路线计算）')
    } finally {
      setBusy(false)
    }
  }

  async function batchDelete() {
    if (!sel.size) return
    if (!confirm(`确认删除选中的 ${sel.size} 条地址？`)) return
    await removeMany([...sel])
    setSel(new Set())
  }

  async function clear() {
    if (!confirm('确认清空全部客户地址？此操作不可撤销。')) return
    await clearAll()
    setSel(new Set())
  }

  return (
    <div className="panel addr-panel">
      <div className="panel-head">
        <h3>客户地址（{customers.length}）</h3>
        <div className="row">
          <input
            className="search"
            placeholder="搜索名称/电话/地址"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn primary" onClick={openAdd}>
            + 添加
          </button>
        </div>
        <div className="row sub">
          <span className="muted">{sel.size} 项已选</span>
          <button className="btn sm" disabled={!sel.size} onClick={batchDelete}>
            删除选中
          </button>
          <button className="btn sm danger" disabled={!customers.length} onClick={clear}>
            清空
          </button>
        </div>
      </div>

      <div className="addr-list">
        {filtered.length === 0 && <div className="empty">暂无地址数据，点击「添加」或顶部「批量导入」。</div>}
        {filtered.map((c) => {
          const order = orderOf(c.id)
          const located = isValidCoord(c.lat, c.lng)
          return (
            <div key={c.id} className={`addr-item ${c.visited ? 'visited' : ''}`}>
              <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} />
              {order ? <span className="order-badge">{order}</span> : null}
              <div className="addr-main">
                <div className="addr-name">
                  {c.name}
                  {!located && <span className="tag warn">未定位</span>}
                  {c.visited && <span className="tag ok">已送达</span>}
                </div>
                <div className="addr-sub">
                  {c.phone && <span>{c.phone} · </span>}
                  <span className="muted">{c.address}</span>
                </div>
              </div>
              <div className="addr-ops">
                <button className="btn sm" onClick={() => openEdit(c)}>
                  编辑
                </button>
                <button className="btn sm danger" onClick={() => removeCustomer(c.id)}>
                  删
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {msg && <div className="hint">{msg}</div>}

      {editing && (
        <div className="modal-mask" onClick={() => !busy && setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.id ? '编辑地址' : '添加地址'}</h3>
            <label>
              名称*
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label>
              电话
              <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </label>
            <label className="tip-wrap">
              地址（输入自动联想，留空经纬度时将自动地理编码）
              <input
                value={editing.address}
                autoComplete="off"
                placeholder="输入关键词，如「朝阳区阜通东大街」"
                onChange={(e) => onAddressInput(e.target.value)}
                onBlur={() => window.setTimeout(() => setTips([]), 150)}
              />
              {tips.length > 0 && (
                <ul className="tip-list">
                  {tips.map((t) => (
                    <li key={t.id} onMouseDown={(e) => { e.preventDefault(); pickTip(t) }}>
                      <b>{t.name}</b>
                      <span className="muted">{t.district || t.address}</span>
                    </li>
                  ))}
                </ul>
              )}
            </label>
            <div className="row">
              <label className="half">
                纬度 lat
                <input value={editing.lat} onChange={(e) => setEditing({ ...editing, lat: e.target.value })} placeholder="如 39.9" />
              </label>
              <label className="half">
                经度 lng
                <input value={editing.lng} onChange={(e) => setEditing({ ...editing, lng: e.target.value })} placeholder="如 116.4" />
              </label>
            </div>
            <label>
              备注
              <input value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
            </label>
            {msg && <div className="hint">{msg}</div>}
            <div className="modal-ops">
              <button className="btn" disabled={busy} onClick={() => setEditing(null)}>
                取消
              </button>
              <button className="btn primary" disabled={busy} onClick={save}>
                {busy ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
