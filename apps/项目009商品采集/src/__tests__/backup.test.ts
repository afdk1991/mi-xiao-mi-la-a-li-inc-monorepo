// 备份与恢复单元测试。
// 只覆盖纯逻辑：备份文件解析与校验、数据指纹、凭证剔除法。
// 涉及 IndexedDB / localStorage 的读写放在浏览器侧手工验证。

import { describe, it, expect } from 'vitest'
import {
  BACKUP_SCHEMA,
  dataSignature,
  parseBackup,
  sanitizeLsValue,
  type BackupPayload,
} from '../backup'
import type { Customer, Depot } from '../types'

function mkPayload(): BackupPayload {
  const customers: Customer[] = [
    {
      id: 'c1',
      name: '张三',
      address: '北京市朝阳区xx路1号',
      lat: 39.9,
      lng: 116.4,
      geocoded: true,
      visited: false,
      createdAt: 1,
    },
  ]
  return {
    schema: BACKUP_SCHEMA,
    app: 'delivery-router',
    appVersion: '1.0.0',
    createdAt: 1759000000000,
    customers,
    tracks: [],
    depot: { name: '仓库', address: '起点', lat: 39.9, lng: 116.4 },
    settings: { service: 'amap', amapPref: 'auto', proxy: '/api/map' },
    keysExcluded: true,
    localStorage: { 'delivery.routeOptions': '{"roadNetwork":true}' },
  }
}

describe('parseBackup', () => {
  it('能反序列化本应用导出的备份', () => {
    const p = parseBackup(JSON.stringify(mkPayload()))
    expect(p.app).toBe('delivery-router')
    expect(p.customers).toHaveLength(1)
    expect(p.depot?.name).toBe('仓库')
    expect(p.localStorage['delivery.routeOptions']).toContain('roadNetwork')
  })

  it('非 JSON 文本报可读错误', () => {
    expect(() => parseBackup('not json')).toThrow(/合法 JSON/)
  })

  it('其他应用的文件被拒绝', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'other', customers: [] }))).toThrow(
      /不是配送定位系统的备份文件/,
    )
  })

  it('缺少客户数据被拒绝', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'delivery-router' }))).toThrow(/缺少客户数据/)
  })

  it('过滤掉结构非法的客户与轨迹记录', () => {
    const raw = {
      app: 'delivery-router',
      customers: [{ id: 'ok', address: 'a' }, { foo: 1 }, null],
      tracks: [{ id: 't1', original: [] }, { id: 't2' }],
    }
    const p = parseBackup(JSON.stringify(raw))
    expect(p.customers).toHaveLength(1)
    expect(p.tracks).toHaveLength(1)
  })

  it('备份结构内不含任何凭证字段', () => {
    const p = parseBackup(JSON.stringify(mkPayload()))
    expect(Object.keys(p)).not.toContain('keys')
    expect(Object.keys(p.settings ?? {})).not.toContain('keys')
  })

  it('localStorage 里嵌的地图 Key 也被剔除（备份文件可分享，不能带凭证）', () => {
    const payload = mkPayload()
    payload.localStorage['delivery.mapSettings'] = JSON.stringify({
      service: 'amap',
      keys: { amap: 'SECRET-JS-KEY', amapWeb: 'SECRET-WEB-KEY' },
    })
    const p = parseBackup(JSON.stringify(payload))
    const raw = p.localStorage['delivery.mapSettings'] ?? ''
    expect(raw).not.toContain('SECRET-JS-KEY')
    expect(raw).not.toContain('SECRET-WEB-KEY')
    // 字段保留但全部清空（保持结构完整，避免读取时被判为缺失）
    const keys = JSON.parse(raw).keys
    expect(Object.values(keys).every((v) => v === '')).toBe(true)
  })
})

describe('sanitizeLsValue', () => {
  it('地图设置键的 keys 被清空，其余字段保留', () => {
    const out = sanitizeLsValue(
      'delivery.mapSettings',
      JSON.stringify({ service: 'tencent', amapPref: 'web', proxy: '/api/map', keys: { tencent: 'K' } }),
    )
    const o = JSON.parse(out)
    expect(o.service).toBe('tencent')
    expect(o.amapPref).toBe('web')
    expect(o.proxy).toBe('/api/map')
    expect(Object.values(o.keys).every((v: unknown) => v === '')).toBe(true)
  })

  it('非地图设置键原样返回', () => {
    const v = '{"roadNetwork":true}'
    expect(sanitizeLsValue('delivery.routeOptions', v)).toBe(v)
  })

  it('无法解析的地图设置直接丢弃（宁可不迁移，也不带出无法校验的内容）', () => {
    expect(sanitizeLsValue('delivery.mapSettings', '{broken')).toBe('')
  })
})

describe('dataSignature', () => {
  const depot: Depot = { name: '仓', address: '', lat: 1, lng: 2 }

  it('数据未变化时指纹一致', () => {
    const cs = [mkPayload().customers[0]]
    expect(dataSignature(cs, depot)).toBe(dataSignature([{ ...cs[0] }], depot))
  })

  it('送达状态变化会改变指纹', () => {
    const cs = [mkPayload().customers[0]]
    const after = [{ ...cs[0], visited: true }]
    expect(dataSignature(cs, depot)).not.toBe(dataSignature(after, depot))
  })

  it('新增客户会改变指纹', () => {
    const cs = [mkPayload().customers[0]]
    const after = [cs[0], { ...cs[0], id: 'c2' }]
    expect(dataSignature(cs, depot)).not.toBe(dataSignature(after, depot))
  })
})
