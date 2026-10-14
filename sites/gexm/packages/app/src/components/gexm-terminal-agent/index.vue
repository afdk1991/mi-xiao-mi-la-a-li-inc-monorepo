<template>
  <view class="gexm-terminal-container">
    <view class="gexm-terminal-header">
      <view class="gexm-terminal-title">
        <text class="gexm-terminal-icon">▣</text>
        <text class="gexm-terminal-text">Terminal Agent</text>
      </view>
      <view class="gexm-terminal-status">
        <view class="gexm-status-dot" :class="readOnly ? 'read-only' : 'read-write'"></view>
        <text class="gexm-status-text" :class="readOnly ? 'read-only' : 'read-write'">{{ readOnly ? 'Read-Only' : 'Read-Write' }}</text>
      </view>
      <view class="gexm-terminal-actions">
        <view class="gexm-action-btn" @click="clearTerminal">
          <text class="gexm-action-icon">✕</text>
        </view>
        <view class="gexm-action-btn" @click="toggleMode">
          <text class="gexm-action-icon">{{ readOnly ? '🔓' : '🔒' }}</text>
        </view>
      </view>
    </view>

    <scroll-view
      class="gexm-terminal-body"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-into-view="scrollToId"
      @scrolltolower="onScrollToLower"
    >
      <view
        v-for="(log, index) in logs"
        :key="index"
        :id="'log-' + index"
        class="gexm-terminal-line"
        :class="'gexm-log-' + log.level"
      >
        <text class="gexm-log-timestamp">{{ log.timestamp }}</text>
        <text class="gexm-log-level">{{ log.level.toUpperCase() }}</text>
        <text class="gexm-log-message">{{ log.message }}</text>
        <text v-if="log.context" class="gexm-log-context">{{ log.context }}</text>
      </view>

      <view v-if="logs.length === 0" class="gexm-terminal-empty">
        <text class="gexm-empty-icon">◉</text>
        <text class="gexm-empty-text">{{ readOnly ? 'Terminal ready (Read-Only mode)' : 'Terminal ready. Type "help" for available commands.' }}</text>
      </view>

      <view :id="'log-bottom'" class="gexm-terminal-bottom"></view>
    </scroll-view>

    <view class="gexm-terminal-input-container">
      <view class="gexm-input-prefix">
        <text class="gexm-prefix-symbol">$</text>
      </view>
      <input
        class="gexm-terminal-input"
        type="text"
        :placeholder="readOnly ? 'Terminal is in read-only mode' : 'Enter command...'"
        :disabled="readOnly"
        :value="currentInput"
        @input="onInput"
        @confirm="onCommandSubmit"
        @focus="onInputFocus"
        @keydown="onKeyDown"
      />
      <view class="gexm-input-suffix">
        <text class="gexm-suffix-hint">{{ readOnly ? '⌨️ Read-Only' : '⌨️ Enter to execute' }}</text>
      </view>
    </view>

    <view class="gexm-terminal-footer">
      <text class="gexm-footer-text">Terminal Agent v1.0.0</text>
      <text class="gexm-footer-hint">{{ readOnly ? 'All commands are disabled' : 'Use Up/Down for history' }}</text>
    </view>
  </view>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

