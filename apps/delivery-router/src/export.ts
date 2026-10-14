// 优化结果导出：CSV（Excel 友好）与打印配送单
import { formatDistance, formatDuration } from './geo'
import type { Customer, Depot, OptimizeResult } from './types'

/** 单个导出行的展平数据 */
interface Row {
  no: number
  name: string
  phone: string
  address: string
  note: string
  fromName: string
  segDistance: number // 米
  segDuration: number // 秒
  cumDistance: number // 米
  cumDuration: number // 秒
  status: string
}

/** 把优化结果展平为有序导出行（含起点作为第 0 行） */
function flatten(result: OptimizeResult, customers: Customer[], depot: Depot | null): Row[] {
  const stops = result.order.map((i) => customers[i])
  const rows: Row[] = []
  let cumD = 0
  let cumT = 0
  // 起点行
  if (depot) {
    rows.push({
      no: 0,
      name: depot.name,
      phone: '',
      address: depot.address,
      note: '配送起点',
      fromName: '—',
      segDistance: 0,
      segDuration: 0,
      cumDistance: 0,
      cumDuration: 0,
      status: '起点',
    })
  }
  stops.forEach((c, idx) => {
    const seg = result.segments[idx]
    cumD += seg?.distance ?? 0
    cumT += seg?.duration ?? 0
    rows.push({
      no: idx + 1,
      name: c.name,
      phone: c.phone ?? '',
      address: c.address,
      note: c.note ?? '',
      fromName: seg?.fromName ?? (depot?.name ?? '—'),
      segDistance: seg?.distance ?? 0,
      segDuration: seg?.duration ?? 0,
      cumDistance: cumD,
      cumDuration: cumT,
      status: c.visited ? '已送达' : '待配送',
    })
  })
  return rows
}

function csvCell(v: string | number): string {
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** 导出为 CSV（带 BOM，Excel 直接识别中文），触发浏览器下载 */
export function exportCSV(result: OptimizeResult, customers: Customer[], depot: Depot | null): void {
  const rows = flatten(result, customers, depot)
  const headers = [
    '序号',
    '客户名称',
    '电话',
    '地址',
    '备注',
    '上一站',
    '距上一站',
    '本段预计',
    '累计里程',
    '累计预计',
    '状态',
  ]
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.no === 0 ? '起' : r.no,
        r.name,
        r.phone,
        r.address,
        r.note,
        r.fromName,
        formatDistance(r.segDistance),
        formatDuration(r.segDuration),
        formatDistance(r.cumDistance),
        formatDuration(r.cumDuration),
        r.status,
      ]
        .map(csvCell)
        .join(','),
    ),
  ]
  // BOM 确保 Excel 以 UTF-8 打开不出现乱码
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `配送路线_${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 同上：延迟撤销，避免部分浏览器把刚触发的下载取消
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** 打印配送单：新窗口渲染友好表格并唤起打印对话框 */
export function printDeliverySheet(result: OptimizeResult, customers: Customer[], depot: Depot | null): void {
  const rows = flatten(result, customers, depot)
  const now = new Date()
  const stamp = now.toLocaleString('zh-CN')
  const modeLabel = result.mode === 'route' ? '路线最优' : '按距离排序'

  const body = rows
    .map((r) => {
      const noCell = r.no === 0 ? '起' : r.no
      const signCell =
        r.status === '已送达' ? '☑' : r.status === '起点' ? '◆' : '☐'
      return `<tr class="${r.status === '已送达' ? 'done' : ''}">
        <td class="no">${noCell}</td>
        <td class="name">${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.phone)}</td>
        <td class="addr">${escapeHtml(r.address)}</td>
        <td>${escapeHtml(r.note)}</td>
        <td class="num">${r.no === 0 ? '—' : formatDistance(r.segDistance)}</td>
        <td class="num">${r.no === 0 ? '—' : formatDuration(r.segDuration)}</td>
        <td class="num">${formatDistance(r.cumDistance)}</td>
        <td class="sign">${signCell}</td>
      </tr>`
    })
    .join('')

  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8" />
<title>配送路线单</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #1f2329; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 14px; }
  .meta b { color: #1f2329; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #d0d3d9; padding: 7px 9px; text-align: left; vertical-align: top; }
  thead th { background: #f2f3f5; font-weight: 600; }
  .no { width: 38px; text-align: center; font-weight: 700; }
  .name { font-weight: 600; min-width: 110px; }
  .addr { min-width: 200px; }
  .num { text-align: right; white-space: nowrap; }
  .sign { width: 44px; text-align: center; font-size: 16px; }
  tr.done td { color: #999; text-decoration: line-through; }
  tr.done .name { text-decoration: none; }
  @media print { body { margin: 12mm; } .noprint { display: none; } }
</style></head>
<body>
  <h1>商品配送路线单</h1>
  <div class="meta">
    生成时间：<b>${stamp}</b> ｜ 优化模式：<b>${modeLabel}</b> ｜ 起点：<b>${escapeHtml(
      depot?.name ?? '—',
    )}</b><br/>
    站点数：<b>${result.order.length}</b> ｜ 总里程：<b>${formatDistance(
      result.totalDistance,
    )}</b> ｜ 预计总时长：<b>${formatDuration(result.totalDuration)}</b>
  </div>
  <table>
    <thead><tr>
      <th class="no">序</th><th>客户</th><th>电话</th><th>地址</th><th>备注</th>
      <th class="num">距上站</th><th class="num">本段</th><th class="num">累计里程</th><th class="sign">达</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="noprint" style="margin-top:18px;">
    <button onclick="window.print()" style="padding:8px 18px;font-size:14px;cursor:pointer;">打印 / 另存为 PDF</button>
  </div>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) {
    alert('浏览器拦截了打印窗口，请允许弹出窗口后重试。')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  // 等渲染完成后自动唤起打印（用户也可手动点按钮）
  w.focus()
  setTimeout(() => w.print(), 350)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
