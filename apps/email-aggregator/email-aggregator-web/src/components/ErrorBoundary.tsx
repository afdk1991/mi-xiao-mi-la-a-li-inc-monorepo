import { Component, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

// 全局错误边界：捕获渲染期抛错，避免单一组件异常导致整页白屏。
// 提供可恢复 UI（错误卡片 + 重试），而非崩溃堆栈。
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err)
    return { hasError: true, message }
  }

  componentDidCatch(err: unknown, info: unknown) {
    // 生产环境可在此上报到监控；本 PoC 仅控制台留痕。
    console.error('[ErrorBoundary]', err, info)
  }

  // BUG-003-12：按钮原文案为「重新加载」，但 handleRetry 只重置边界状态重新渲染子树，
  // 既不刷新页面也不重新拉取数据，与文案承诺不符（用户会以为数据已重载）。
  // 这里把文案对齐为「重试」，并补充「若持续失败请刷新页面」的提示。
  handleRetry = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <h2>
            <Icon name="warning" size={20} /> 页面出错
          </h2>
          <p className="error-boundary-msg">{this.state.message || '发生未知错误'}</p>
          <button onClick={this.handleRetry} className="btn btn--primary btn--lg">
            重试
          </button>
          <p className="error-boundary-hint">若反复失败，请刷新页面重试。</p>
        </div>
      )
    }
    return this.props.children
  }
}
