# -*- coding: utf-8 -*-
"""统一浏览器渲染采集引擎（Playwright）——平台端重新开发的真实采集内核。

两种采集模式（由配置决定）：
- direct：直接 goto 搜索 URL（适合静态/弱反爬，如 dangdang、amazon）。
- human：持久化用户目录 + 打开首页 + 真人在搜索框输入 + 回车（带首页预热、
  cookie 复用，规避对"直跳搜索页"的风控，如 suning）。

线程安全：全局锁把渲染串行化（浏览器为重资源），每次调用独立浏览器/上下文，
不跨线程复用 Playwright 对象。
反检测：隐藏 webdriver、补全插件/语言/chrome、伪装 WebGL；launch 依次尝试
真实 Chrome → Edge → 自带 Chromium。
零依赖降级：playwright 缺失 / 未启用 / 任何异常 → 返回 []，由各源回退。

环境开关：
- PRICE_COLLECTOR_BROWSER=0 关闭渲染（默认启用）
- PC_HEADLESS=0 使用有头窗口（默认无头；云端必须无头）
"""
import os
import re
import tempfile
import threading

_LOCK = threading.Lock()

_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0")

_STEALTH = """
Object.defineProperty(navigator,'webdriver',{get:()=>undefined});
Object.defineProperty(navigator,'languages',{get:()=>['zh-CN','zh','en']});
Object.defineProperty(navigator,'plugins',{get:()=>[1,2,3,4,5]});
window.chrome={runtime:{},app:{},csi:()=>{},loadTimes:()=>{}};
const gp=WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter=function(p){
 if(p===37445)return 'Google Inc. (Intel)';
 if(p===37446)return 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)';
 return gp.call(this,p);
};
const qp=window.navigator.permissions&&window.navigator.permissions.query;
if(qp)window.navigator.permissions.query=(p)=>p.name==='notifications'
  ?Promise.resolve({state:Notification.permission}):qp(p);
"""

_LAUNCH_ARGS = ["--disable-blink-features=AutomationControlled",
                "--no-sandbox", "--disable-dev-shm-usage",
                "--disable-infobars"]

_EXTRACT_JS = """
(cfg) => {
  const cards = [].slice.call(document.querySelectorAll(cfg.card), 0, cfg.limit || 60);
  const pick = (c, sels, attr) => {
    sels = sels || [];
    for (const s of sels) {
      let e = null;
      try { e = c.querySelector(s); } catch (_) { e = null; }
      if (e) {
        let v = attr ? e.getAttribute(attr) : (e.textContent || '');
        if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
      }
    }
    return '';
  };
  const pickImg = (c) => {
    for (const a of [cfg.image_attr || 'src', 'data-src', 'data-original', 'src']) {
      const v = pick(c, cfg.image, a);
      if (v) return v;
    }
    return '';
  };
  return cards.map(c => {
    let url = pick(c, cfg.url, 'href');
    if (!url) { const a = c.closest('a'); if (a) url = a.getAttribute('href') || ''; }
    return {
      name: pick(c, cfg.name, cfg.name_attr || null),
      price: pick(c, cfg.price, null),
      original: pick(c, cfg.original || [], null),
      image: pickImg(c),
      url: url,
      shop: pick(c, cfg.shop || [], null),
      sales: pick(c, cfg.sales || [], null),
    };
  });
}
"""

_PRICE_RE = re.compile(r"(\d+(?:\.\d+)?)")


def rendering_enabled() -> bool:
    return os.environ.get("PRICE_COLLECTOR_BROWSER", "1") != "0"


def _headless(cfg) -> bool:
    if os.environ.get("PC_HEADLESS", "1") == "0":
        return False
    return bool(cfg.get("headless", True))


def available() -> bool:
    try:
        import playwright  # noqa: F401
        return True
    except Exception:
        return False


def _profile_dir(tag: str) -> str:
    base = os.path.join(tempfile.gettempdir(), "pc_render_prof")
    d = os.path.join(base, re.sub(r"[^a-zA-Z0-9_]", "_", tag))
    os.makedirs(d, exist_ok=True)
    return d


