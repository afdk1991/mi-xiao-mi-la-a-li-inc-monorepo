import queueConfig from '../config/queue'
import { queueNames } from '../config/queue'
import logger from '../utils/logger'

interface Message {
  id: string
  queue: string
  payload: unknown
  timestamp: number
  retryCount: number
}

interface ConsumerHandler {
  (message: Message): Promise<void>
}

interface QueueStats {
  messagesSent: number
  messagesReceived: number
  messagesProcessed: number
  messagesFailed: number
  messagesRetried: number
  messagesDeadLettered: number
  activeConsumers: number
}

const stats: QueueStats = {
  messagesSent: 0,
  messagesReceived: 0,
  messagesProcessed: 0,
  messagesFailed: 0,
  messagesRetried: 0,
  messagesDeadLettered: 0,
  activeConsumers: 0,
}

// 已处理消息 ID 集合（用于幂等性检查）
const processedMessageIds: Set<string> = new Set()
const MAX_PROCESSED_IDS = 10000

// 指数退避延迟表（毫秒）：第 1 次重试 1s，第 2 次 5s，第 3 次 30s
const RETRY_DELAYS = [1000, 5000, 30000]

const memoryQueue: Map<string, Message[]> = new Map()
const consumerHandlers: Map<string, ConsumerHandler[]> = new Map()
let consumerTimer: NodeJS.Timeout | null = null

interface RabbitMQChannel {
  assertQueue: (queue: string, options?: unknown) => Promise<unknown>
  sendToQueue: (queue: string, content: Buffer, options?: unknown) => boolean
  consume: (queue: string, callback: (msg: unknown) => void) => Promise<unknown>
  close: () => Promise<void>
}

interface KafkaProducer {
  connect: () => Promise<void>
  send: (record: unknown) => Promise<unknown>
  disconnect: () => Promise<void>
}

interface KafkaConsumer {
  connect: () => Promise<void>
  subscribe: (options: { topic: string; fromBeginning: boolean }) => Promise<void>
  run: (config: unknown) => Promise<void>
  disconnect: () => Promise<void>
}

let rabbitmqChannel: RabbitMQChannel | null = null
let kafkaProducer: KafkaProducer | null = null
let kafkaConsumer: KafkaConsumer | null = null

async function initRabbitMQ(): Promise<boolean> {
  if (!queueConfig.rabbitmq.enabled || queueConfig.type !== 'rabbitmq') {
    return false
  }

  try {
    const { host, port, username, password, virtualHost, connectionTimeout, heartbeat } =
      queueConfig.rabbitmq

    const amqp = await (import('amqplib') as Promise<unknown>).catch(() => null)
    if (!amqp) {
      logger.warn('amqplib not installed, skipping RabbitMQ initialization')
      return false
    }

    const connect = (amqp as { connect: (options: unknown) => Promise<unknown> }).connect
    const connection = await connect({
      hostname: host,
      port,
      username,
      password,
      vhost: virtualHost,
      timeout: connectionTimeout,
      heartbeat,
    })

    const conn = connection as {
      on: (event: string, callback: (err: Error) => void) => void
      createChannel: () => Promise<unknown>
    }

    conn.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error:', err.message)
    })

    conn.on('close', () => {
      logger.warn('RabbitMQ connection closed')
      rabbitmqChannel = null
    })

    rabbitmqChannel = (await conn.createChannel()) as RabbitMQChannel
    logger.info('RabbitMQ channel created successfully')

    for (const queue of Object.values(queueNames)) {
      await rabbitmqChannel.assertQueue(queue, {
        durable: true,
        autoDelete: false,
        maxPriority: 10,
      })
    }

    return true
  } catch (error) {
    logger.error('RabbitMQ initialization failed:', (error as Error).message)
    return false
  }
}

