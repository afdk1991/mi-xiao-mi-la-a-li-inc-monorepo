/**
 * 数据契约类型 —— 由 spec/openapi.yaml 与现有静态 JSON 结构派生。
 * Web / Flutter / Tauri / RN 四端共用同一套字段语义，改契约先改这里。
 */

export interface Source {
  container: string;
  url: string;
  quality?: string;
  codec?: string;
}

export interface Subtitle {
  lang?: string;
  label?: string;
  url: string;
}

export interface Episode {
  id: string;
  series_id: string;
  index: number;
  title?: string;
  thumbnail?: string;
  duration_sec?: number;
  is_free?: boolean;
  sources: Source[];
  subtitles?: Subtitle[];
}

export interface SeriesCard {
  id: string;
  title: string;
  original_title?: string;
  cover?: string;
  poster?: string;
  banner?: string;
  synopsis?: string;
  tags?: string[];
  category_id?: string;
  region?: string;
  release_year?: number;
  status?: string;
  total_episodes?: number;
  score?: number;
  views?: number;
  is_vip?: boolean;
  age_rating?: string;
}

export interface Series extends SeriesCard {
  episodes?: Episode[];
}

export interface HomeSection {
  id: string;
  title: string;
  layout?: string;
  items: SeriesCard[];
}

export interface Home {
  sections: HomeSection[];
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

/** 外部片单条目：只含公开元数据，无任何视频直链 */
export interface ExternalItem {
  id: string;
  title: string;
  cover_url?: string;
  episodes_text?: string;
  episodes?: number;
  source?: string;
  source_label?: string;
  category?: string;
  category_label?: string;
  detail_url?: string;
  media_type?: string;
  /** 时长文案（如「1 分 40 秒」）；缺省时用 episodes_text 兜底 */
  duration_text?: string;
  /** 采集期拿到的可直接播放地址（可选，优先级最高） */
  play_url?: string;
  /**
   * 已核实的「真实可免费播放」集数。
   * 来自源站明示的免费额度，写回脚本为 scripts/apply_free_episodes.mjs。
   * 为空表示尚未核实，此时前端回落展示 episodes_text。
   */
  playable_episodes?: number;
  /** 源站登记的全集数（含付费部分），用于「免费 3 集 / 全 227 集」的对照 */
  total_episodes_source?: number;
  /**
   * 已核实的展示文案，如「免费 3 集 / 全 227 集」。
   * 优先级高于 episodes_text —— 后者只是采集到的标称，通常远高于实际能看的集数。
   */
  playable_text?: string;
  /** 该条目的集数核实时间（ISO 8601） */
  verified_at?: string;
  /** 源站已下架（核对时返回 404）：展示为「已下架」，不再引导用户点进播放 */
  unavailable?: boolean;
  /** 源站已上线集数（更新到第几集）；小于全集表示仍在连载 */
  updated_episodes_source?: number;
  /** 连载状态：completed 已完结 / updating 连载中 */
  update_status?: 'completed' | 'updating';
  /** 连载状态文案，如「已完结」「更新至第 621 集」 */
  update_status_text?: string;
  /**
   * 逐集明细（仅真实可播的那些集）。
   * 源站本身不给每集起独立剧名，只有编号式标题，这里的 title 与源站保持一致。
   * vid 是源站的影片 ID —— 第 N 集的 URL 用 vid 而非序号拼，填错就只能拿到第 1 集。
   */
  episode_list?: { index: number; vid: string | null; title: string; playable?: boolean }[];
  /** 源站作品简介 */
  intro?: string;
  /** 源站标签（题材） */
  tags?: string[];
}

/** 外部片单播放模式：直链播放 > 站内嵌入 > 不可播（降级） */
export type ExternalPlayMode = 'direct' | 'embed' | 'blocked';

/** 降级原因码 —— 前端据此给出针对性文案，不要笼统说"播放失败" */
export type ExternalBlockReason =
  | 'no_adapter'          // 源站未在服务侧登记
  | 'host_not_allowed'    // 域名不在白名单（SSRF 防护命中）
  | 'frame_blocked'       // 源站用 X-Frame-Options / CSP 明确禁止被嵌入
  | 'frame_timeout'       // iframe 加载超时
  | 'unreachable'         // 源站首屏都拿不到（超时 / 5xx）
  | 'stream_expired'      // 直链返 403/404：防盗链或源已失效
  | 'parse_failed'        // 页面结构变了，解析不出播放流
  | 'item_not_found';     // 片单里查不到该 id

/** 一条可直接喂给 <video> / hls.js 的外部片源 */
export interface ExternalSource {
  url: string;
  container: 'hls' | 'mp4' | 'webm' | string;
  quality?: string;
  /** 经本站代理的同源地址；直链被 Referer 防盗链拦下时改用它 */
  proxied?: string;
  /** true 表示源站已知带防盗链，应优先走 proxied，别白试一次直链 */
  proxied_first?: boolean;
}

/**
 * GET /api/v1/ext/play 的响应。
 * 无论成功与否都返回 JSON：成功时 mode 为 direct/embed，
 * 不可播时 mode 为 blocked 并带 reason + message（HTTP 仍用 200 或 422，前端只看 mode）。
 */
export interface ExternalPlayback {
  item_id: string;
  title?: string;
  cover_url?: string;
  detail_url?: string;
  source_label?: string;
  category_label?: string;
  episodes_text?: string;
  duration_text?: string;

  mode: ExternalPlayMode;
  sources?: ExternalSource[];
  embed_url?: string;
  /** iframe sandbox 策略；服务端返回，前端不得自行放开 allow-top-navigation */
  sandbox?: string;
  reason?: ExternalBlockReason;
  message?: string;
  attribution?: string;
  checked_at?: number;
  ttl?: number;

  /**
   * 当前返回的是第几集（1 起）。
   * 存在意义：选集请求是异步的，返回体和当前 UI 状态可能错位（快速连点），
   * 前端以本字段为准渲染高亮，不假设「我点了第 N 集就一定拿到了第 N 集」。
   */
  episode?: number;
  /** 服务端能从源站解析出的可选集数（受源站放出的集数限制，可能远少于宣传的总集数） */
  total_playable?: number;
  /** 可选集列表；为空表示源站未给出剧集导航，按单集处理 */
  episodes?: { index: number; title?: string }[];
}

export interface ExternalCatalog {
  category: string;
  category_label: string;
  url?: string;
  total?: number;
}

export interface ExternalIndex {
  provider?: string;
  provider_label?: string;
  attribution?: string;
  catalogs: ExternalCatalog[];
  total?: number;
}

export interface ExternalList {
  catalog: string;
  category: string;
  category_label?: string;
  attribution?: string;
  total?: number;
  items: ExternalItem[];
}