export default {
  name: 'GexmTerminalAgent',
  props: {
    readOnly: {
      type: Boolean,
      default: false,
    },
    autoScroll: {
      type: Boolean,
      default: true,
    },
    maxLines: {
      type: Number,
      default: 1000,
    },
    initialLogs: {
      type: Array,
      default: () => [],
    },
  },

  emits: ['log', 'command-executed', 'command-blocked', 'mode-changed'],

  setup(props, { emit }) {
    const logs = ref([...props.initialLogs])
    const scrollTop = ref(0)
    const scrollToId = ref('')
    const inputFocused = ref(false)
    const currentInput = ref('')
    const commandHistory = ref([])
    const historyIndex = ref(-1)
    const localReadOnly = ref(props.readOnly)

    const formatTimestamp = (date) => {
      return new Date(date).toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    }

    const addLog = (level, message, context) => {
      const logEntry = {
        id: Date.now(),
        level: level || 'info',
        message: message || '',
        context: context ? JSON.stringify(context) : null,
        timestamp: formatTimestamp(Date.now()),
      }

      logs.value.push(logEntry)

      if (logs.value.length > props.maxLines) {
        logs.value = logs.value.slice(-props.maxLines)
      }

      emit('log', logEntry)

      if (props.autoScroll) {
        nextTick(() => {
          scrollToId.value = ''
          setTimeout(() => {
            scrollToId.value = 'log-bottom'
          }, 50)
        })
      }
    }

    const clearTerminal = () => {
      if (localReadOnly.value) {
        addLog('error', 'Cannot clear terminal in read-only mode')
        return
      }
      logs.value = []
      addLog('info', 'Terminal cleared')
    }

    const toggleMode = () => {
      localReadOnly.value = !localReadOnly.value
      addLog('info', `Terminal mode changed to: ${localReadOnly.value ? 'READ-ONLY' : 'READ-WRITE'}`)
      emit('mode-changed', { readOnly: localReadOnly.value })
    }

    const onInput = (event) => {
      currentInput.value = event.detail.value
    }

    const executeCommand = (command) => {
      const trimmed = command.trim()
      
      if (!trimmed) return

      addLog('info', `> ${trimmed}`)

      if (commandHistory.value.length === 0 || commandHistory.value[commandHistory.value.length - 1] !== trimmed) {
        commandHistory.value.push(trimmed)
      }
      historyIndex.value = commandHistory.value.length

      const builtinCommands = {
        help: () => `Available commands:
  help - Show this help message
  clear - Clear terminal output
  history - Show command history
  clearhistory - Clear command history
  version - Show terminal version
  status - Show terminal status
  toggle - Toggle read-only mode`,
        clear: () => {
          logs.value = []
          return ''
        },
        history: () => {
          if (commandHistory.value.length === 0) {
            return 'No command history.'
          }
          return commandHistory.value.map((cmd, idx) => `${idx + 1}. ${cmd}`).join('\n')
        },
        clearhistory: () => {
          commandHistory.value = []
          historyIndex.value = -1
          return 'Command history cleared.'
        },
        version: () => 'Terminal Agent v1.0.0',
        status: () => `Terminal Status:
  Mode: ${localReadOnly.value ? 'READ-ONLY' : 'READ-WRITE'}
  Messages: ${logs.value.length}
  History: ${commandHistory.value.length}
  Max Lines: ${props.maxLines}`,
        toggle: () => {
          toggleMode()
          return `Mode changed to: ${localReadOnly.value ? 'READ-ONLY' : 'READ-WRITE'}`
        },
      }

      if (builtinCommands[trimmed.toLowerCase()]) {
        const result = builtinCommands[trimmed.toLowerCase()]()
        if (result) {
          addLog('info', result)
        }
      } else {
        addLog('error', `Command not recognized: "${trimmed}". Type "help" for available commands.`)
      }

      emit('command-executed', { command: trimmed, timestamp: Date.now() })
    }

    const onCommandSubmit = () => {
      if (localReadOnly.value) {
        addLog('error', 'Terminal is in read-only mode. Cannot execute commands.')
        emit('command-blocked', { type: 'execute', message: 'Terminal is in read-only mode' })
        return
      }

      executeCommand(currentInput.value)
      currentInput.value = ''
    }

    const onInputFocus = () => {
      inputFocused.value = true
      if (localReadOnly.value) {
        addLog('warn', 'Terminal is in read-only mode')
      }
    }

    const onKeyDown = (event) => {
      if (localReadOnly.value) return

      const keyCode = event.keyCode || event.which

      if (keyCode === 38) {
        event.preventDefault()
        if (commandHistory.value.length > 0) {
          if (historyIndex.value > 0) {
            historyIndex.value--
            currentInput.value = commandHistory.value[historyIndex.value]
          } else if (historyIndex.value === -1) {
            historyIndex.value = commandHistory.value.length - 1
            currentInput.value = commandHistory.value[historyIndex.value]
          }
        }
      } else if (keyCode === 40) {
        event.preventDefault()
        if (commandHistory.value.length > 0) {
          if (historyIndex.value < commandHistory.value.length - 1) {
            historyIndex.value++
            currentInput.value = commandHistory.value[historyIndex.value]
          } else if (historyIndex.value === commandHistory.value.length - 1) {
            historyIndex.value = commandHistory.value.length
            currentInput.value = ''
          }
        }
      }
    }

    const onScrollToLower = () => {}

    const log = {
      trace: (msg, ctx) => addLog('trace', msg, ctx),
      debug: (msg, ctx) => addLog('debug', msg, ctx),
      info: (msg, ctx) => addLog('info', msg, ctx),
      warn: (msg, ctx) => addLog('warn', msg, ctx),
      error: (msg, ctx) => addLog('error', msg, ctx),
      fatal: (msg, ctx) => addLog('fatal', msg, ctx),
    }

    watch(
      () => props.initialLogs,
      (newLogs) => {
        if (newLogs && newLogs.length > 0) {
          logs.value = newLogs.map((log) => ({
            ...log,
            timestamp: log.timestamp || formatTimestamp(Date.now()),
          }))
        }
      }
    )

    watch(
      () => props.readOnly,
      (newReadOnly) => {
        localReadOnly.value = newReadOnly
      }
    )

    onMounted(() => {
      addLog('info', `Terminal Agent initialized in ${localReadOnly.value ? 'READ-ONLY' : 'READ-WRITE'} mode`)
      if (!localReadOnly.value) {
        addLog('info', 'User input and command execution are enabled')
        addLog('info', 'Type "help" for available commands')
      }
    })

    onUnmounted(() => {})

    return {
      logs,
      scrollTop,
      scrollToId,
      inputFocused,
      currentInput,
      readOnly: localReadOnly,
      clearTerminal,
      toggleMode,
      onInput,
      onCommandSubmit,
      onInputFocus,
      onKeyDown,
      onScrollToLower,
      formatTimestamp,
      log,
    }
  },
}
</script>

