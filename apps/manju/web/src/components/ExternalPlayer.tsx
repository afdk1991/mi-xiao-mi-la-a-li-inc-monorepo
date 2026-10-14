import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { api } from '../api';
import type { ExternalBlockReason, ExternalItem, ExternalPlayback, ExternalSource } from '../types';

/**
 * 外部片单播放器 —— 站内播放的唯一入口
 *
 * 三档降级，优先级从高到低：
 *   1. direct  拿到可用流地址 → <video> / hls.js 真站内播放（体验最好）
 *   2. embed   拿不到流但源站允许被嵌 → sandbox iframe 呈现源站播放器（仍在站内）
 *   3. blocked 都不行 → 统一失败面板
 *
 * 两条硬红线：
 *   - 任何情况下都不会自动跳转或新开标签页；去原站必须用户先点一次、再确认一次。
 *   - iframe sandbox 由服务端下发，且绝不能含 allow-top-navigation，
 *     否则第三方页面能把顶层导航劫持走，站内播放就名存实亡。
 */

/** ready = 数据已就绪但还没播（被浏览器自动播放策略挡住，等用户点一下） */
type Stage = 'probing' | 'loading' | 'ready' | 'playing' | 'failed';
type FailureCode =
  | 'network' | 'cors' | 'hotlink' | 'expired' | 'decode'
  | 'frame_blocked' | 'frame_timeout' | 'unknown';

interface Failure {
  code: FailureCode;
  title: string;
  detail: string;
  hint?: string;
  retryable: boolean;
}

/** 失败原因 → 面向用户的文案。别笼统写"播放失败"，用户无从判断该怎么办。 */
const FAILURE_TEXT: Record<FailureCode, Omit<Failure, 'code'>> = {
  network: {
    title: '片源加载失败',
    detail: '没能连上播放服务，可能是网络波动或源站临时不可用。',
    hint: '可以点重试；若反复失败，多半是源站侧的问题。',
    retryable: true,
  },
  cors: {
    title: '跨域限制',
    detail: '源站不允许本站直接读取这段视频（缺少跨域授权），浏览器已拒绝该请求。',
    hint: '已自动尝试改用本站转发通道；若仍失败，说明源站同时封锁了转发。',
    retryable: true,
  },
  hotlink: {
    title: '源站防盗链拦截',
    detail: '该来源校验了请求来源（Referer），直接播放会被拒绝。',
    hint: '本站已尝试经服务端转发以绕过该校验，未成功则无法继续。',
    retryable: true,
  },
  expired: {
    title: '片源已失效',
    detail: '这个地址已经过期或资源被下架（HTTP 403/404）。',
    hint: '第三方片源常有期限，重试通常无效；可等本站下次采集更新。',
    retryable: false,
  },
  decode: {
    title: '格式不受支持',
    detail: '当前浏览器无法解码这段视频的编码格式。',
    hint: '可换用 Chrome / Edge 等浏览器再试。',
    retryable: false,
  },
  frame_blocked: {
    title: '源站禁止嵌入播放',
    detail: '该站点明确声明不允许被其他站点嵌入，浏览器会直接拦掉。',
    hint: '这是源站的安全策略，任何第三方站点都无法绕过。',
    retryable: false,
  },
  frame_timeout: {
    title: '嵌入加载超时',
    detail: '源站页面在限定时间内没有完成加载，可能被网络策略或地区限制阻断。',
    hint: '可重试一次；若持续超时通常是网络可达性问题。',
    retryable: true,
  },
  unknown: {
    title: '无法在该来源播放',
    detail: '尝试了直连、转发、嵌入三种方式均未成功。',
    hint: '可先重试，仍不行请选择其他来源的条目。',
    retryable: true,
  },
};

function mkFailure(code: FailureCode): Failure {
  return { code, ...FAILURE_TEXT[code] };
}

/** 服务端下发的 blocked 原因 → 前端失败语义 */
function fromReason(reason?: ExternalBlockReason): Failure {
  switch (reason) {
    case 'stream_expired': return mkFailure('expired');
    case 'frame_blocked': return mkFailure('frame_blocked');
    case 'host_not_allowed':
    case 'no_adapter': return mkFailure('unknown');
    case 'unreachable': return mkFailure('network');
    default: return mkFailure('unknown');
  }
}

/** HTMLMediaElement 错误码 → 失败语义 */
function mediaFailure(v: HTMLVideoElement, triedProxy: boolean): Failure {
  const e = v.error;
  switch (e?.code) {
    case MediaError.MEDIA_ERR_ABORTED: return mkFailure('network');
    case MediaError.MEDIA_ERR_NETWORK: return mkFailure('network');
    case MediaError.MEDIA_ERR_DECODE: return mkFailure('decode');
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      // 走到这里通常是源站拒绝了请求（防盗链/跨域），且我们已经试过转发
      return mkFailure(triedProxy ? 'hotlink' : 'cors');
    default: return mkFailure('unknown');
  }
}

