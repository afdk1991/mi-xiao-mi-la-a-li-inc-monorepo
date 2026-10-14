# -*- coding: utf-8 -*-
"""小米有品数据源（真实采集，平台端重新开发）。

三条采集路径，按优先级：
1. 官方 mtop JSON 接口（POST，纯标准库 urllib，无签名）：
   https://www.xiaomiyoupin.com/mtop/market/search/v2/doSearch
   —— 云端函数可直连，价格单位为"分"，最稳、最快、云端友好。
2. 浏览器渲染（Playwright，统一反检测引擎）：JS 渲染 `.pro-item` 卡片。
3. 直连静态 HTML 内联 JSON（通常为 JS 壳，基本为空）。

任何路径失败静默降级，绝不崩溃、绝不伪造。
"""
import os
import re
import json
import time
import urllib.parse
import urllib.request
from typing import List

from .base import BaseSource
from . import _http
from ..models import Product

_SEARCH_URL = "https://www.xiaomiyoupin.com/search?keyword={kw}"
_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0")

# 静态 HTML 内联 JSON 的尽力解析正则（回退用）
_NAME_RE = re.compile(r'"(?:name|title|goodsName|spuName)"\s*:\s*"([^"]+)"')
_PRICE_RE = re.compile(r'"(?:price|salePrice|showPrice|currentPrice)"\s*:\s*"?([\d.]+)')
_ORIG_RE = re.compile(r'"(?:originPrice|originalPrice|marketPrice|linePrice)"\s*:\s*"?([\d.]+)')
_IMG_RE = re.compile(r'"(?:img|image|picUrl|imgUrl)"\s*:\s*"(//[^"]+?)"')
_URL_RE = re.compile(r'"(?:goodsId|spuId|productId)"\s*:\s*"?(\d+)"')


class MiyoupinSource(BaseSource):
    platform = "miyoupin"
    platform_name = "小米有品"

    can_live = lambda self: True

    def __init__(self, cookie: str = "", timeout: int = 10, **kwargs):
        self.cookie = (
            cookie
            or os.environ.get("PC_COOKIE_MIYOUPIN")
            or os.environ.get("PC_COOKIE", "")
        )
        try:
            self.timeout = int(timeout or os.environ.get("PC_TIMEOUT", "10"))
        except (ValueError, TypeError):
            self.timeout = 10

    def fetch(self, keyword: str, page: int = 1, page_size: int = 20) -> List[Product]:
        # 首选：官方 JSON POST（纯 urllib，云端友好）
        ps = self._fetch_json(keyword, page, page_size)
        if ps:
            return ps
        # 回退 1：浏览器渲染
        try:
            from .rendered_source import render_collect
            ps = render_collect("miyoupin", keyword, page, page_size, self.cookie)
            if ps:
                return ps
        except Exception:
            pass
        # 回退 2：静态 HTML 内联 JSON
        url = _SEARCH_URL.format(kw=urllib.parse.quote(keyword))
        headers = {"Referer": "https://www.xiaomiyoupin.com/"}
        if self.cookie:
            headers["Cookie"] = self.cookie
        try:
            html = _http.fetch_html(url, timeout=self.timeout, headers=headers)
        except Exception:
            return []
        return self._parse(html, keyword)[:page_size]

    # ---- 首选：官方 mtop JSON POST ----
    def _fetch_json(self, keyword: str, page: int, page_size: int) -> List[Product]:
        payload = [{}, {"query": [{"queryName": keyword, "queryType": 0, "rule": []}],
                        "sortBy": 0, "pageIdx": page - 1, "strategyInfo": None,
                        "filter": None,
                        "baseParam": {"imei": "", "clientVersion": "", "ypClient": 3},
                        "source": "searchPage", "requestId": "9000870017970302",
                        "clientPageId": "015948074073691365", "recentAddress": None,
                        "requestExtraInfo": {}, "pageSize": 20}]
        try:
            body = _http.post_text(
                "https://www.xiaomiyoupin.com/mtop/market/search/v2/doSearch",
                payload, headers={
                    "x-user-agent": "channel/youpin platform/youpin.pc",
                    "x-yp-app-source": "front-PC", "dtoken": "",
                    "referer": "https://www.xiaomiyoupin.com/search?keyword=x",
                    "accept-language": "zh-CN"}, timeout=self.timeout + 8)
            goods = json.loads(body)["data"]["data"]["goods"]
        except Exception:
            return []
        result: List[Product] = []
        for g in goods:
            try:
                gi = g["data"]["goodsInfo"]
                pi = gi.get("priceInfo", {})
                single = (pi.get("singlePrice") or {})
                price_cents = single.get("price") or gi.get("priceMin") or 0
                price = float(price_cents) / 100.0
                if price <= 0:
                    continue
                market_cents = gi.get("marketPrice") or pi.get("marketPrice") or 0
                original = float(market_cents) / 100.0
                original = original if original > price else 0.0
                gid = gi.get("gid")
                result.append(Product(
                    platform="miyoupin", name=gi.get("name") or keyword, price=price,
                    original_price=original, sales=0, sales_text="",
                    shop_rating=-1.0, shop_name="小米有品",
                    url=f"https://www.xiaomiyoupin.com/detail?gid={gid}",
                    image=gi.get("imgSquare") or gi.get("img800s") or "",
                    keyword=keyword, raw={}))
            except Exception:
                continue
        return result[:page_size]

    # ---- 回退：静态 HTML 内联 JSON ----
    @staticmethod
    def _parse(html: str, keyword: str) -> List[Product]:
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
                url = ""
                if i < len(ids):
                    url = "https://www.xiaomiyoupin.com/detail?gid=" + str(ids[i])
                name = _strip_tags(names[i]) if i < len(names) else keyword
                original = _http.parse_price(origs[i]) if i < len(origs) else 0.0
                result.append(Product(
                    platform="miyoupin", name=name, price=p,
                    original_price=original, sales=0, sales_text="",
                    shop_rating=-1.0, shop_name="小米有品", url=url, image=img,
                    keyword=keyword, raw={},
                ))
            except Exception:
                continue
        return result


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "").strip()