async function initKafka(): Promise<boolean> {
  if (!queueConfig.kafka.enabled || queueConfig.type !== 'kafka') {
    return false
  }

  try {
    const kafkajs = await (import('kafkajs') as Promise<unknown>).catch(() => null)
    if (!kafkajs) {
      logger.warn('kafkajs not installed, skipping Kafka initialization')
      return false
    }

    const KafkaClass = (kafkajs as { Kafka: new (options: unknown) => unknown }).Kafka

    const kafka = new KafkaClass({
      clientId: queueConfig.kafka.clientId,
      brokers: queueConfig.kafka.brokers,
      connectionTimeout: queueConfig.kafka.connectionTimeout,
      requestTimeout: queueConfig.kafka.requestTimeout,
    })

    const kafkaInstance = kafka as {
      producer: () => unknown
      consumer: (options: { groupId: string }) => unknown
    }

    kafkaProducer = kafkaInstance.producer() as KafkaProducer
    await kafkaProducer.connect()
    logger.info('Kafka producer connected')

    kafkaConsumer = kafkaInstance.consumer({ groupId: 'gexm-group' }) as KafkaConsumer
    await kafkaConsumer.connect()
    logger.info('Kafka consumer connected')

    for (const topic of Object.values(queueNames)) {
      await kafkaConsumer.subscribe({ topic, fromBeginning: false })
    }

    return true
  } catch (error) {
    logger.error('Kafka initialization failed:', (error as Error).message)
    return false
  }
}

function initMemoryQueue(): void {
  consumerTimer = setInterval(async () => {
    for (const [queue, messages] of memoryQueue.entries()) {
      const handlers = consumerHandlers.get(queue) || []
      if (handlers.length === 0 || messages.length === 0) {
        continue
      }

      const message = messages.shift()
      if (!message) {
        continue
      }

      stats.messagesReceived++

      // 幂等性检查：跳过已处理的消息
      if (processedMessageIds.has(message.id)) {
        logger.debug(`跳过已处理的消息 [${queue}]: ${message.id}`)
        continue
      }

      let handlerFailed = false
      for (const handler of handlers) {
        try {
          await handler(message)
          stats.messagesProcessed++
        } catch (error) {
          handlerFailed = true
          stats.messagesFailed++
          logger.error(
            `Queue handler error [${queue}], msgId=${message.id}, retry=${message.retryCount}:`,
            (error as Error).message
          )

          if (message.retryCount < queueConfig.maxRetries) {
            message.retryCount++
            stats.messagesRetried++

            // 指数退避：延迟后重新入队
            const delayIndex = Math.min(message.retryCount - 1, RETRY_DELAYS.length - 1)
            const delay = RETRY_DELAYS[delayIndex]
            logger.info(
              `消息将在 ${delay}ms 后重试 [${queue}], msgId=${message.id}, 第 ${message.retryCount} 次重试`
            )
            setTimeout(() => {
              messages.push(message)
            }, delay)
          } else if (queueConfig.deadLetterEnabled) {
            stats.messagesDeadLettered++
            logger.warn(
              `消息超过最大重试次数，进入死信队列 [${queue}], msgId=${message.id}, retryCount=${message.retryCount}`
            )
            const deadLetter = memoryQueue.get(queueConfig.deadLetterQueue) || []
            deadLetter.push(message)
            memoryQueue.set(queueConfig.deadLetterQueue, deadLetter)
            checkDeadLetterAlert()
          }
          break
        }
      }

      // 只有所有 handler 都成功，才标记为已处理（避免部分成功阻止重试）
      if (!handlerFailed) {
        processedMessageIds.add(message.id)
        if (processedMessageIds.size > MAX_PROCESSED_IDS) {
          const firstId = processedMessageIds.values().next().value
          if (firstId) {
            processedMessageIds.delete(firstId)
          }
        }
      }
    }
  }, 100)
}

async function publish(
  queue: string,
  payload: unknown,
  options: { priority?: number; ttl?: number } = {}
): Promise<boolean> {
  try {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      queue,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    }

    if (queueConfig.logMessages) {
      logger.debug(`Publishing message to queue [${queue}]: ${JSON.stringify(payload)}`)
    }

    if (queueConfig.type === 'rabbitmq' && rabbitmqChannel) {
      const content = Buffer.from(JSON.stringify(message))
      const result = rabbitmqChannel.sendToQueue(queue, content, {
        persistent: true,
        priority: options.priority || 0,
        expiration: options.ttl || queueConfig.defaultTTL,
      })
      stats.messagesSent++
      return result
    }

    if (queueConfig.type === 'kafka' && kafkaProducer) {
      await kafkaProducer.send({
        topic: queue,
        messages: [{ value: JSON.stringify(message) }],
      })
      stats.messagesSent++
      return true
    }

    const messages = memoryQueue.get(queue) || []
    messages.push(message)
    memoryQueue.set(queue, messages)
    stats.messagesSent++
    return true
  } catch (error) {
    logger.error(`Failed to publish message to queue [${queue}]:`, (error as Error).message)
    return false
  }
}