<style lang="scss" scoped>
.gexm-terminal-container {
  width: 100%;
  height: 100%;
  background: #0d1117;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}

.gexm-terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

.gexm-terminal-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gexm-terminal-icon {
  color: #58a6ff;
  font-size: 14px;
}

.gexm-terminal-text {
  color: #c9d1d9;
  font-size: 14px;
  font-weight: 500;
}

.gexm-terminal-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.gexm-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.read-only {
    background: #f85149;
  }

  &.read-write {
    background: #3fb950;
  }
}

.gexm-status-text {
  font-size: 12px;
  font-weight: 600;

  &.read-only {
    color: #f85149;
  }

  &.read-write {
    color: #3fb950;
  }
}

.gexm-terminal-actions {
  display: flex;
  gap: 8px;
}

.gexm-action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: transparent;
  transition: background 0.2s;

  &:active {
    background: #30363d;
  }
}

.gexm-action-icon {
  color: #8b949e;
  font-size: 14px;
}

.gexm-terminal-body {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
  background: #0d1117;
}

.gexm-terminal-line {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 0;
  font-size: 13px;
  line-height: 1.5;
}

.gexm-log-timestamp {
  color: #8b949e;
  flex-shrink: 0;
}

.gexm-log-level {
  font-weight: 600;
  flex-shrink: 0;
  width: 50px;

  &.TRACE {
    color: #a371f7;
  }

  &.DEBUG {
    color: #8b949e;
  }

  &.INFO {
    color: #58a6ff;
  }

  &.WARN {
    color: #d29922;
  }

  &.ERROR {
    color: #f85149;
  }

  &.FATAL {
    color: #f778ba;
    font-weight: 700;
  }
}

.gexm-log-message {
  color: #c9d1d9;
  flex: 1;
  word-break: break-all;
}

.gexm-log-context {
  color: #8b949e;
  font-size: 11px;
  word-break: break-all;
}

.gexm-terminal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 8px;
}

.gexm-empty-icon {
  color: #30363d;
  font-size: 24px;
}

.gexm-empty-text {
  color: #8b949e;
  font-size: 13px;
}

.gexm-terminal-bottom {
  height: 1px;
}

.gexm-terminal-input-container {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #161b22;
  border-top: 1px solid #30363d;
  gap: 12px;
}

.gexm-input-prefix {
  flex-shrink: 0;
}

.gexm-prefix-symbol {
  color: #58a6ff;
  font-size: 14px;
  font-weight: 600;
}

.gexm-terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #c9d1d9;
  font-size: 14px;
  font-family: inherit;
  padding: 0;

  &::placeholder {
    color: #484f58;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.gexm-input-suffix {
  flex-shrink: 0;
}

.gexm-suffix-hint {
  color: #8b949e;
  font-size: 12px;
}

.gexm-terminal-footer {
  display: flex;
  justify-content: space-between;
  padding: 6px 16px;
  background: #0d1117;
  border-top: 1px solid #21262d;
}

.gexm-footer-text {
  color: #484f58;
  font-size: 11px;
}

.gexm-footer-hint {
  color: #484f58;
  font-size: 11px;
}

.gexm-terminal-body::-webkit-scrollbar {
  width: 8px;
}

.gexm-terminal-body::-webkit-scrollbar-track {
  background: #161b22;
}

.gexm-terminal-body::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;

  &:hover {
    background: #484f58;
  }
}
</style>