import React from 'react';

/* =========================================================================
 * SiteFooter —— 网站备案信息页脚组件
 * 与设计稿「图标 & 插画 → 页脚组件」1 行横排版式 1:1 对应
 * 适配全栈项目（React + TypeScript 前端），双站点可切换
 * ========================================================================= */

export type SiteKey = 'laal' | 'mixm';

export interface SiteProfile {
  /** 网站名称 */
  name: string;
  /** 域名 */
  domain: string;
  /** 工信部备案号 */
  miit: string;
  /** 公安备案号（完整文本，如「苏公网安备32072202010512号」） */
  police: string;
  /** 公安备案号纯数字（recordcode，用于跳转链接） */
  policeCode: string;
  /** 品牌渐变 [起始色, 结束色] */
  gradient: [string, string];
  /** 品牌图标类型 */
  icon: 'globe' | 'sprout';
}

export const SITES: Record<SiteKey, SiteProfile> = {
  laal: {
    name: '拉啊里',
    domain: 'laal.top',
    miit: '苏ICP备2025161175号-1',
    police: '苏公网安备32072202010512号',
    policeCode: '32072202010512',
    gradient: ['#4F8DF9', '#2F6BEB'],
    icon: 'globe',
  },
  mixm: {
    name: '米小米',
    domain: 'mixm.top',
    miit: '苏ICP备2025161175号-2',
    police: '苏公网安备32072202010511号',
    policeCode: '32072202010511',
    gradient: ['#FBBF24', '#F59E0B'],
    icon: 'sprout',
  },
};

/* 品牌图标：白色描边矢量，与设计稿一致（地球=拉啊里，幼苗=米小米） */
const BrandIcon: React.FC<{ type: SiteProfile['icon']; size: number }> = ({ type, size }) => {
  if (type === 'globe') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="#FFFFFF" strokeWidth="2" />
        <path d="M3 12L21 12M12 3L12 21M6 5L6 19M18 5L18 19" stroke="#FFFFFF" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="17" r="3" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M12 14L12 8M12 11L7 8M12 11L17 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export interface SiteFooterProps {
  /** 站点 key，决定展示哪套备案信息 */
  site: SiteKey;
  /** 是否在新标签打开备案链接（默认 true） */
  openInNewTab?: boolean;
}

const MIIT_URL = 'https://beian.miit.gov.cn';
const POLICE_BASE = 'http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=';

const SiteFooter: React.FC<SiteFooterProps> = ({ site, openInNewTab = true }) => {
  const p = SITES[site];
  const target = openInNewTab ? '_blank' : undefined;
  const rel = openInNewTab ? 'noopener noreferrer' : undefined;

  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 16px',
        height: 64,
        width: '100%',
        boxSizing: 'border-box',
        background: '#FFFFFF',
        border: '1px solid #E8EBF0',
        borderRadius: 12,
        flexWrap: 'wrap',
      }}
    >
      {/* 品牌图标 */}
      <span
        style={{
          width: 40,
          height: 40,
          flex: '0 0 40px',
          borderRadius: 11,
          overflow: 'hidden',
          display: 'inline-flex',
          background: `linear-gradient(180deg, ${p.gradient[0]}, ${p.gradient[1]})`,
        }}
      >
        <BrandIcon type={p.icon} size={40} />
      </span>

      {/* 站点名 · 域名 */}
      <span style={{ fontSize: 15, fontWeight: 600, color: '#1A2233' }}>
        {p.name} · {p.domain}
      </span>

      {/* 弹性间距：把备案号推到最右 */}
      <span style={{ flex: '1 1 auto' }} />

      {/* 工信部备案号（链接到 beian.miit.gov.cn） */}
      <a
        href={MIIT_URL}
        target={target}
        rel={rel}
        style={{ fontSize: 13, fontWeight: 500, color: '#2F6BEB', textDecoration: 'none' }}
      >
        {p.miit}
      </a>

      {/* 公安备案号（链接到公安备案查询） */}
      <a
        href={`${POLICE_BASE}${p.policeCode}`}
        target={target}
        rel={rel}
        style={{ fontSize: 13, fontWeight: 500, color: '#2F6BEB', textDecoration: 'none' }}
      >
        {p.police}
      </a>
    </footer>
  );
};

export default SiteFooter;