async function subscribe(queue: string, handler: ConsumerHandler): Promise<void> {
  const handlers = consumerHandlers.get(queue) || []
  handlers.push(handler)
  consumerHandlers.set(queue, handlers)
  stats.activeConsumers++

  if (queueConfig.type === 'rabbitmq' && rabbitmqChannel) {
    await rabbitmqChannel.consume(queue, async (msg) => {
      if (!msg) {
        return
      }

      const content = (msg as { content: Buffer }).content.toString()
      const message = JSON.parse(content) as Message

      stats.messagesReceived++

      try {
        await handler(message)
        stats.messagesProcessed++
        const channelWithAck = rabbitmqChannel as RabbitMQChannel & {
          ack: (msg: unknown) => void
          nack: (msg: unknown, allUpTo: boolean, requeue: boolean) => void
        }
        if (channelWithAck.ack) {
          channelWithAck.ack(msg)
        }
      } catch (error) {
        stats.messagesFailed++
        logger.error(`RabbitMQ handler error [${queue}]:`, (error as Error).message)
        const channelWithNack = rabbitmqChannel as RabbitMQChannel & {
          ack: (msg: unknown) => void
          nack: (msg: unknown, allUpTo: boolean, requeue: boolean) => void
        }
        if (channelWithNack.nack) {
          channelWithNack.nack(msg, false, message.retryCount < queueConfig.rabbitmq.maxRetries)
        }
      }
    })
  }

  if (queueConfig.type === 'kafka' && kafkaConsumer) {
    await kafkaConsumer.run({
      eachMessage: async ({ topic, message }) => {
        if (topic !== queue) {
          return
        }
        const content = message.value?.toString() || ''
        const msg = JSON.parse(content) as Message

        stats.messagesReceived++

        // 幂等性检查
        if (processedMessageIds.has(msg.id)) {
          logger.debug(`Kafka: 跳过已处理的消息 [${queue}]: ${msg.id}`)
          return
        }

        try {
          await handler(msg)
          stats.messagesProcessed++
          processedMessageIds.add(msg.id)
          if (processedMessageIds.size > MAX_PROCESSED_IDS) {
            const firstId = processedMessageIds.values().next().value
            if (firstId) {
              processedMessageIds.delete(firstId)
            }
          }
        } catch (error) {
          stats.messagesFailed++
          logger.error(
            `Kafka handler error [${queue}], msgId=${msg.id}, retry=${msg.retryCount}:`,
            (error as Error).message
          )

          if (msg.retryCount < queueConfig.maxRetries) {
            msg.retryCount++
            stats.messagesRetried++
            const delayIndex = Math.min(msg.retryCount - 1, RETRY_DELAYS.length - 1)
            const delay = RETRY_DELAYS[delayIndex]
            logger.info(
              `Kafka 消息将在 ${delay}ms 后重试 [${queue}], msgId=${msg.id}, 第 ${msg.retryCount} 次重试`
            )
            setTimeout(() => {
              publish(queue, msg.payload).catch(() => {})
            }, delay)
          } else if (queueConfig.deadLetterEnabled) {
            stats.messagesDeadLettered++
            logger.warn(`Kafka 消息超过最大重试次数，进入死信队列 [${queue}], msgId=${msg.id}`)
            publish(queueConfig.deadLetterQueue, msg.payload).catch(() => {})
          }
        }
      },
    })
  }
}

function getStats(): QueueStats {
  return { ...stats }
}

/**
 * 获取死信队列中的消息
 */
function getDeadLetterMessages(): Message[] {
  return memoryQueue.get(queueConfig.deadLetterQueue) || []
}

/**
 * 重试死信队列中的消息（将消息重新放回原队列）
 */
async function retryDeadLetterMessages(queue?: string): Promise<number> {
  const deadLetters = memoryQueue.get(queueConfig.deadLetterQueue) || []
  if (deadLetters.length === 0) {
    return 0
  }

  let retried = 0
  const remaining: Message[] = []

  for (const msg of deadLetters) {
    const targetQueue = queue || msg.queue
    if (targetQueue) {
      msg.retryCount = 0
      const messages = memoryQueue.get(targetQueue) || []
      messages.push(msg)
      memoryQueue.set(targetQueue, messages)
      retried++
      logger.info(`死信消息重试 [${targetQueue}], msgId=${msg.id}`)
    } else {
      remaining.push(msg)
    }
  }

  memoryQueue.set(queueConfig.deadLetterQueue, remaining)
  return retried
}

