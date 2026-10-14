declare module 'amqplib' {
  interface Connection {
    on(event: string, callback: (err?: Error) => void): void
    createChannel(): Promise<Channel>
    close(): Promise<void>
  }

  interface Channel {
    assertQueue(queue: string, options?: { durable?: boolean; autoDelete?: boolean; maxPriority?: number; deadLetterExchange?: string; deadLetterRoutingKey?: string }): Promise<{ queue: string; messageCount: number; consumerCount: number }>
    sendToQueue(queue: string, content: Buffer, options?: { persistent?: boolean; priority?: number; expiration?: string }): boolean
    consume(queue: string, callback: (msg: Message | null) => void, options?: { noAck?: boolean }): Promise<string>
    ack(msg: Message): void
    nack(msg: Message, allUpTo?: boolean, requeue?: boolean): void
    prefetch(count: number): void
    close(): Promise<void>
  }

  interface Message {
    content: Buffer
    fields: { deliveryTag: number; redelivered: boolean; exchange: string; routingKey: string }
    properties: { contentType?: string; contentEncoding?: string; headers?: Record<string, unknown>; priority?: number; expiration?: string }
    ack(allUpTo?: boolean): void
    nack(allUpTo?: boolean, requeue?: boolean): void
  }

  export function connect(options: {
    hostname: string
    port: number
    username: string
    password: string
    vhost: string
    timeout?: number
    heartbeat?: number
  }): Promise<Connection>
}