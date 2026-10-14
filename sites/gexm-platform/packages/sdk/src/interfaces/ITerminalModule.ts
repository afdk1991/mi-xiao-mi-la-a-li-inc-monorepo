import type { LogLevel, LogMessage } from './ITypes';

export interface ITerminalModule {
  write(message: string, level?: LogLevel): void;
  
  writeln(message: string, level?: LogLevel): void;
  
  clear(): void;
  
  getOutput(): LogMessage[];
  
  isReadOnly(): boolean;
  
  setReadOnly(readonly: boolean): void;
  
  onOutput(listener: (message: LogMessage) => void): () => void;
  
  setMaxLines(maxLines: number): void;
  
  getMaxLines(): number;
  
  pause(): void;
  
  resume(): void;
  
  isPaused(): boolean;

  execute(command: string): Promise<string>;

  getHistory(): string[];

  onInput(listener: (command: string) => void): () => void;

  clearHistory(): void;

  getHistoryIndex(): number;

  prevHistory(): string | null;

  nextHistory(): string | null;
}