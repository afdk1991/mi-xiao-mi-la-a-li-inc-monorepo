// 云同步纯逻辑单测：同步码校验/生成、API 基址推导。
// 网络往返（/api/sync）由线上验证覆盖，不在此处 mock。

import { describe, it, expect } from 'vitest'
import { isValidCode, randomCode, apiBase } from '../cloudsync'
import { DEFAULT_SETTINGS } from '../mapservice'

describe('isValidCode', () => {
  it('接受 6-16 位字母数字', () => {
    expect(isValidCode('abc123')).toBe(true)
    expect(isValidCode('ABC1234567890123')).toBe(true)
  })

  it('拒绝过短、含符号或超长', () => {
    expect(isValidCode('ab12')).toBe(false)
    expect(isValidCode('abc-123')).toBe(false)
    expect(isValidCode('a'.repeat(17))).toBe(false)
    expect(isValidCode('')).toBe(false)
  })
})

describe('randomCode', () => {
  it('生成合法且不重复的同步码', () => {
    const a = randomCode()
    const b = randomCode()
    expect(isValidCode(a)).toBe(true)
    expect(isValidCode(b)).toBe(true)
    expect(a).not.toBe(b)
    expect(a).toHaveLength(8)
  })
})

describe('apiBase', () => {
  it('/api/map 推导为 /api', () => {
    expect(apiBase({ ...DEFAULT_SETTINGS, proxy: '/api/map' })).toBe('/api')
  })
  it('绝对地址同样适用', () => {
    expect(apiBase({ ...DEFAULT_SETTINGS, proxy: 'https://x.example.com/api/map' })).toBe(
      'https://x.example.com/api',
    )
  })
  it('缺省回落 /api', () => {
    expect(apiBase({ ...DEFAULT_SETTINGS, proxy: '' })).toBe('/api')
  })
})