/**
 * 清空死信队列
 */
function clearDeadLetterMessages(): number {
  const deadLetters = memoryQueue.get(queueConfig.deadLetterQueue) || []
  const count = deadLetters.length
  memoryQueue.set(queueConfig.deadLetterQueue, [])
  if (count > 0) {
    logger.info(`清空死信队列，共 ${count} 条消息`)
  }
  return count
}

// 死信告警阈值
const DEAD_LETTER_ALERT_THRESHOLD = 10
let lastDeadLetterAlertTime = 0
const DEAD_LETTER_ALERT_COOLDOWN = 5 * 60 * 1000 // 5 分钟告警冷却

/**
 * 检查死信队列是否达到告警阈值，达到时记录告警日志
 */
function checkDeadLetterAlert(): void {
  const deadLetters = memoryQueue.get(queueConfig.deadLetterQueue) || []
  if (deadLetters.length >= DEAD_LETTER_ALERT_THRESHOLD) {
    const now = Date.now()
    if (now - lastDeadLetterAlertTime > DEAD_LETTER_ALERT_COOLDOWN) {
      logger.error(
        `死信队列告警：当前死信消息 ${deadLetters.length} 条，已超过阈值 ${DEAD_LETTER_ALERT_THRESHOLD}，请及时处理`
      )
      lastDeadLetterAlertTime = now
    }
  }
}

interface QueueDetail {
  queue: string
  pendingCount: number
  isDeadLetter: boolean
}

/**
 * 获取所有队列详情（含待处理消息数）
 */
function getQueueDetails(): QueueDetail[] {
  const details: QueueDetail[] = []
  for (const [queue, messages] of memoryQueue.entries()) {
    details.push({
      queue,
      pendingCount: messages.length,
      isDeadLetter: queue === queueConfig.deadLetterQueue,
    })
  }
  return details
}

function resetStats(): void {
  stats.messagesSent = 0
  stats.messagesReceived = 0
  stats.messagesProcessed = 0
  stats.messagesFailed = 0
  stats.messagesRetried = 0
  stats.messagesDeadLettered = 0
  stats.activeConsumers = 0
}

async function shutdown(): Promise<void> {
  if (consumerTimer) {
    clearInterval(consumerTimer)
    consumerTimer = null
  }

  if (rabbitmqChannel) {
    try {
      await rabbitmqChannel.close()
      logger.info('RabbitMQ channel closed')
    } catch (error) {
      logger.error('RabbitMQ channel close error:', (error as Error).message)
    }
    rabbitmqChannel = null
  }

  if (kafkaProducer) {
    try {
      await kafkaProducer.disconnect()
      logger.info('Kafka producer disconnected')
    } catch (error) {
      logger.error('Kafka producer disconnect error:', (error as Error).message)
    }
    kafkaProducer = null
  }

  if (kafkaConsumer) {
    try {
      await kafkaConsumer.disconnect()
      logger.info('Kafka consumer disconnected')
    } catch (error) {
      logger.error('Kafka consumer disconnect error:', (error as Error).message)
    }
    kafkaConsumer = null
  }

  memoryQueue.clear()
  consumerHandlers.clear()
  logger.info('Message queue service shutdown completed')
}

async function init(): Promise<void> {
  if (queueConfig.type === 'rabbitmq') {
    const success = await initRabbitMQ()
    logger.info(`RabbitMQ initialized: ${success ? 'connected' : 'failed (fallback to memory)'}`)
  } else if (queueConfig.type === 'kafka') {
    const success = await initKafka()
    logger.info(`Kafka initialized: ${success ? 'connected' : 'failed (fallback to memory)'}`)
  }

  initMemoryQueue()
  logger.info(`Message queue service initialized, type: ${queueConfig.type}`)
}

const queueService = {
  init,
  shutdown,
  publish,
  subscribe,
  getStats,
  resetStats,
  getDeadLetterMessages,
  retryDeadLetterMessages,
  clearDeadLetterMessages,
  getQueueDetails,
  names: queueNames,
}

export default queueService
