import 'dotenv/config'

const queueNames = {
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  PAYMENT_NOTIFY: 'payment.notify',
  SHIPPING_UPDATE: 'shipping.update',
  EMAIL_SEND: 'email.send',
  SMS_SEND: 'sms.send',
  NOTIFICATION_SEND: 'notification.send',
  REFUND_REQUEST: 'refund.request',
  INVENTORY_UPDATE: 'inventory.update',
}

const queueConfig = {
  type: process.env.QUEUE_TYPE || 'memory',
  rabbitmq: {
    enabled: process.env.RABBITMQ_ENABLED === 'true',
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
    username: process.env.RABBITMQ_USERNAME || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    virtualHost: process.env.RABBITMQ_VHOST || '/',
    connectionTimeout: parseInt(process.env.RABBITMQ_CONNECTION_TIMEOUT || '5000', 10),
    heartbeat: parseInt(process.env.RABBITMQ_HEARTBEAT || '60', 10),
    prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH_COUNT || '10', 10),
    maxRetries: parseInt(process.env.RABBITMQ_MAX_RETRIES || '3', 10),
  },
  kafka: {
    enabled: process.env.KAFKA_ENABLED === 'true',
    clientId: process.env.KAFKA_CLIENT_ID || 'gexm-producer',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '10000', 10),
    requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000', 10),
  },
  queueNames,
  maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || '5000', 10),
  maxQueueSize: parseInt(process.env.QUEUE_MAX_SIZE || '10000', 10),
  deadLetterEnabled: process.env.QUEUE_DEAD_LETTER_ENABLED === 'true',
  deadLetterQueue: process.env.QUEUE_DEAD_LETTER_QUEUE || 'dead.letter',
  logMessages: process.env.QUEUE_LOG_MESSAGES !== 'false',
  defaultTTL: parseInt(process.env.QUEUE_DEFAULT_TTL || '86400000', 10),
}

export { queueConfig, queueNames }
export default queueConfig
