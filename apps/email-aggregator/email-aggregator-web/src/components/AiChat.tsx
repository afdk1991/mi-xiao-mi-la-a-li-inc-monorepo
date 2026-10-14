import { useEffect, useRef, useState } from 'react'
import { aiChat } from '../api/client'
import type { ChatMessage, ChatRequest } from '../types'
import { Icon } from './Icon'

interface Props {
  accountId: string
}

export default function AiChat({ accountId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 卸载守卫：请求飞行中组件被卸载（如切换视图）时不再 setState。
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  // BUG-003-08：切换账户时清空上一账户的会话。
  // 原实现把 messages 挂在组件上而 accountId 变化不会重置，导致
  // A 账户的提问历史残留在 B 账户面板中，且作为上下文被一并提交给后端（串账户）。
  useEffect(() => {
    setMessages([])
    setError(null)
    setInput('')
  }, [accountId])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setBusy(true)
    setError(null)
    try {
      const req: ChatRequest = {
        tenantId: __DEMO_MODE__ ? 'demo-tenant' : 'default-tenant',
        tenantTier: 'public',
        accountId,
        capability: 'chat',
        messages: next,
        sensitivity: 1,
        userConsented: true,
      }
      const resp = await aiChat(req)
      if (!aliveRef.current) return
      // BUG-003-09：上游返回空正文时原实现会渲染一个空白 AI 气泡，用户无从判断是
      // 「模型没说话」还是「出错了」。这里给出显式占位，便于区分。
      setMessages([...next, { role: 'model', content: resp.content || '(模型未返回内容)' }])
    } catch (e) {
      if (!aliveRef.current) return
      const msg = e instanceof Error ? e.message : String(e)
      // 后端已返回人类可读的中文错误（如未配置上游）时原样展示；
      // 只有裸 HTTP 状态码才映射为通用文案，避免把具体原因吞掉。
      setError(/^HTTP \d+$/.test(msg) ? 'AI 服务暂不可用，请稍后重试' : msg)
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }

  return (
    <div className="ai-chat">
      <div className="panel-head">
        <h2>AI 助手</h2>
        <span className="panel-sub">ADR-010</span>
      </div>
      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <Icon name="send" size={22} />
            <p>向 AI 提问</p>
            <span>试试「总结这封邮件」或「提炼待办事项」</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role}`}>
            <b>{m.role === 'user' ? '你' : 'AI'}</b>
            {m.content}
          </div>
        ))}
        {error && (
          <div className="alert error" role="alert">
            <Icon name="warning" size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
      <div className="ai-input">
        <textarea
          value={input}
          aria-label="输入 AI 问题"
          placeholder="输入问题…（Enter 发送，Shift+Enter 换行）"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button onClick={send} disabled={busy} className="btn btn--primary" aria-label="发送提问">
          {busy ? (
            '思考中…'
          ) : (
            <>
              发送 <Icon name="send" size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
