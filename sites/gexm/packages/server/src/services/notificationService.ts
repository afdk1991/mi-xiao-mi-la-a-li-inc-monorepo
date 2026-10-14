import queueService from './queueService'
import { queueNames } from '../config/queue'
import logger from '../utils/logger'

interface OrderNotification {
  orderId: string
  orderNo: string
  userId: string
  status: string
  totalAmount: number
  items: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
  }>
  timestamp: number
}

interface EmailNotification {
  to: string
  subject: string
  template: string
  data: Record<string, unknown>
}

interface SMSNotification {
  phone: string
  templateCode: string
  params: Record<string, string>
}

async function sendOrderNotification(notification: OrderNotification): Promise<void> {
  await queueService.publish(queueNames.ORDER_CREATED, notification)
}

async function sendPaymentNotification(
  orderId: string,
  status: string,
  amount: number
): Promise<void> {
  await queueService.publish(queueNames.PAYMENT_NOTIFY, {
    orderId,
    status,
    amount,
    timestamp: Date.now(),
  })
}

async function sendShippingNotification(
  orderId: string,
  trackingNo: string,
  carrier: string
): Promise<void> {
  await queueService.publish(queueNames.SHIPPING_UPDATE, {
    orderId,
    trackingNo,
    carrier,
    timestamp: Date.now(),
  })
}

async function sendEmail(email: EmailNotification): Promise<void> {
  await queueService.publish(queueNames.EMAIL_SEND, email)
}

async function sendSMS(sms: SMSNotification): Promise<void> {
  await queueService.publish(queueNames.SMS_SEND, sms)
}

async function sendSystemNotification(
  userId: string,
  type: string,
  content: string,
  data?: Record<string, unknown>
): Promise<void> {
  await queueService.publish(queueNames.NOTIFICATION_SEND, {
    userId,
    type,
    content,
    data,
    timestamp: Date.now(),
  })
}

async function initNotificationHandlers(): Promise<void> {
  await queueService.subscribe(queueNames.ORDER_CREATED, async (message) => {
    const data = message.payload as OrderNotification
    logger.info(`Order created notification: ${data.orderNo}, userId: ${data.userId}`)
  })

  await queueService.subscribe(queueNames.ORDER_PAID, async (message) => {
    const data = message.payload as {
      orderId: string
      orderNo: string
      userId: string
      amount: number
    }
    logger.info(`Order paid notification: ${data.orderNo}, amount: ${data.amount}`)
  })

  await queueService.subscribe(queueNames.ORDER_SHIPPED, async (message) => {
    const data = message.payload as { orderId: string; orderNo: string; trackingNo: string }
    logger.info(`Order shipped notification: ${data.orderNo}, tracking: ${data.trackingNo}`)
  })

  await queueService.subscribe(queueNames.ORDER_COMPLETED, async (message) => {
    const data = message.payload as { orderId: string; orderNo: string; userId: string }
    logger.info(`Order completed notification: ${data.orderNo}`)
  })

  await queueService.subscribe(queueNames.PAYMENT_NOTIFY, async (message) => {
    const data = message.payload as { orderId: string; status: string; amount: number }
    logger.info(
      `Payment notification: orderId=${data.orderId}, status=${data.status}, amount=${data.amount}`
    )
  })

  await queueService.subscribe(queueNames.EMAIL_SEND, async (message) => {
    const data = message.payload as EmailNotification
    logger.info(`Email notification: to=${data.to}, subject=${data.subject}`)
  })

  await queueService.subscribe(queueNames.SMS_SEND, async (message) => {
    const data = message.payload as SMSNotification
    logger.info(`SMS notification: phone=${data.phone}, template=${data.templateCode}`)
  })

  await queueService.subscribe(queueNames.NOTIFICATION_SEND, async (message) => {
    const data = message.payload as { userId: string; type: string; content: string }
    logger.info(`System notification: userId=${data.userId}, type=${data.type}`)
  })

  logger.info('Notification handlers initialized')
}

const notificationService = {
  sendOrderNotification,
  sendPaymentNotification,
  sendShippingNotification,
  sendEmail,
  sendSMS,
  sendSystemNotification,
  initNotificationHandlers,
}

export default notificationService
