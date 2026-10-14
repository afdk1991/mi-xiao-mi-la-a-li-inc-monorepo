import type { LogLevel, LogMessage } from './ITypes';

export interface ILogModule {
  trace(message: string, context?: Record<string, any>): void;

  debug(message: string, context?: Record<string, any>): void;

  info(message: string, context?: Record<string, any>): void;

  warn(message: string, context?: Record<string, any>): void;

  error(message: string, context?: Record<string, any>): void;

  fatal(message: string, context?: Record<string, any>): void;

  setLevel(level: LogLevel): void;

  getLevel(): LogLevel;

  enableConsole(enable: boolean): void;

  enableFile(enable: boolean): void;

  setFileOutput(path: string): void;

  getMessages(limit?: number): LogMessage[];

  clearMessages(): void;

  onLog(listener: (message: LogMessage) => void): () => void;
}