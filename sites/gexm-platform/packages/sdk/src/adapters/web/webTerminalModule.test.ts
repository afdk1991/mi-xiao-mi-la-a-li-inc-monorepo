import { TerminalModule } from './webTerminalModule';

describe('TerminalModule', () => {
  let terminal: TerminalModule;

  beforeEach(() => {
    terminal = new TerminalModule();
  });

  describe('write and writeln', () => {
    it('should write message to output', () => {
      terminal.write('Hello World');
      const output = terminal.getOutput();
      expect(output.length).toBe(1);
      expect(output[0].message).toBe('Hello World');
      expect(output[0].level).toBe('info');
    });

    it('should append message when same level', () => {
      terminal.write('Hello');
      terminal.write(' World');
      const output = terminal.getOutput();
      expect(output.length).toBe(1);
      expect(output[0].message).toBe('Hello World');
    });

    it('should create new message when different level', () => {
      terminal.write('Info message');
      terminal.write('Error message', 'error');
      const output = terminal.getOutput();
      expect(output.length).toBe(2);
      expect(output[0].level).toBe('info');
      expect(output[1].level).toBe('error');
    });

    it('should write with newline', () => {
      terminal.writeln('Line 1');
      const output = terminal.getOutput();
      expect(output[0].message).toBe('Line 1\n');
    });
  });

  describe('clear', () => {
    it('should clear all messages', () => {
      terminal.write('Message 1');
      terminal.write('Message 2');
      terminal.clear();
      expect(terminal.getOutput().length).toBe(0);
    });

    it('should not clear when readonly', () => {
      terminal.setReadOnly(true);
      terminal.write('Message');
      terminal.clear();
      expect(terminal.getOutput().length).toBe(1);
    });
  });

  describe('execute', () => {
    it('should execute help command', async () => {
      const result = await terminal.execute('help');
      expect(result).toContain('Available commands');
    });

    it('should execute clear command', async () => {
      terminal.write('Test message');
      await terminal.execute('clear');
      expect(terminal.getOutput().length).toBe(0);
    });

    it('should execute history command', async () => {
      await terminal.execute('help');
      await terminal.execute('status');
      const result = await terminal.execute('history');
      expect(result).toContain('1. help');
      expect(result).toContain('2. status');
    });

    it('should execute version command', async () => {
      const result = await terminal.execute('version');
      expect(result).toBe('Terminal Module v1.0.0');
    });

    it('should execute status command', async () => {
      const result = await terminal.execute('status');
      expect(result).toContain('Terminal Status');
      expect(result).toContain('READ-WRITE');
    });

    it('should handle unknown command', async () => {
      const result = await terminal.execute('unknown');
      expect(result).toContain('Command not recognized');
    });

    it('should not execute when readonly', async () => {
      terminal.setReadOnly(true);
      const result = await terminal.execute('help');
      expect(result).toBe('');
      const output = terminal.getOutput();
      expect(output[output.length - 1].message).toContain('READ-ONLY');
    });
  });

  describe('command history', () => {
    it('should record command history', () => {
      terminal.execute('help');
      terminal.execute('status');
      expect(terminal.getHistory()).toEqual(['help', 'status']);
    });

    it('should clear history', () => {
      terminal.execute('help');
      terminal.clearHistory();
      expect(terminal.getHistory()).toEqual([]);
    });

    it('should navigate history with prevHistory', () => {
      terminal.execute('cmd1');
      terminal.execute('cmd2');
      terminal.execute('cmd3');
      
      expect(terminal.prevHistory()).toBe('cmd3');
      expect(terminal.prevHistory()).toBe('cmd2');
      expect(terminal.prevHistory()).toBe('cmd1');
      expect(terminal.prevHistory()).toBe('cmd1');
    });

    it('should navigate history with nextHistory', () => {
      terminal.execute('cmd1');
      terminal.execute('cmd2');
      
      terminal.prevHistory();
      terminal.prevHistory();
      
      expect(terminal.nextHistory()).toBe('cmd2');
      expect(terminal.nextHistory()).toBe(null);
    });

    it('should return null when history is empty', () => {
      expect(terminal.prevHistory()).toBe(null);
      expect(terminal.nextHistory()).toBe(null);
    });
  });

  describe('readonly mode', () => {
    it('should be read-write by default', () => {
      expect(terminal.isReadOnly()).toBe(false);
    });

    it('should set readonly mode', () => {
      terminal.setReadOnly(true);
      expect(terminal.isReadOnly()).toBe(true);
    });

    it('should set read-write mode', () => {
      terminal.setReadOnly(true);
      terminal.setReadOnly(false);
      expect(terminal.isReadOnly()).toBe(false);
    });
  });

  describe('pause and resume', () => {
    it('should pause terminal', () => {
      terminal.pause();
      expect(terminal.isPaused()).toBe(true);
    });

    it('should resume terminal', () => {
      terminal.pause();
      terminal.resume();
      expect(terminal.isPaused()).toBe(false);
    });

    it('should not write when paused', () => {
      terminal.pause();
      terminal.write('Test');
      expect(terminal.getOutput().length).toBe(1);
      terminal.resume();
      terminal.write('After resume');
      expect(terminal.getOutput().length).toBe(2);
    });
  });

  describe('maxLines and trimMessages', () => {
    it('should limit messages to maxLines', () => {
      terminal.setMaxLines(5);
      for (let i = 0; i < 10; i++) {
        terminal.writeln(`Message ${i}`, i % 2 === 0 ? 'info' : 'warn');
      }
      expect(terminal.getOutput().length).toBe(5);
    });

    it('should get current maxLines', () => {
      expect(terminal.getMaxLines()).toBe(1000);
      terminal.setMaxLines(500);
      expect(terminal.getMaxLines()).toBe(500);
    });
  });

  describe('listeners', () => {
    it('should add output listener', () => {
      const listener = jest.fn();
      const unsubscribe = terminal.onOutput(listener);
      terminal.write('Test');
      expect(listener).toHaveBeenCalled();
      unsubscribe();
      terminal.write('Test2');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should add input listener', () => {
      const listener = jest.fn();
      const unsubscribe = terminal.onInput(listener);
      terminal.execute('help');
      expect(listener).toHaveBeenCalledWith('help');
      unsubscribe();
      terminal.execute('status');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});