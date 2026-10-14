// 定位用途告知弹窗：首次开启实时位置 / 导航前必须展示，用户确认后才真正调用定位。
// 对应《个人信息保护法》对敏感个人信息「单独告知 + 取得同意」的要求。

import { useState } from 'react'
import { LOCATION_PURPOSE, PRIVACY_FULL, PRIVACY_POINTS } from '../privacy'

export interface PrivacyNoticeProps {
  open: boolean
  /** 用户点击「同意并开启」 */
  onAccept: () => void
  /** 用户点击「取消」（不开定位） */
  onCancel: () => void
}

export default function PrivacyNotice({ open, onAccept, onCancel }: PrivacyNoticeProps) {
  const [full, setFull] = useState(false)
  if (!open) return null

  return (
    <div className="modal-mask" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">定位用途说明</span>
          <button className="modal-x" onClick={onCancel} title="关闭">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="privacy-lead">
            本应用将获取你的<b>实时位置信息</b>（敏感个人信息）。用途：{LOCATION_PURPOSE}
          </p>

          <ul className="privacy-points">
            {PRIVACY_POINTS.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>

          {full ? (
            <pre className="privacy-full">{PRIVACY_FULL}</pre>
          ) : (
            <button className="btn sm" onClick={() => setFull(true)}>
              查看隐私政策全文
            </button>
          )}
          {full && (
            <button className="btn sm" onClick={() => setFull(false)}>
              收起全文
            </button>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button className="btn primary" onClick={onAccept}>
            同意并开启定位
          </button>
        </div>
      </div>
    </div>
  )
}
