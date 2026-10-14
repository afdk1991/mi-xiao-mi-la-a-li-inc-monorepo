import { getDb, closeDb } from '../models'
import userModel from '../models/userModel'
import memberModel from '../models/memberModel'

describe('Member Controller', () => {
  let db: ReturnType<typeof getDb>

  afterAll(() => {
    closeDb()
  })

  describe('Member Model Integration', () => {
    let testUserId: string

    beforeEach(async () => {
      db = getDb()

      db.prepare('DELETE FROM point_logs').run()
      db.prepare('DELETE FROM user_points').run()
      db.prepare('DELETE FROM member_levels').run()

      const username = `test_member_user_${Date.now()}`
      const user = await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })
      testUserId = user.id

      memberModel.initializeLevels()
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM point_logs WHERE user_id = ?').run(testUserId)
        db.prepare('DELETE FROM user_points WHERE user_id = ?').run(testUserId)
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      } catch {}
    })

    it('should get user points for new user', () => {
      const userPoints = memberModel.getUserPoints(testUserId)
      expect(userPoints).toBeDefined()
      expect(userPoints?.balance).toBe(0)
      expect(userPoints?.total_earned).toBe(0)
      expect(userPoints?.total_spent).toBe(0)
      expect(userPoints?.level_id).toBe('LVL1')
    })

    it('should earn points successfully', () => {
      const result = memberModel.earnPoints(testUserId, 100, '测试积分')
      expect(result.balance).toBe(100)
      expect(result.type).toBe('earn')
      expect(result.reason).toBe('测试积分')
    })

    it('should spend points successfully', () => {
      memberModel.earnPoints(testUserId, 200, '充值')
      const result = memberModel.spendPoints(testUserId, 150, '消费')
      expect(result.balance).toBe(50)
      expect(result.type).toBe('spend')
    })

    it('should throw error when spending more points than balance', () => {
      expect(() => {
        memberModel.spendPoints(testUserId, 100, '消费')
      }).toThrow('积分不足')
    })

    it('should calculate level correctly', () => {
      const level = memberModel.calculateLevel(1500)
      expect(level.min_points).toBeLessThanOrEqual(1500)
      expect(level.name).toBeDefined()
    })

    it('should find all levels', () => {
      const levels = memberModel.findAllLevels()
      expect(levels.length).toBeGreaterThanOrEqual(4)
      expect(levels[0].id).toBe('LVL1')
    })

    it('should find level by id', () => {
      const level = memberModel.findLevelById('LVL2')
      expect(level).toBeDefined()
      expect(level?.name).toBe('白银会员')
    })

    it('should update level', () => {
      const updated = memberModel.updateLevel('LVL1', { name: '初级会员' })
      expect(updated?.name).toBe('初级会员')
    })

    it('should find point logs', () => {
      memberModel.earnPoints(testUserId, 100, '充值')
      memberModel.spendPoints(testUserId, 50, '消费')

      const result = memberModel.findPointLogs(testUserId)
      expect(result.total).toBe(2)
      expect(result.data.length).toBe(2)
    })

    it('should find point logs filtered by type', () => {
      memberModel.earnPoints(testUserId, 100, '充值')
      memberModel.spendPoints(testUserId, 50, '消费')

      const earnLogs = memberModel.findPointLogs(testUserId, 1, 20, 'earn')
      expect(earnLogs.total).toBe(1)

      const spendLogs = memberModel.findPointLogs(testUserId, 1, 20, 'spend')
      expect(spendLogs.total).toBe(1)
    })

    it('should admin adjust points positively', () => {
      const result = memberModel.adminAdjustPoints(testUserId, 500, '管理员奖励')
      expect(result.balance).toBe(500)
      expect(result.type).toBe('earn')
    })

    it('should admin adjust points negatively', () => {
      memberModel.earnPoints(testUserId, 500, '充值')
      const result = memberModel.adminAdjustPoints(testUserId, -200, '扣除违规积分')
      expect(result.balance).toBe(300)
      expect(result.type).toBe('spend')
    })

    it('should admin get member', () => {
      const member = memberModel.adminGetMember(testUserId)
      expect(member).toBeDefined()
      expect(member?.user_id).toBe(testUserId)
    })

    it('should admin list members', () => {
      const result = memberModel.adminListMembers(1, 20)
      expect(result).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })
  })
})
