import type { ExternalItem, SeriesCard } from '../types';

export function SeriesCover({ item, seen, onClick }: {
  item: SeriesCard; seen?: boolean; onClick: () => void;
}) {
  return (
    <div className="card" onClick={onClick} role="button" tabIndex={0}
         onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <img className="cover" loading="lazy" src={item.cover} alt={item.title}
           onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
      {seen && <span className="badge">已看过</span>}
      <div className="meta">
        <div className="t">{item.title}</div>
        <div className="info">
          <span>{item.total_episodes ? `${item.total_episodes} 集` : ''}</span>
          {item.score ? <span>{item.score.toFixed(1)}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function ExtCover({ item, onClick }: { item: ExternalItem; onClick: () => void }) {
  /*
   * 优先展示已核实的「免费可播集数」。
   * 片单采集到的 episodes_text 是来源站的标称（常常写着「全 1000 集」），
   * 但免费能看的往往只有前几集。照抄标称等于把用户骗进去——先按核实值展示。
   */
  const primary = item.playable_text || item.duration_text || item.episodes_text || '';
  const secondary = item.playable_text
    ? (item.duration_text || '')
    : (item.episodes_text && item.episodes_text !== primary ? item.episodes_text : '');
  return (
    <div className="card" onClick={onClick} role="button" tabIndex={0}
         onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <img className="cover" loading="lazy" src={item.cover_url} alt={item.title}
           onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
      <span className={`badge ${item.unavailable ? 'off' : 'play'}`}>
        {item.unavailable ? '已下架' : '站内播放'}
      </span>
      <div className="meta">
        <div className="t">{item.title}</div>
        <div className="info">
          <span>{primary}</span>
          <span>{item.source_label || ''}</span>
        </div>
        {secondary && <div className="sub">{secondary}</div>}
      </div>
    </div>
  );
}

/**
 * 版权与来源标注。
 * 外部片单提供发现与站内播放；本站不存储、不转码、不代理第三方视频。
 * 这一点必须在列表页、播放页等可见位置明示，不能只放页脚小字。
 */
export function Attribution({ text, provider, note }: {
  text?: string; provider?: string; note?: string;
}) {
  const body = text || '本页仅含公开元数据与来源链接，不含视频与图片二进制内容。';
  return (
    <div className="notice">
      <b>来源与版权</b>
      {provider ? ` · ${provider}` : ''}
      <br />{body}
      <br />{note || '本站默认在页面内播放；仅在确实无法内嵌、并经你确认后，才会前往来源站点。'}
    </div>
  );
}
