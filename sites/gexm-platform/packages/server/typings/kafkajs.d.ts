declare module 'kafkajs' {
  export class Kafka {
    constructor(options: {
      clientId: string
      brokers: string[]
      connectionTimeout?: number
      requestTimeout?: number
    })

    producer(): Producer
    consumer(options: { groupId: string }): Consumer
    admin(): Admin
  }

  interface Producer {
    connect(): Promise<void>
    send(options: { topic: string; messages: Array<{ value: string; key?: string; timestamp?: string }> }): Promise<{ topicName: string; partition: number; offset: string }[]>
    disconnect(): Promise<void>
  }

  interface Consumer {
    connect(): Promise<void>
    subscribe(options: { topic: string; fromBeginning?: boolean }): Promise<void>
    run(options: { eachMessage: (payload: { topic: string; partition: number; message: { value: Buffer; key?: Buffer; timestamp?: string } }) => Promise<void> }): Promise<void>
    disconnect(): Promise<void>
  }

  interface Admin {
    createTopics(options: { topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }> }): Promise<void>
    disconnect(): Promise<void>
  }
}