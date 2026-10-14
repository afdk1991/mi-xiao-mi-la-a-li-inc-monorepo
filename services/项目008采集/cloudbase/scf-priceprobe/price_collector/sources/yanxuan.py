# -*- coding: utf-8 -*-
"""网易严选数据源（真实抓取）。

可抓取性评级：需浏览器自动化（2026-09-25 已跑通）
入口 URL：https://you.163.com/search?keyword={kw}

两条解析路径：
1. 直连静态 HTML（urllib）：严选搜索页为前端 JS 渲染，静态仅含壳，通常为空。
2. 浏览器渲染（Playwright，开关 PRICE_COLLECTOR_BROWSER=1）：渲染后按
   `.m-product.j-product` 卡片解析 —— 2026-09-25 实测未登录即可取约 56 条
   真实商品（名称 / 价格 / 原价 / 主图 / 详情链接）。

未装 playwright / 未开开关 / 渲染失败一律静默降级，绝不崩溃、绝不伪造。
"""
import os
import re
import json
import urllib.parse
from typing import List

from .base import BaseSource
from . import _http, _browser
from ..models import Product

_SEARCH_URL = "https://you.163.com/search?keyword={kw}"

# 直连静态 HTML 内联 JSON 的尽力解析正则
_NAME_RE = re.compile(r'"(?:name|title|spuName|itemName)"\s*:\s*"([^"]+)"')
_PRICE_RE = re.compile(r'"(?:price|salePrice|showPrice|counterPrice)"\s*:\s*"?([\d.]+)')
_ORIG_RE = re.compile(r'"(?:originPrice|originalPrice|marketPrice|jpgPrice)"\s*:\s*"?([\d.]+)')
_IMG_RE = re.compile(r'"(?:mainPicUrl|imgUrl|image|picUrl)"\s*:\s*"(//[^"]+?)"')
_URL_RE = re.compile(r'"(?:itemId|spuId|productId)"\s*:\s*"?(\d+)"')

# 渲染后卡片切分锚点
_CARD_SPLIT_RE = re.compile(r'(?=class="m-product j-product)')
_CARD_ID_RE = re.compile(r'/item/detail\?id=(\d+)')
_CARD_TITLE_RE = re.compile(r'title="([^"]{2,}?)"')
_CARD_IMG_RE = re.compile(
    r'(?:data-original|src)="(https?://yanxuan-item\.nosdn\.127\.net/[^"]+?)"')
# 去标签后在纯文本中提取 ¥数字（避开 data-reactid 等属性里的数字）
_TAG_RE = re.compile(r'<[^>]+>')
_CARD_PRICE_RE = re.compile(r'¥\s*(\d+(?:\.\d+)?)')


