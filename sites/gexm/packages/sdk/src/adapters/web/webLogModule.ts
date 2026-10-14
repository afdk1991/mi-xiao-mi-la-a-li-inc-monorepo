import type { ILogModule } from '@/interfaces/ILogModule';
import type { LogLevel, LogMessage } from '@/interfaces/ITypes';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

export class WebLogModule implements ILogModule {
  private currentLevel: LogLevel = 'info';
  private consoleEnabled: boolean = true;
  private fileEnabled: boolean = false;
  private messages: LogMessage[] = [];
  private maxMessages: number = 1000;
  private listeners: ((message: LogMessage) => void)[] = [];

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.currentLevel];
  }

  private createMessage(level: LogLevel, message: string, context?: Record<string, any>): LogMessage {
    return {
      level,
      message,
      timestamp: Date.now(),
      context,
    };
  }

  private output(message: LogMessage): void {
    if (this.consoleEnabled) {
      const formattedTime = new Date(message.timestamp).toISOString();
      const contextStr = message.context ? ` ${JSON.stringify(message.context)}` : '';

      switch (message.level) {
        case 'trace':
          console.trace(`[${formattedTime}] TRACE: ${message.message}${contextStr}`);
          break;
        case 'debug':
          console.debug(`[${formattedTime}] DEBUG: ${message.message}${contextStr}`);
          break;
        case 'info':
          console.info(`[${formattedTime}] INFO: ${message.message}${contextStr}`);
          break;
        case 'warn':
          console.warn(`[${formattedTime}] WARN: ${message.message}${contextStr}`);
          break;
        case 'error':
          console.error(`[${formattedTime}] ERROR: ${message.message}${contextStr}`);
          break;
        case 'fatal':
          console.error(`[${formattedTime}] FATAL: ${message.message}${contextStr}`);
          break;
      }
    }

    if (this.messages.length >= this.maxMessages) {
      this.messages.shift();
    }
    this.messages.push(message);

    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch {
        // ignore
      }
    });
  }

  trace(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('trace')) {
      this.output(this.createMessage('trace', message, context));
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      this.output(this.createMessage('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      this.output(this.createMessage('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      this.output(this.createMessage('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      this.output(this.createMessage('error', message, context));
    }
  }

  fatal(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('fatal')) {
      this.output(this.createMessage('fatal', message, context));
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }

  enableConsole(enable: boolean): void {
    this.consoleEnabled = enable;
  }

  enableFile(enable: boolean): void {
    this.fileEnabled = enable;
  }

  setFileOutput(path: string): void {
    // Web platform doesn't support file output directly
    // This would need a backend service or Electron integration
  }

  getMessages(limit?: number): LogMessage[] {
    const count = limit || this.messages.length;
    return this.messages.slice(-count);
  }

  clearMessages(): void {
    this.messages = [];
  }

  onLog(listener: (message: LogMessage) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}