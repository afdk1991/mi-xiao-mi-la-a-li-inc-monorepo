import queueService from './queueService'
import { queueNames } from '../config/queue'

describe('Queue Service Integration Tests', () => {
  beforeAll(async () => {
    await queueService.init()
  })

  afterAll(async () => {
    await queueService.shutdown()
  })

  beforeEach(() => {
    queueService.resetStats()
  })

  describe('publish and subscribe', () => {
    it('should publish and receive a message', async () => {
      const queue = queueNames.ORDER_CREATED
      const testPayload = { orderId: 'test-order-123', amount: 99.99 }
      let receivedMessage: unknown = null

      const handler = jest.fn().mockImplementation((msg) => {
        receivedMessage = msg.payload
      })

      await queueService.subscribe(queue, handler)

      await queueService.publish(queue, testPayload)

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(handler).toHaveBeenCalled()
      expect(receivedMessage).toEqual(testPayload)
    })

    it('should publish message with priority', async () => {
      const queue = queueNames.PAYMENT_NOTIFY
      const testPayload = { paymentId: 'test-payment-456' }

      await queueService.publish(queue, testPayload, { priority: 5 })

      const stats = queueService.getStats()
      expect(stats.messagesSent).toBe(1)
    })

    it('should publish message with TTL', async () => {
      const queue = queueNames.NOTIFICATION_SEND
      const testPayload = { userId: 'user-1', message: 'hello' }

      await queueService.publish(queue, testPayload, { ttl: 1000 })

      const stats = queueService.getStats()
      expect(stats.messagesSent).toBe(1)
    })

    it('should handle multiple subscribers for the same queue', async () => {
      const queue = queueNames.ORDER_CREATED
      const testPayload = { orderId: 'test-order-multi' }
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      await queueService.subscribe(queue, handler1)
      await queueService.subscribe(queue, handler2)

      await queueService.publish(queue, testPayload)

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('should handle multiple messages sequentially', async () => {
      const queue = queueNames.ORDER_CREATED
      const handler = jest.fn()

      await queueService.subscribe(queue, handler)

      await queueService.publish(queue, { id: 1 })
      await queueService.publish(queue, { id: 2 })
      await queueService.publish(queue, { id: 3 })

      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(handler).toHaveBeenCalledTimes(3)
    })
  })

  describe('message retry mechanism', () => {
    it('should retry failed messages', async () => {
      const queue = queueNames.ORDER_CREATED
      let callCount = 0

      const failingHandler = jest.fn().mockImplementation(() => {
        callCount++
        if (callCount <= 1) {
          throw new Error('Intentional failure')
        }
      })

      await queueService.subscribe(queue, failingHandler)

      await queueService.publish(queue, { test: 'retry' })

      // 重试延迟为 1000ms（RETRY_DELAYS[0]），需等待足够时间让重试执行
      await new Promise((resolve) => setTimeout(resolve, 3000))

      expect(callCount).toBeGreaterThan(1)
    })

    it('should move message to dead letter queue after max retries', async () => {
      const queue = queueNames.ORDER_CREATED
      let callCount = 0

      const alwaysFailingHandler = jest.fn().mockImplementation(() => {
        callCount++
        throw new Error('Always failing')
      })

      await queueService.subscribe(queue, alwaysFailingHandler)

      await queueService.publish(queue, { test: 'dead-letter' })

      // 重试延迟为 1000ms（RETRY_DELAYS[0]），需等待足够时间让至少一次重试执行
      await new Promise((resolve) => setTimeout(resolve, 3000))

      expect(callCount).toBeGreaterThan(1)
    })
  })
})
