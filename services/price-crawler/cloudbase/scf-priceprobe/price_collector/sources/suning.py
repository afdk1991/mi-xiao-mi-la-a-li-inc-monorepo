# -*- coding: utf-8 -*-
"""苏宁易购数据源（真实采集，平台端重新开发）。

三条采集路径，按优先级：
1. 纯标准库 urllib（云端函数可直连，无签名 / 无需登录）：
   ① GET https://search.suning.com/<kw>/（UTF-8）→ 解析 item-wrap 卡片
      （商品名 / 主图 / 商品码 / vendor / brand / mdmGroup）；
   ② GET ds.suning.com/ds/generalForTile/... JSONP 批量补准确价格。
2. 浏览器渲染（Playwright，统一反检测引擎）：风控波动时的回退。
3. 旧静态 HTML / 内联 JSON 解析（兜底）。

任何路径失败静默降级，绝不崩溃、绝不伪造。
"""
import os
import re
import json
import random
import urllib.parse
import urllib.request
from typing import List

from .base import BaseSource
from . import _http
from ..models import Product

_SEARCH_URL = "https://search.suning.com/{kw}/"
_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0")

# 旧静态解析正则（兜底）
_NAME_RE = re.compile(r'(?:class="sell-point"|commodityName)"?[^>]*>\s*([^<>{"]{4,80})')
_TITLE_JSON_RE = re.compile(r'"(?:commodityName|title|productName)"\s*:\s*"([^"]{2,120})"')
_PRICE_RE = re.compile(r'(?:class="price"[^>]*>¥?\s*([\d.]+)|"(?:salePrice|price)"\s*:\s*"?([\d.]+)"?)')
_CODE_RE = re.compile(r'(?://product\.suning\.com/(\d+)\.html|"commodityCode"\s*:\s*"?(\d{6,})"?|"itemUrl"[^"]*?/(\d+)\.html)')
_IMG_RE = re.compile(r'(?:src="(//img[\d.-]*\.cn[^"]+?\.(?:jpg|png|webp))"|"prodImg"\s*:\s*"(//[^"]+?)")')
_SHOP_RE = re.compile(r'"(?:shopName|sellerName)"\s*:\s*"([^"]{2,60})"')