/**
 * 构造候选播放地址：每个源给出「直链」与「转发通道」两种走法。
 *
 * 顺序由服务端下发的 proxied_first 决定：源站已知带 Referer 防盗链时
 * （浏览器直连必然 403），优先走转发通道，省掉一次注定失败的尝试。
 */
function buildAttempts(sources: ExternalSource[]): { url: string; container: string; viaProxy: boolean }[] {
  const out: { url: string; container: string; viaProxy: boolean }[] = [];
  for (const s of sources) {
    const direct = s.url ? { url: s.url, container: s.container, viaProxy: false } : null;
    const viaProxy = s.proxied ? { url: s.proxied, container: s.container, viaProxy: true } : null;
    if (s.proxied_first) {
      if (viaProxy) out.push(viaProxy);
      if (direct) out.push(direct);
    } else {
      if (direct) out.push(direct);
      if (viaProxy) out.push(viaProxy);
    }
  }
  return out;
}

const FRAME_TIMEOUT_MS = 15000;

/** sandbox 收不住就等于把用户拱手送走，所以缺省值同样不含 allow-top-navigation */
const FALLBACK_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-autoplay';

export default function ExternalPlayer({
  cat, item, onOpenOriginal,
}: {
  cat: string;
  item: ExternalItem;
  /** 用户二次确认后才回调，由上层决定是否开窗；本组件永不自行导航 */
  onOpenOriginal: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const frameTimer = useRef<number | null>(null);
  /** 用户是否真正播放过——用于区分「等首次播放」和「用户主动暂停」 */
  const startedRef = useRef(false);

  const [pb, setPb] = useState<ExternalPlayback | null>(null);
  const [stage, setStage] = useState<Stage>('probing');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sourceIdx, setSourceIdx] = useState(0);
  const [triedProxy, setTriedProxy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** 当前选择的集序号（1 起）。源站的集号要从 SSR 里的 vid 映射过来，不是连续整数 */
  const [ep, setEp] = useState(1);
  /** 切换集时 pb 会短暂为 null，用它兜住选集条，避免整排按钮闪断 */
  const [epsCache, setEpsCache] = useState<{ index: number; title?: string }[]>([]);
  /** 切集请求进行中：禁用按钮，防止连点把多次请求的结果错位覆盖 */
  const [switching, setSwitching] = useState(false);

  // ⚠️ 必须 useMemo：buildAttempts 每次调用都返回新数组、新对象。
  // 若直接在函数体里算，下面挂载 <video> 的 effect 会因 current 引用每轮都变
  // 而反复执行，每次都调 v.load() 把加载重置掉 —— 表现是 video 永远停在
  // readyState=0 / networkState=NETWORK_NO_SOURCE，却查不出任何网络错误。
  const attempts = useMemo(() => (pb?.sources ? buildAttempts(pb.sources) : []), [pb]);
  const current = attempts[Math.min(sourceIdx, attempts.length - 1)];

  /* ---------- 探测可播性 ---------- */
  const probe = useCallback(async (signal?: AbortSignal) => {
    setStage('probing');
    setFailure(null);
    setSourceIdx(0);
    setTriedProxy(false);
    startedRef.current = false;
    try {
      const res = await api.extPlay(cat, item.id, { signal, ep });
      // 切集请求可能乱序返回；已失效的那次不要覆盖新结果
      setPb((prev) => (prev && res.mode === 'blocked' && prev.mode !== 'blocked' ? prev : res));
      setSwitching(false);
      if (res.mode === 'blocked') {
        setFailure(fromReason(res.reason));
        setStage('failed');
      } else {
        setStage('loading');
      }
    } catch {
      setSwitching(false);
      setFailure(mkFailure('network'));
      setStage('failed');
    }
  }, [cat, item.id, ep]);

  useEffect(() => {
    const ac = new AbortController();
    void probe(ac.signal);
    return () => ac.abort();
  }, [probe, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  /** 切换集数：重置全部播放态，避免沿用上一集的 player / 失败信息 */
  const switchEp = (n: number) => {
    if (n === ep) return;
    setSwitching(true);
    setPb(null);
    setFailure(null);
    setSourceIdx(0);
    setTriedProxy(false);
    startedRef.current = false;
    setEp(n);
  };

  /** 手动重试时把已经失败的地址往后挪一位，别原地打转 */
  const retryNextSource = () => {
    if (attempts.length > 1 && sourceIdx < attempts.length - 1) {
      setSourceIdx((i) => i + 1);
      setStage('loading');
      setFailure(null);
    } else {
      retry();
    }
  };

  /* ---------- direct：挂载 sources ---------- */
  useEffect(() => {
    if (!pb || pb.mode !== 'direct' || !current) return;
    const v = videoRef.current;
    if (!v) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;
    setStage('loading');
    setFailure(null);
    if (current.viaProxy) setTriedProxy(true);

    const isHls = (current.container || '').toLowerCase() === 'hls'
      || /\.m3u8(\?|#|$)/i.test(current.url);

    if (isHls && Hls.isSupported()) {
      const h = new Hls({ enableWorker: true });
      hlsRef.current = h;
      h.loadSource(current.url);
      h.attachMedia(v);
      h.on(Hls.Events.MANIFEST_PARSED, () => {
        setStage('playing');
        v.play().catch(() => { /* 自动播放被拦截，留大播放键 */ });
      });
      h.on(Hls.Events.ERROR, (_e, data) => {
        if (!data?.fatal) return;
        const status = (data.response as { status?: number } | undefined)?.status || 0;
        // 403/404/410 是明确的源失效或防盗链，重试同一地址没有意义
        if (status === 403 || status === 404 || status === 410) {
          h.destroy();
          hlsRef.current = null;
          setFailure(mkFailure(status === 410 ? 'hotlink' : 'expired'));
          setStage('failed');
          return;
        }
        handleAdvanceOrFail(data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'network' : 'decode');
      });
      return () => { h.destroy(); hlsRef.current = null; };
    }

    if (isHls && v.canPlayType('application/x-mpegURL')) {
      v.src = current.url;
      setStage('loading');
      return;
    }

    v.src = current.url;
    v.load();
    // 依赖只放基础值（pb 引用 + 序号），不放 current 对象：
    // 即便 useMemo 哪天被改动，这里也不会退化成每轮重跑 load()
  }, [pb, sourceIdx]);

  const handleAdvanceOrFail = (code: FailureCode) => {
    if (attempts.length > 1 && sourceIdx < attempts.length - 1) {
      setSourceIdx((i) => i + 1);
      setStage('loading');
      return;
    }
    setFailure(mkFailure(code));
    setStage('failed');
  };

  /* ---------- media 事件 ---------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlaying = () => { startedRef.current = true; setStage('playing'); };
    const onWaiting = () => setStage('loading');
    // 数据够了但还没开始播：浏览器要求先有用户手势（有声音的视频不许自动播）。
    // 只有「用户还没播过」时才提示，避免暂停时反复盖住原生控制条。
    const onCanPlay = () => {
      if (startedRef.current) return;
      if (videoRef.current && videoRef.current.paused) setStage('ready');
    };
    const onError = () => {
      setFailure(mediaFailure(v, triedProxy));
      setStage('failed');
    };
    v.addEventListener('playing', onPlaying);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('error', onError);
    return () => {
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('error', onError);
    };
    // 依赖携带 pb?.mode：<video> 是在探测出 direct 之后才挂载的，
    // 少了它，监听就会绑在还不存在的元素上。
  }, [pb?.mode, triedProxy]);

  /* ---------- embed：超时兜底 ---------- */
  useEffect(() => {
    if (pb?.mode !== 'embed') return;
    setStage('loading');
    frameTimer.current = window.setTimeout(() => {
      setStage((s) => {
        if (s === 'playing') return s;
        setFailure(mkFailure('frame_timeout'));
        return 'failed';
      });
    }, FRAME_TIMEOUT_MS);
    return () => { if (frameTimer.current) window.clearTimeout(frameTimer.current); };
  }, [pb, attempt]);

  const onFrameLoad = () => {
    if (frameTimer.current) window.clearTimeout(frameTimer.current);
    setStage('playing');
  };

  const modeLabel = pb?.mode === 'direct' ? '本站播放器'
    : pb?.mode === 'embed' ? '来源站内嵌' : '不可播放';

  /*
   * 剧集清单要缓存一份：切集时会先把 pb 置 null 让播放器卸载旧实例，
   * 若直接用 pb.episodes，选集条会在切换瞬间整排消失再闪回来。
   */
  useEffect(() => {
    if (pb?.episodes?.length) setEpsCache(pb.episodes);
  }, [pb]);

  /*
   * 清单来源优先级：静态数据里的逐集明细 > 服务端实时解析 > 缓存。
   * 逐集明细是核对时落到 item 上的，首屏就有；等服务端返回后它俩应当一致，
   * 不一致时以服务端为准——它是此刻真实取到的流，比快照新。
   */
  const localEps = item.episode_list || [];
  const eps = pb?.episodes?.length
    ? pb.episodes
    : (epsCache.length ? epsCache : localEps);
  // 以服务端返回的 episode 为准：网络往返期间它可能与用户点击的目标不一致
  const currentEp = pb?.episode ?? ep;
  const totalPlayable = pb?.total_playable ?? eps.length;

  return (
    <div className="exp">
      <div className="exp-stage">
        {/* ---- direct ---- */}
        {pb?.mode === 'direct' && (
          <video
            ref={videoRef}
            className="exp-video"
            playsInline
            controls
            preload="metadata"
            poster={item.cover_url}
          />
        )}

        {/* ---- embed ---- */}
        {pb?.mode === 'embed' && pb.embed_url && (
          <iframe
            key={attempt}
            className="exp-frame"
            src={pb.embed_url}
            title={item.title}
            sandbox={pb.sandbox || FALLBACK_SANDBOX}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={onFrameLoad}
          />
        )}

        {/* ---- 加载中 / 解析中 ---- */}
        {(stage === 'probing' || stage === 'loading') && (
          <div className="exp-overlay">
            <div className="spin" />
            <p>{stage === 'probing' ? '正在解析可用的播放源…' : '正在缓冲，请稍候…'}</p>
          </div>
        )}

        {/* ---- 就绪待播 ----
            数据已加载完，但浏览器自动播放策略要求先有用户手势（有声音的视频
            不允许自动播放）。此时如果继续显示「正在缓冲」，用户会以为卡死了。
            所以必须换成一个明确的播放入口。 */}
        {stage === 'ready' && (
          <button
            type="button"
            className="exp-overlay exp-ready"
            onClick={() => { void videoRef.current?.play().catch(() => {}); }}
          >
            <span className="exp-play-btn" aria-hidden="true">▶</span>
            <p>点击播放（{Math.round(videoRef.current?.duration || 0)} 秒）</p>
          </button>
        )}

        {/* ---- 统一失败面板 ---- */}
        {stage === 'failed' && failure && (
          <div className="exp-fail">
            <div className="exp-fail-tag">{failure.title}</div>
            <p className="exp-fail-detail">{failure.detail}</p>
            {failure.hint && <p className="exp-fail-hint">{failure.hint}</p>}
            {pb?.message && <p className="exp-fail-src">来源返回：{pb.message}</p>}
            <div className="exp-fail-ops">
              {failure.retryable && (
                <button className="btn" onClick={failure.code === 'frame_timeout' ? retry : retryNextSource}>
                  重试播放
                </button>
              )}
              <button className="btn ghost" onClick={() => setConfirmOpen(true)}>
                仍要前往原站
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- 状态条 ---- */}
      <div className="exp-bar">
        <span className={`exp-mode exp-mode-${pb?.mode ?? 'pending'}`}>{modeLabel}</span>
        <span className="exp-note">
          {failure ? failure.title : '播放全程停留在本站页面内'}
        </span>
        {pb?.sources && pb.sources.length > 1 && stage !== 'failed' && (
          <span className="exp-cnt">共 {pb.sources.length} 个候选源</span>
        )}
        <button className="btn small" onClick={retry}>重新检测</button>
      </div>

      {/* ---- 选集 ----
           源站只放出它愿意免费播的那些集（其余是锁图标、点开即 404），
           所以这里按已核实的清单渲染，不用 item.episodes 的宣称值——
           否则会渲染出几十个点了就报错的按钮。 */}
      {eps.length > 1 && (
        <div className="exp-eps">
          <div className="exp-eps-head">
            共可选 {totalPlayable} 集
            {item.update_status_text ? `　${item.update_status_text}` : ''}
            {item.episodes_text ? `（来源站登记 ${item.episodes_text}，实际可播以本清单为准）` : ''}
          </div>
          <div className="eplist">
            {eps.map((e) => (
              <button
                key={e.index}
                type="button"
                className={`epbtn${currentEp === e.index ? ' active' : ''}`}
                disabled={switching}
                aria-current={currentEp === e.index ? 'true' : undefined}
                onClick={() => switchEp(e.index)}
              >
                {e.title || `第 ${e.index} 集`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- 二次确认：默认不跳，必须用户显式确认 ---- */}
      {confirmOpen && item.detail_url && (
        <div className="exp-confirm" role="dialog" aria-modal="true">
          <div className="exp-confirm-box">
            <h3>确认离开本站？</h3>
            <p>
              该条目无法在站内播放（{failure?.title || '未知原因'}）。
              继续将在<strong>新标签页</strong>打开站外页面，本站无法控制其内容、广告与跳转行为，
              也不再承担后续的任何安全与版权责任。
            </p>
            <p className="exp-url">{item.detail_url}</p>
            <div className="exp-confirm-ops">
              <button className="btn ghost" onClick={() => setConfirmOpen(false)}>继续留在站内</button>
              <button
                className="btn danger"
                onClick={() => { setConfirmOpen(false); onOpenOriginal(); }}
              >
                我已了解，前往原站
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
