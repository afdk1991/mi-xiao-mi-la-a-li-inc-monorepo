type EventListener<T = any> = (data: T) => void;

interface EventSubscription {
  event: string;
  listener: EventListener;
  once: boolean;
}

export class EventBus {
  private listeners = new Map<string, EventSubscription[]>();

  on<T = any>(event: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const subscription: EventSubscription = {
      event,
      listener,
      once: false,
    };

    this.listeners.get(event)!.push(subscription);

    return () => this.off(event, listener);
  }

  once<T = any>(event: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const subscription: EventSubscription = {
      event,
      listener,
      once: true,
    };

    this.listeners.get(event)!.push(subscription);

    return () => this.off(event, listener);
  }

  off<T = any>(event: string, listener: EventListener<T>): void {
    const subscriptions = this.listeners.get(event);
    if (!subscriptions) return;

    const index = subscriptions.findIndex((sub) => sub.listener === listener);
    if (index !== -1) {
      subscriptions.splice(index, 1);
    }

    if (subscriptions.length === 0) {
      this.listeners.delete(event);
    }
  }

  emit<T = any>(event: string, data?: T): void {
    const subscriptions = this.listeners.get(event);
    if (!subscriptions) return;

    const toRemove: number[] = [];

    subscriptions.forEach((subscription, index) => {
      try {
        subscription.listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }

      if (subscription.once) {
        toRemove.push(index);
      }
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      subscriptions.splice(toRemove[i], 1);
    }

    if (subscriptions.length === 0) {
      this.listeners.delete(event);
    }
  }

  emitAsync<T = any>(event: string, data?: T): Promise<void[]> {
    const subscriptions = this.listeners.get(event);
    if (!subscriptions) return Promise.resolve([]);

    const promises: Promise<void>[] = [];
    const toRemove: number[] = [];

    subscriptions.forEach((subscription, index) => {
      promises.push(
        Promise.resolve()
          .then(() => subscription.listener(data))
          .catch((error) => {
            console.error(`Error in async event listener for ${event}:`, error);
          })
      );

      if (subscription.once) {
        toRemove.push(index);
      }
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      subscriptions.splice(toRemove[i], 1);
    }

    if (subscriptions.length === 0) {
      this.listeners.delete(event);
    }

    return Promise.all(promises);
  }

  getListeners(event: string): EventListener[] {
    const subscriptions = this.listeners.get(event);
    return subscriptions ? subscriptions.map((sub) => sub.listener) : [];
  }

  hasListeners(event: string): boolean {
    const subscriptions = this.listeners.get(event);
    return !!subscriptions && subscriptions.length > 0;
  }

  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}