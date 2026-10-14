# -*- coding: utf-8 -*-
"""CloudBase 云函数入口（SCF Event 函数，handler=index.main_handler）。

通过 CloudBase HTTP 网关 / 云接入触发，兼容多种网关事件形态：
  - 新版网关集成事件：event.http.{method,path} + event.queryString
  - 经典云接入 / API 网关：event.httpMethod + event.path + event.queryString
返回集成响应：{isBase64Encoded, statusCode, headers, body}。

路由：
  /api/health   健康检查
  /api/search   比价采集（默认仅云端可稳定出数的平台，纯 urllib）
  /api/insights AI 解读（需配置 PC_AI_API_KEY 环境变量）
"""
import json
import os
import sys
import traceback

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

# 云端免费可稳定出数的平台（纯标准库，无签名、无浏览器）
CLOUD_PLATFORMS = ["dangdang", "suning", "yanxuan", "miyoupin"]

_BASE_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
}


def _resp(payload, status=200):
    return {
        "isBase64Encoded": False,
        "statusCode": status,
        "headers": dict(_BASE_HEADERS),
        "body": json.dumps(payload, ensure_ascii=False),
    }


def _extract(event):
    http = event.get("http") or {}
    method = (http.get("method") or event.get("httpMethod")
              or event.get("method") or "GET")
    path = (http.get("path") or event.get("path")
            or (event.get("requestContext") or {}).get("path") or "/")
    qs = event.get("queryString") or event.get("query") or {}
    if isinstance(qs, str) and qs:
        from urllib.parse import parse_qs
        qs = {k: v[0] for k, v in parse_qs(qs).items()}
    headers = event.get("headers") or {}
    body = event.get("body") or ""
    return str(method).upper(), str(path), qs, headers, body


def main_handler(event, context):
    try:
        if isinstance(event, (bytes, bytearray)):
            event = event.decode("utf-8")
        if isinstance(event, str):
            event = json.loads(event or "{}")
        if not isinstance(event, dict):
            event = {}
        method, path, qs, headers, body = _extract(event)
        if method == "OPTIONS":
            return _resp({}, 204)

        if path.endswith("/health"):
            return _resp({"status": "ok", "cloud_platforms": CLOUD_PLATFORMS})
        if path.endswith("/search"):
            return _do_search(qs)
        if path.endswith("/insights"):
            return _do_insights(qs, body)
        return _resp({"error": "not found", "path": path}, 404)
    except Exception as e:
        return _resp({
            "error": str(e),
            "trace": traceback.format_exc()[-600:],
        }, 500)


def _do_search(qs):
    from price_collector import pipeline
    keyword = (qs.get("keyword") or "").strip()
    if not keyword:
        return _resp({"error": "missing keyword"}, 400)
    plats = [p for p in (qs.get("platforms") or "").split(",") if p] or CLOUD_PLATFORMS
    try:
        page = max(1, int(qs.get("page") or 1))
    except ValueError:
        page = 1
    try:
        size = min(60, max(1, int(qs.get("size") or 20)))
    except ValueError:
        size = 20
    result = pipeline.run(
        keyword=keyword, platforms=plats, source_mode="live",
        page=page, page_size=size)
    return _resp(result.to_dict())


def _do_insights(qs, body):
    from price_collector import pipeline, ai as ai_mod
    kw_extra = ""
    if body:
        try:
            kw_extra = (json.loads(body) or {}).get("keyword", "")
        except Exception:
            kw_extra = ""
    keyword = (kw_extra or qs.get("keyword") or "").strip()
    if not keyword:
        return _resp({"error": "missing keyword"}, 400)
    r = pipeline.run(keyword=keyword, platforms=CLOUD_PLATFORMS,
                     source_mode="live", page=1, page_size=20)
    summary = {
        "keyword": keyword, "total": r.total,
        "live_platforms": r.live_platforms,
        "collected_at": r.collected_at,
    }
    out = ai_mod.ai_insights(keyword, r.products, r.platform_stats, summary)
    return _resp(out)
