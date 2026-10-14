# -*- coding: utf-8 -*-
"""HTTP 抓取与通用解析工具（仅标准库，零第三方依赖）。

所有请求内置"带指数退避的重试"，覆盖临时状态码（429/480/5xx）与瞬时网络错误，
适配云端函数环境下平台的偶发限流。
"""
import re
import time
import json
import gzip
import zlib
import urllib.request
import urllib.parse
import urllib.error
from typing import Optional, Dict

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate",
}

RETRY_STATUS = {429, 480, 500, 502, 503, 504}


def _merge_headers(headers: Optional[Dict] = None) -> Dict:
    h = dict(DEFAULT_HEADERS)
    if headers:
        h.update(headers)
    return h


def _open(req, timeout: int, retries: int):
    last = None
    for a in range(max(1, retries)):
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            last = e
            if e.code in RETRY_STATUS and a < retries - 1:
                time.sleep(0.7 * (a + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = e
            if a < retries - 1:
                time.sleep(0.7 * (a + 1))
                continue
            raise
    if last:
        raise last


def _read_resp(resp) -> str:
    data = resp.read()
    enc = resp.headers.get("Content-Encoding", "").lower()
    if enc == "gzip":
        data = gzip.decompress(data)
    elif enc == "deflate":
        try:
            data = zlib.decompress(data)
        except zlib.error:
            data = zlib.decompress(data, -zlib.MAX_WBITS)
    charset = _detect_charset(resp.headers.get("Content-Type", ""), data)
    return data.decode(charset, errors="ignore")


def fetch_html(url: str, timeout: int = 10, headers: Optional[Dict] = None,
               retries: int = 3) -> str:
    """GET 一个 URL 并返回解码后的 HTML 文本（自动处理 gzip，带重试）。"""
    req = urllib.request.Request(url, headers=_merge_headers(headers))
    with _open(req, timeout, retries) as resp:
        return _read_resp(resp)


def get_text(url: str, headers: Optional[Dict] = None, timeout: int = 12,
             retries: int = 3) -> str:
    """GET 并返回文本（用于 JSON / JSONP 接口，带重试）。"""
    req = urllib.request.Request(url, headers=_merge_headers(headers))
    with _open(req, timeout, retries) as resp:
        return _read_resp(resp)


def post_text(url: str, data, headers: Optional[Dict] = None, timeout: int = 12,
              retries: int = 3) -> str:
    """POST（默认 JSON）并返回文本，带重试。data 可为 dict/list（自动序列化）或 str/bytes。"""
    if not isinstance(data, (str, bytes)):
        data = json.dumps(data, ensure_ascii=False)
    if isinstance(data, str):
        data = data.encode("utf-8")
    h = _merge_headers(headers)
    h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=h)
    with _open(req, timeout, retries) as resp:
        return _read_resp(resp)


def _detect_charset(content_type: str, data: bytes) -> str:
    m = re.search(r"charset=([\w-]+)", content_type, re.I)
    if m:
        return m.group(1)
    head = data[:1024].decode("ascii", errors="ignore")
    m2 = re.search(r"charset=[\"']?([\w-]+)", head, re.I)
    return m2.group(1) if m2 else "utf-8"


# ---- 数值解析 ----

def parse_price(text: str) -> float:
    """从 '¥1,299.00' / '1299' / '12.9起' 中解析价格。"""
    if not text:
        return 0.0
    t = text.replace("¥", "").replace("￥", "").replace(",", "").replace("，", "")
    m = re.search(r"(\d+(?:\.\d+)?)", t)
    return float(m.group(1)) if m else 0.0


def parse_sales(text: str) -> int:
    """从 '2.3万+' / '已售1.5万' / '3000+' 中解析销量为整数。"""
    if not text:
        return 0
    t = text.replace(",", "").replace("，", "").replace("+", "").strip()
    m = re.search(r"(\d+(?:\.\d+)?)\s*(万|亿)?", t)
    if not m:
        return 0
    num = float(m.group(1))
    unit = m.group(2)
    if unit == "亿":
        num *= 100000000
    elif unit == "万":
        num *= 10000
    return int(num)


def parse_rating(text: str) -> float:
    if not text:
        return -1.0
    m = re.search(r"(\d+(?:\.\d+)?)", text)
    return float(m.group(1)) if m else -1.0


def extract_json(text: str) -> Optional[dict]:
    """尽力从 HTML/JS 中提取首个 JSON 对象。"""
    patterns = [
        r"window\._a?pp?Data\s*=\s*(\{.*?\})\s*;",
        r"var\s+data\s*=\s*(\{.*?\})\s*;",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.S)
        if m:
            try:
                return json.loads(m.group(1))
            except Exception:
                continue
    return None
