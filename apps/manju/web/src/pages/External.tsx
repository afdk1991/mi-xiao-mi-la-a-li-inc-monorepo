import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ExternalIndex, ExternalItem, ExternalList } from '../types';
import { Attribution, ExtCover } from '../components/common';
import ExternalPlayer from '../components/ExternalPlayer';

const STEP = 60;

/**
 * 打开来源站点。
 *
 * 必须是「用户已经点过一次并二次确认」之后才会走到这里。
 * 用临时的 <a> 而不是 window.open：才能带上 target/rel/referrerPolicy。
 * 保持 rel="noopener external" 且刻意不加 noreferrer —— 反向链接凭证要留给源站，
 * 这是本站作为发现入口的凭据；跨源默认只发 origin，不泄露站内具体路径。
 */
function openExternal(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener external';
  a.referrerPolicy = 'strict-origin-when-cross-origin';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** #/external —— 外部片单分类页 */
export function ExternalIndex({ go }: { go: (h: string) => void }) {
  const [idx, setIdx] = useState<ExternalIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    api.extIndex(ac.signal).then(setIdx).catch((e: Error) => setErr(e.message));
    return () => ac.abort();
  }, []);

  if (err) return <div className="center err">加载失败：{err}</div>;
  if (!idx) return <div className="center">加载中…</div>;

  return (
    <>
      <div className="hero">
        <h1>外部片单索引</h1>
        <p>{idx.provider_label || '第三方平台'} · 共 {idx.total ?? 0} 条 · 仅含公开元数据，站内直接播放</p>
      </div>
      <div style={{ margin: '14px 0' }}>
        <Attribution text={idx.attribution} provider={idx.provider_label} />
      </div>
      <div className="grid">
        {idx.catalogs.map((c) => (
          <div className="card" key={c.category} onClick={() => go(`#/external/${c.category}`)}
               role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(`#/external/${c.category}`)}>
            <div className="meta" style={{ padding: 16 }}>
              <div className="t">{c.category_label}</div>
              <div className="info"><span>{c.total ?? 0} 条</span><span>站内播放</span></div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 16 }}><a href="#/">← 返回首页</a></p>
    </>
  );
}

/** #/external/:cat —— 外部片单列表（分批加载） */
export function ExternalList({ cat, go }: { cat: string; go: (h: string) => void }) {
  const [data, setData] = useState<ExternalList | null>(null);
  const [shown, setShown] = useState(STEP);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setData(null); setShown(STEP); setErr(null);
    api.extList(cat, ac.signal).then(setData).catch((e: Error) => setErr(e.message));
    return () => ac.abort();
  }, [cat]);

  if (err) return <div className="center err">加载失败：{err}</div>;
  if (!data) return <div className="center">加载中…</div>;

  const items = data.items || [];
  const slice = items.slice(0, shown);

  return (
    <>
      <div className="hero">
        <h1>{data.category_label || cat}</h1>
        <p>共 {data.total ?? items.length} 条 · 仅含公开元数据，点击即在站内播放器打开</p>
        <p style={{ marginTop: 6 }}><a href="#/external">← 返回分类</a></p>
      </div>
      <div style={{ margin: '14px 0' }}>
        <Attribution text={data.attribution} provider={data.category_label} />
      </div>
      <div className="grid">
        {slice.map((it) => (
          <ExtCover key={it.id} item={it} onClick={() => go(`#/ext/${cat}/${it.id}`)} />
        ))}
      </div>
      {shown < items.length && (
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button className="btn" onClick={() => setShown((n) => n + STEP)}>
            加载更多（{shown} / {items.length}）
          </button>
        </div>
      )}
    </>
  );
}

/**
 * #/ext/:cat/:id —— 站内播放页
 *
 * 这里是「外部片单」的默认归宿：先进播放器尝试站内播放，
 * 只有在三种方式都失败、且用户二次确认之后，才可能离开本站。
 */
export function ExtWatch({ cat, id, go }: { cat: string; id: string; go: (h: string) => void }) {
  const [data, setData] = useState<ExternalList | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    api.extList(cat, ac.signal).then(setData).catch((e: Error) => setErr(e.message));
    return () => ac.abort();
  }, [cat]);

  if (err) return <div className="center err">加载失败：{err}</div>;
  if (!data) return <div className="center">加载中…</div>;

  const it: ExternalItem | undefined = (data.items || []).find((x) => String(x.id) === String(id));
  if (!it) return <div className="center">未找到该条目　<a href={`#/external/${cat}`}>返回列表</a></div>;

  return (
    <>
      {it.unavailable && (
        <p className="notice">
          该作品在来源站已下架（最近一次核对未能取到内容），站内无法播放。
          以下为采集到的元数据，仅供参考。
        </p>
      )}
      <ExternalPlayer
        cat={cat}
        item={it}
        onOpenOriginal={() => it.detail_url && openExternal(it.detail_url)}
      />

      <div className="now">
        <h1>{it.title}</h1>
        <p>
          {it.source_label ? `${it.source_label} · ` : ''}
          {it.category_label ? `${it.category_label} · ` : ''}
          {it.duration_text ? `${it.duration_text} · ` : ''}
          {it.playable_text || it.episodes_text || ''}
          {it.update_status_text ? ` · ${it.update_status_text}` : ''}
        </p>
        {!!(it.update_status === 'updating' && it.updated_episodes_source
            && it.total_episodes_source
            && it.updated_episodes_source < it.total_episodes_source) && (
          <p>
            该作仍在连载：源站已更新至第 {it.updated_episodes_source} 集，
            计划全集 {it.total_episodes_source} 集；本站只收录当前已上线且免费开放的部分。
          </p>
        )}
        {it.intro && (
          <>
            <h2 style={{ fontSize: 15, margin: '14px 0 6px' }}>简介</h2>
            <p className="ext-intro">{it.intro}</p>
          </>
        )}
        {!!(it.tags && it.tags.length) && (
          <div className="ext-tags">
            {it.tags.map((t) => (<span key={t} className="tag">{t}</span>))}
          </div>
        )}
        {!!(it.playable_text && it.total_episodes_source
            && it.total_episodes_source > (it.playable_episodes || 0)) && (
          <p className="notice">
            来源站登记全集 {it.total_episodes_source} 集，其中前 {it.playable_episodes} 集
            可直接在本页观看；其余为来源站的付费内容，本站不存储、不转码，也不提供任何绕过方式。
          </p>
        )}
        <p style={{ marginTop: 8 }}>
          <a href={`#/external/${cat}`}>← 返回列表</a>
          {'　'}
          <button className="btn" onClick={() => go('#/')}>回首页</button>
        </p>
      </div>

      <div style={{ marginTop: 14 }}>
        <Attribution
          text={data.attribution}
          provider={it.source_label}
          note="默认在本页内播放；只有当内嵌播放确实不可行时，才会请你确认是否前往来源站点。"
        />
      </div>
    </>
  );
}