class SuningSource(BaseSource):
    platform = "suning"
    platform_name = "苏宁易购"

    can_live = lambda self: True

    def __init__(self, cookie: str = "", timeout: int = 10, **kwargs):
        self.cookie = cookie or os.environ.get("PC_COOKIE_SUNING") or os.environ.get("PC_COOKIE", "")
        try:
            self.timeout = int(timeout or os.environ.get("PC_TIMEOUT", "10"))
        except (ValueError, TypeError):
            self.timeout = 10

    def fetch(self, keyword: str, page: int = 1, page_size: int = 20) -> List[Product]:
        # 首选：纯 urllib（搜索 HTML + generalForTile 补价）
        ps = self._fetch_live(keyword, page, page_size)
        if ps:
            return ps
        # 回退 1：浏览器渲染
        try:
            from .rendered_source import render_collect
            ps = render_collect("suning", keyword, page, page_size, self.cookie)
            if ps:
                return ps
        except Exception:
            pass
        # 回退 2：旧静态解析
        url = _SEARCH_URL.format(kw=urllib.parse.quote(keyword))
        headers = {"Referer": "https://www.suning.com/"}
        if self.cookie:
            headers["Cookie"] = self.cookie
        try:
            html = _http.fetch_html(url, timeout=self.timeout, headers=headers)
        except Exception:
            return []
        return self._parse_old(html, keyword)[:page_size]

    # ---- 首选：纯 urllib ----
    def _get(self, url: str, referer: str = "https://www.suning.com/") -> str:
        return _http.get_text(url, headers={
            'Accept-Language': 'zh-CN', 'Referer': referer},
            timeout=self.timeout + 6)

    def _fetch_live(self, keyword: str, page: int, page_size: int) -> List[Product]:
        kw = urllib.parse.quote(keyword)
        try:
            html = self._get(_SEARCH_URL.format(kw=kw))
        except Exception:
            return []
        cards = []
        for b in re.split(r'(?=class="item-wrap)', html):
            try:
                mcode = re.search(r'dataPro="\|\|(\d+)\|\|', b)
                if not mcode:
                    continue
                mname = re.search(r'title-selling-point.*?<a[^>]*>(.*?)</a>', b, re.S)
                mimg = re.search(r'<img[^>]*src="(//imgservice[^"]+?)"', b)
                cards.append({
                    "code": mcode.group(1),
                    "vendor": (re.search(r'vendor="(\d+)"', b) or [None, ""])[1],
                    "brand": (re.search(r'brand_id="([\dA-Za-z]+)"', b) or [None, ""])[1],
                    "mdm": (re.search(r'mdmGroupId="([\w]+)"', b) or [None, "R9003417"])[1],
                    "name": re.sub(r'<[^>]+>', '', mname.group(1)).strip() if mname else "",
                    "img": ("https:" + mimg.group(1)) if mimg else "",
                })
            except Exception:
                continue
        if not cards:
            return []
        # generalForTile 批量补价
        info = {}

        def tile_url(group):
            parts = [f'{c["code"].zfill(18)}_____{c["mdm"]}_{c["brand"]}__' for c in group]
            cb = 'ds%012d' % random.randint(1, 999999999999)
            vendor = group[0].get("vendor") or "0000000000"
            tail = f'-025-2-{vendor}-1--{cb}.jsonp?callback={cb}'
            return 'https://ds.suning.com/ds/generalForTile/' + ','.join(parts) + tail

        for i in range(0, len(cards), 10):
            try:
                body = self._get(tile_url(cards[i:i + 10]),
                                 referer='https://search.suning.com/')
                m = re.search(r'\((\{.*\})\)', body, re.S)
                for r in json.loads(m.group(1)).get('rs', []):
                    info[r['cmmdtyCode']] = (
                        float(r.get('price') or 0), r.get('vendorName') or "")
            except Exception:
                continue
        result: List[Product] = []
        for c in cards:
            price, vname = info.get(c['code'].zfill(18), (0, ""))
            if price <= 0:
                continue
            vendor = c.get("vendor") or "0000000000"
            result.append(Product(
                platform="suning", name=c["name"] or keyword, price=price,
                original_price=0.0, sales=0, sales_text="", shop_rating=-1.0,
                shop_name=vname or "苏宁易购",
                url=f"https://product.suning.com/{vendor}/{c['code']}.html",
                image=c["img"], keyword=keyword, raw={}))
        return result[:page_size]

    # ---- 兜底：旧静态解析 ----
    @staticmethod
    def _parse_old(html: str, keyword: str) -> List[Product]:
        result: List[Product] = []
        price_raw = _PRICE_RE.findall(html)
        prices = [a or b for (a, b) in price_raw]
        names = _TITLE_JSON_RE.findall(html) or _NAME_RE.findall(html)
        code_raw = _CODE_RE.findall(html)
        codes = [a or b or c for (a, b, c) in code_raw]
        img_raw = _IMG_RE.findall(html)
        imgs = [a or b for (a, b) in img_raw]
        shops = _SHOP_RE.findall(html)
        for i in range(len(prices)):
            try:
                p = _http.parse_price(prices[i])
                if p <= 0:
                    continue
                code = codes[i] if i < len(codes) else ""
                url = f"https://product.suning.com/{code}.html" if code else ""
                img = imgs[i] if i < len(imgs) else ""
                if img and img.startswith("//"):
                    img = "https:" + img
                name = _strip_tags(names[i]) if i < len(names) else keyword
                shop = shops[i] if i < len(shops) else ""
                result.append(Product(
                    platform="suning", name=name, price=p, original_price=0.0,
                    sales=0, sales_text="", shop_rating=-1.0, shop_name=shop,
                    url=url, image=img, keyword=keyword, raw={},
                ))
            except Exception:
                continue
        return result


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "").strip()
