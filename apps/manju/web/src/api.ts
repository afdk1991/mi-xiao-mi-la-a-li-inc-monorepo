import type {
  Category, Episode, ExternalIndex, ExternalList, ExternalPlayback, Home, Series,
} from './types';

/**
 * 数据层：所有请求都走带 .json 后缀的静态路径。
 *
 * 红线：不要在 edgeone.json 里新增 "source 以 :param 结尾、destination 再拼后缀"
 * 的 rewrite —— 那会把 /api/v1/series/x.json 重写成 x.json.json 导致全站 404。
 */
async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  // 必须显式 same-origin：EdgeOne 预览域名在路由前有 SSO 鉴权，
  // 靠 eo_token Cookie 放行。若用 credentials:'omit' 丢弃 Cookie，
  // XHR 会被拦成 401（本地无 SSO 测不出，只有线上浏览器实测才暴露）。
  const res = await fetch(path, { signal, credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

const enc = encodeURIComponent;

export const api = {
  home: (s?: AbortSignal) => getJson<Home>('api/v1/home.json', s),
  categories: (s?: AbortSignal) => getJson<{ items: Category[] }>('api/v1/categories.json', s),
  seriesList: (s?: AbortSignal) => getJson<{ items: Series['id'] extends string ? Series[] : never }>('api/v1/series.json', s),
  series: (id: string, s?: AbortSignal) => getJson<Series>(`api/v1/series/${enc(id)}.json`, s),
  episodes: (seriesId: string, s?: AbortSignal) =>
    getJson<{ items: Episode[] }>(`api/v1/series/${enc(seriesId)}/episodes.json`, s),
  episode: (epId: string, s?: AbortSignal) => getJson<Episode>(`api/v1/episodes/${enc(epId)}.json`, s),
  extIndex: (s?: AbortSignal) => getJson<ExternalIndex>('external/index.json', s),
  extList: (cat: string, s?: AbortSignal) => getJson<ExternalList>(`external/${enc(cat)}.json`, s),

  /**
   * 解析外部条目的可播性。
   *
   * 与其余接口不同：这里即便源站不可用，服务端也会返回**带 mode:'blocked' 的结构化
   * JSON**（HTTP 422），而不是空 body。所以必须先把 body 读出来再判 ok，
   * 否则降级原因会被吞掉，前端只能显示一句无用的"请求失败"。
   */
  extPlay: async (
    cat: string, id: string,
    opts?: { proxy?: boolean; signal?: AbortSignal; ep?: number },
  ) => {
    const q = new URLSearchParams({ cat, id });
    if (opts?.proxy) q.set('proxy', '1');
    // ep 是 1 起的集序号；省略时服务端按第 1 集处理
    if (typeof opts?.ep === 'number' && opts.ep > 0) q.set('ep', String(opts.ep - 1));
    const res = await fetch(`api/v1/ext/play?${q}`, {
      signal: opts?.signal,
      credentials: 'same-origin',
    });
    const body = await res.json().catch(() => null);
    if (body && typeof body === 'object' && 'mode' in (body as Record<string, unknown>)) {
      return body as ExternalPlayback;
    }
    throw new Error(`解析播放源失败（HTTP ${res.status}）`);
  },
};

/** 把外链地址改写成经本站代理的路径，用于绕过 Referer 防盗链。 */
export function proxiedUrl(src: string): string {
  return `api/v1/ext/proxy?src=${enc(src)}`;
}

/* ---------- 本地状态：已看过 / 续播进度 ---------- */

const SEEN_KEY = 'manju:seen';
const progKey = (epId: string) => `manju:progress:${epId}`;

export function seenSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function markSeen(id: string): void {
  const set = seenSet();
  if (set.has(id)) return;
  set.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

export function saveProgress(epId: string, t: number): void {
  try {
    localStorage.setItem(progKey(epId), String(Math.floor(t)));
  } catch { /* 隐私模式下忽略 */ }
}

export function loadProgress(epId: string): number {
  try {
    return Number(localStorage.getItem(progKey(epId)) || 0);
  } catch {
    return 0;
  }
}
