# -*- coding: utf-8 -*-
"""渲染采集入口：把"渲染引擎 + 配置"封装为一个函数，供各平台源调用。

各源在自己的 fetch() 中采用「渲染优先，空则回退静态 HTTP」：
    from .rendered_source import render_collect
    ps = render_collect(self.platform, ...)
    if ps: return ps
    # 回退原有静态解析
"""
import urllib.parse

from ..models import Product
from . import _render_engine
from .render_configs import RENDER_CONFIGS, PLATFORM_TO_CONFIG


def render_collect(platform, keyword, page=1, page_size=20,
                   cookie="", timeout=None):
    """按平台配置渲染采集，返回 List[Product]；不可用/失败返回 []。"""
    cfg_key = PLATFORM_TO_CONFIG.get(platform)
    if not cfg_key or cfg_key not in RENDER_CONFIGS:
        return []
    cfg = dict(RENDER_CONFIGS[cfg_key])
    cfg["_kw"] = keyword  # human 模式在首页搜索框输入原始关键词

    enc = cfg.get("enc", "utf-8")
    kw = urllib.parse.quote(keyword, encoding=enc, errors="replace")
    url = cfg["search"].format(kw=kw, page=page)

    rows = _render_engine.extract(url, cfg, timeout=int(timeout or cfg.get("timeout", 30)))
    if not rows:
        return []

    origin = urllib.parse.urlparse(url)
    base = origin.scheme + "://" + origin.netloc

    products, seen = [], set()
    for r in rows:
        price = _render_engine.parse_price(r.get("price"))
        if price <= 0:
            continue
        name = (r.get("name") or "").strip()
        if not name:
            name = keyword
        u = _render_engine.absolutize(r.get("url", ""), base)
        img = _render_engine.absolutize(r.get("image", ""), base)
        dedup = (name[:28], round(price, 1))
        if dedup in seen:
            continue
        seen.add(dedup)
        original = _render_engine.parse_price(r.get("original"))
        if not original or original <= price:
            original = 0.0
        shop = (r.get("shop") or "").strip() or cfg.get("default_shop", "")
        try:
            products.append(Product(
                platform=platform, name=name, price=price,
                original_price=original, sales=0,
                sales_text=(r.get("sales") or "").strip(),
                shop_rating=-1.0, shop_name=shop, url=u, image=img,
                keyword=keyword, raw={}))
        except Exception:
            continue
    return products[:page_size]
