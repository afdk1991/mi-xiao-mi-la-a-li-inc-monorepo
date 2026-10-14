import type { ITerminalModule } from '@/interfaces/ITerminalModule';
import type { LogLevel, LogMessage } from '@/interfaces/ITypes';

export class TerminalModule implements ITerminalModule {
  private messages: LogMessage[] = [];
  private readonly: boolean = false;
  private maxLines: number = 1000;
  private paused: boolean = false;
  private listeners: ((message: LogMessage) => void)[] = [];
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  private inputListeners: ((command: string) => void)[] = [];

  private createMessage(message: string, level: LogLevel): LogMessage {
    return {
      level,
      message,
      timestamp: Date.now(),
    };
  }

  write(message: string, level: LogLevel = 'info'): void {
    if (this.paused) return;

    const lastMessage = this.messages[this.messages.length - 1];
    
    if (lastMessage && lastMessage.level === level) {
      lastMessage.message += message;
      lastMessage.timestamp = Date.now();
    } else {
      this.messages.push(this.createMessage(message, level));
    }

    this.trimMessages();
    this.notifyListeners(this.messages[this.messages.length - 1]);
  }

  writeln(message: string, level: LogLevel = 'info'): void {
    this.write(message + '\n', level);
  }

  clear(): void {
    if (!this.readonly) {
      this.messages = [];
    }
  }

  async execute(command: string): Promise<string> {
    if (this.readonly) {
      this.writeln('Terminal is in READ-ONLY mode. Cannot execute commands.', 'error');
      return '';
    }

    this.writeln(`> ${command}`, 'info');

    this.commandHistory.push(command);
    this.historyIndex = this.commandHistory.length;

    this.notifyInputListeners(command);

    return await this.executeCommand(command);
  }

  private async executeCommand(command: string): Promise<string> {
    const trimmed = command.trim().toLowerCase();

    const builtinCommands: Record<string, () => Promise<string>> = {
      help: async () => {
        return `Available commands:
  help - Show this help message
  clear - Clear terminal output
  history - Show command history
  clearhistory - Clear command history
  version - Show terminal version
  status - Show terminal status`;
      },
      clear: async () => {
        this.clear();
        return '';
      },
      history: async () => {
        if (this.commandHistory.length === 0) {
          return 'No command history.';
        }
        return this.commandHistory.map((cmd, idx) => `${idx + 1}. ${cmd}`).join('\n');
      },
      clearhistory: async () => {
        this.clearHistory();
        return 'Command history cleared.';
      },
      version: async () => {
        return 'Terminal Module v1.0.0';
      },
      status: async () => {
        return `Terminal Status:
  Mode: ${this.readonly ? 'READ-ONLY' : 'READ-WRITE'}
  Paused: ${this.paused}
  Messages: ${this.messages.length}
  History: ${this.commandHistory.length}
  Max Lines: ${this.maxLines}`;
      },
    };

    if (builtinCommands[trimmed]) {
      return await builtinCommands[trimmed]();
    }

    return `Command not recognized: "${command}". Type "help" for available commands.`;
  }

  getHistory(): string[] {
    return [...this.commandHistory];
  }

  onInput(listener: (command: string) => void): () => void {
    this.inputListeners.push(listener);
    return () => {
      this.inputListeners = this.inputListeners.filter((l) => l !== listener);
    };
  }

  clearHistory(): void {
    this.commandHistory = [];
    this.historyIndex = -1;
  }

  getHistoryIndex(): number {
    return this.historyIndex;
  }

  prevHistory(): string | null {
    if (this.commandHistory.length === 0) return null;

    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.commandHistory[this.historyIndex];
    }

    return this.commandHistory[0];
  }

  nextHistory(): string | null {
    if (this.commandHistory.length === 0) return null;

    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
      return this.commandHistory[this.historyIndex];
    }

    this.historyIndex = this.commandHistory.length;
    return null;
  }

  private notifyInputListeners(command: string): void {
    this.inputListeners.forEach((listener) => {
      try {
        listener(command);
      } catch {
        // ignore
      }
    });
  }

  getOutput(): LogMessage[] {
    return [...this.messages];
  }

  isReadOnly(): boolean {
    return this.readonly;
  }

  setReadOnly(readonly: boolean): void {
    this.readonly = readonly;
    if (readonly) {
      this.writeln('Terminal mode changed to: READ-ONLY', 'info');
    } else {
      this.writeln('Terminal mode changed to: READ-WRITE', 'info');
    }
  }

  onOutput(listener: (message: LogMessage) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  setMaxLines(maxLines: number): void {
    this.maxLines = maxLines;
    this.trimMessages();
  }

  getMaxLines(): number {
    return this.maxLines;
  }

  pause(): void {
    this.writeln('Terminal output paused', 'warn');
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.writeln('Terminal output resumed', 'info');
  }

  isPaused(): boolean {
    return this.paused;
  }

  private trimMessages(): void {
    if (this.messages.length > this.maxLines) {
      this.messages = this.messages.slice(-this.maxLines);
    }
  }

  private notifyListeners(message: LogMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch {
        // ignore
      }
    });
  }
}