def _try_launch(p, persistent, user_dir, cfg, headless):
    common = dict(headless=headless, args=_LAUNCH_ARGS,
                  ignore_default_args=["--enable-automation"])
    for extra in ({"channel": "chrome"}, {"channel": "msedge"}, {}):
        try:
            if persistent:
                return p.chromium.launch_persistent_context(
                    user_dir, user_agent=_UA,
                    viewport={"width": 1440, "height": 900},
                    locale=cfg.get("locale", "zh-CN"),
                    timezone_id=cfg.get("timezone", "Asia/Shanghai"),
                    **dict(common, **extra))
            return p.chromium.launch(**dict(common, **extra))
        except Exception:
            continue
    return None


def _dismiss(pg, selectors):
    for s in selectors or []:
        try:
            e = pg.query_selector(s)
            if e:
                e.click(timeout=1200)
                pg.wait_for_timeout(250)
        except Exception:
            continue


def _new_context(browser, cfg):
    ctx = browser.new_context(
        user_agent=_UA, viewport={"width": 1440, "height": 900},
        locale=cfg.get("locale", "zh-CN"),
        timezone_id=cfg.get("timezone", "Asia/Shanghai"))
    ctx.add_init_script(_STEALTH)
    return ctx


def _collect_page(pg, cfg):
    pg.wait_for_timeout(600)
    _dismiss(pg, cfg.get("close"))
    try:
        pg.wait_for_selector(cfg["card"], timeout=9000)
    except Exception:
        pass
    _dismiss(pg, cfg.get("close"))
    for _ in range(int(cfg.get("scroll", 3))):
        pg.mouse.wheel(0, 1400)
        pg.wait_for_timeout(450)
    return pg.evaluate(_EXTRACT_JS, cfg) or []


def _run_direct(p, url, cfg, timeout):
    browser = _try_launch(p, False, None, cfg, _headless(cfg))
    if browser is None:
        return []
    try:
        ctx = _new_context(browser, cfg)
        pg = ctx.new_page()
        pg.goto(url, wait_until="domcontentloaded",
                timeout=int(timeout) * 1000)
        return _collect_page(pg, cfg)
    except Exception:
        return []
    finally:
        try:
            browser.close()
        except Exception:
            pass


def _run_human(p, cfg, timeout):
    tag = cfg.get("profile", cfg.get("home", "prof"))
    user_dir = _profile_dir(tag)
    ctx = _try_launch(p, True, user_dir, cfg, _headless(cfg))
    if ctx is None:
        return []
    try:
        ctx.add_init_script(_STEALTH)
        pg = ctx.pages[0] if ctx.pages else ctx.new_page()
        pg.goto(cfg["home"], wait_until="domcontentloaded",
                timeout=int(timeout) * 1000)
        pg.wait_for_timeout(2200)
        _dismiss(pg, cfg.get("close"))
        box = None
        for b in cfg.get("box", []):
            try:
                if pg.query_selector(b):
                    box = b
                    break
            except Exception:
                continue
        if not box:
            return []
        pg.click(box)
        pg.fill(box, cfg["_kw"])
        pg.wait_for_timeout(600)
        sp = pg
        try:
            with pg.expect_event("popup", timeout=6000) as pop:
                pg.keyboard.press("Enter")
            sp = pop.value
        except Exception:
            pg.keyboard.press("Enter")
            pg.wait_for_timeout(2500)
            sp = pg
        sp.wait_for_load_state("domcontentloaded")
        sp.wait_for_timeout(2500)
        return _collect_page(sp, cfg)
    except Exception:
        return []
    finally:
        try:
            ctx.close()
        except Exception:
            pass


def extract(url, cfg, timeout=30):
    """渲染并按 cfg 提取原始字段；失败返回 []。human 模式需 cfg['_kw']。"""
    if not rendering_enabled() or not available():
        return []
    from playwright.sync_api import sync_playwright
    with _LOCK:
        try:
            with sync_playwright() as p:
                if cfg.get("home") and cfg.get("box"):
                    return _run_human(p, cfg, timeout)
                return _run_direct(p, url, cfg, timeout)
        except Exception:
            return []


def parse_price(text):
    if not text:
        return 0.0
    m = _PRICE_RE.search(str(text).replace(",", ""))
    try:
        return float(m.group(1)) if m else 0.0
    except Exception:
        return 0.0


def absolutize(url, base_origin):
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("/"):
        return base_origin + url
    return base_origin + "/" + url.lstrip("/")