class YanxuanSource(BaseSource):
    platform = "yanxuan"
    platform_name = "网易严选"

    can_live = lambda self: True

    def __init__(self, cookie: str = "", timeout: int = 10, **kwargs):
        self.cookie = (
            cookie
            or os.environ.get("PC_COOKIE_YANXUAN")
            or os.environ.get("PC_COOKIE", "")
        )
        try:
            self.timeout = int(timeout or os.environ.get("PC_TIMEOUT", "10"))
        except (ValueError, TypeError):
            self.timeout = 10

    def fetch(self, keyword: str, page: int = 1, page_size: int = 20) -> List[Product]:
        # 首选：官方 JSON 数据接口（纯标准库 urllib，无签名，云端函数可直连）
        ps = self._fetch_json(keyword, page, page_size)
        if ps:
            return ps
        # 回退 1：浏览器渲染（统一反检测引擎）
        try:
            from .rendered_source import render_collect
            ps = render_collect("yanxuan", keyword, page, page_size, self.cookie)
            if ps:
                return ps
        except Exception:
            pass
        # 回退 2：直连静态 HTML 内联 JSON
        url = _SEARCH_URL.format(kw=urllib.parse.quote(keyword))
        headers = {"Referer": "https://you.163.com/"}
        if self.cookie:
            headers["Cookie"] = self.cookie
        html = ""
        try:
            html = _http.fetch_html(url, timeout=self.timeout, headers=headers)
        except Exception:
            html = ""
        return self._parse_static(html, keyword)[:page_size] if html else []

    # ---- 首选：官方 JSON 接口 ----
    def _fetch_json(self, keyword: str, page: int, page_size: int) -> List[Product]:
        import time as _time
        ts = int(_time.time() * 1000)
        params = [('__timestamp', ts), ('page', page), ('sortType', 0), ('categoryId', 0),
                  ('descSorted', 'true'), ('matchType', 0), ('floorPrice', -1),
                  ('upperPrice', -1), ('stillSearch', 'false'), ('searchWordSource', 1),
                  ('size', 40), ('keyword', keyword), ('needPopWindow', 'false')]
        url = ('https://you.163.com/xhr/search/search.json?'
               + urllib.parse.urlencode(params))
        try:
            body = _http.get_text(url, headers={
                'Referer': 'https://you.163.com/search?keyword=x',
                'Accept': 'application/json'}, timeout=self.timeout + 8)
            items = json.loads(body)['data']['directly']['searcherResult']['result']
        except Exception:
            return []
        result: List[Product] = []
        for it in items:
            try:
                price = float(it.get('retailPrice') or 0)
                if price <= 0:
                    continue
                iid = it.get('id')
                counter = float(it.get('counterPrice') or 0)
                original = counter if counter > price else 0.0
                result.append(Product(
                    platform="yanxuan", name=it.get('name') or keyword, price=price,
                    original_price=original, sales=0, sales_text="",
                    shop_rating=-1.0, shop_name="网易严选",
                    url=f"https://you.163.com/item/detail?id={iid}",
                    image=it.get('primaryPicUrl') or it.get('listPicUrl') or "",
                    keyword=keyword, raw={}))
            except Exception:
                continue
        return result[:page_size]

    # ---- 回退：直连静态 HTML 内联 JSON ----
    @staticmethod
    def _parse_static(html: str, keyword: str) -> List[Product]:
        result: List[Product] = []
        names = _NAME_RE.findall(html)
        prices = _PRICE_RE.findall(html)
        origs = _ORIG_RE.findall(html)
        imgs = _IMG_RE.findall(html)
        ids = _URL_RE.findall(html)
        for i, price in enumerate(prices[:50]):
            try:
                p = _http.parse_price(price)
                if p <= 0:
                    continue
                img = imgs[i] if i < len(imgs) else ""
                if img and img.startswith("//"):
                    img = "https:" + img
                u = ""
                if i < len(ids):
                    u = "https://you.163.com/item/detail?id=" + str(ids[i])
                name = _strip_tags(names[i]) if i < len(names) else keyword
                original = _http.parse_price(origs[i]) if i < len(origs) else 0.0
                result.append(Product(
                    platform="yanxuan", name=name, price=p, original_price=original,
                    sales=0, sales_text="", shop_rating=-1.0, shop_name="网易严选",
                    url=u, image=img, keyword=keyword, raw={},
                ))
            except Exception:
                continue
        return result

    # ---- 路径 2：渲染后 .m-product 卡片 ----
    @staticmethod
    def _parse_rendered(html: str, keyword: str) -> List[Product]:
        result: List[Product] = []
        blocks = _CARD_SPLIT_RE.split(html)
        for b in blocks:
            if not b.startswith('class="m-product j-product'):
                continue
            try:
                mid = _CARD_ID_RE.search(b)
                mtitle = _CARD_TITLE_RE.search(b)
                mimg = _CARD_IMG_RE.search(b)
                # 纯文本中按 ¥ 提取：第 1 个为现价，第 2 个为原价
                text_only = _TAG_RE.sub(" ", b)
                prices = _CARD_PRICE_RE.findall(text_only)
                price = float(prices[0]) if prices else 0.0
                if price <= 0:
                    continue
                original = float(prices[1]) if len(prices) > 1 else 0.0
                item_id = mid.group(1) if mid else ""
                u = ("https://you.163.com/item/detail?id=" + item_id) if item_id else ""
                img = mimg.group(1).replace("&amp;", "&") if mimg else ""
                name = mtitle.group(1) if mtitle else keyword
                result.append(Product(
                    platform="yanxuan", name=name, price=price, original_price=original,
                    sales=0, sales_text="", shop_rating=-1.0, shop_name="网易严选",
                    url=u, image=img, keyword=keyword, raw={},
                ))
            except Exception:
                continue
        return result


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "").strip()
