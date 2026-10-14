#!/usr/bin/env python3
"""
saas-aggregator 联调用 mock 后端（零依赖，仅标准库）。

模拟 monorepo 网关 gateway-go 应产出的 5 个真实端点，便于在不拉起
完整 docker 微服务栈（需要 Go/JVM 构建 + 联网）的情况下，验证插件侧
fetch + normalize 契约在真实 HTTP 下是否成立。

契约来源（插件各 provider 的 normalize_response 期望结构）：
- GET  /api/gateway/status   -> {"status","items":[{title,value,status,...}]}
- GET  /api/orders            -> [{id,tenantId,product,amount,status,createdAt}]
- POST /api/ai/rag            -> {"answer","references":[{content,source}]}
- GET  /api/analytics/dashboard -> {"tenant","items":[...]}
- GET  /api/compliance/status   -> {"tenant","items":[...]}

安全校验：所有端点强制 Authorization（任意非空）与 X-Tenant-Id 请求头，
缺则返回 401 / 400，呼应网关鉴权与多租户隔离要求。
"""

import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8799
START_TS = time.time()


def _json(body: dict, code: int = 200) -> bytes:
    return json.dumps(body, ensure_ascii=False).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    # 静默默认访问日志，避免刷屏。
    def log_message(self, *args):  # noqa: D401
        pass

    def _send(self, code: int, body: dict):
        payload = _json(body, code)
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _auth(self) -> tuple[str, str] | None:
        """校验 Authorization + X-Tenant-Id；返回 (tenant, auth) 或 None(已回写错误)。"""
        auth = self.headers.get("Authorization", "").strip()
        tenant = self.headers.get("X-Tenant-Id", "").strip()
        if not auth:
            self._send(401, {"error": "missing Authorization"})
            return None
        if not tenant:
            self._send(400, {"error": "missing X-Tenant-Id"})
            return None
        return tenant, auth

    # ---------- GET /api/gateway/status ----------
    def _gateway_status(self):
        self._send(200, {
            "status": "ok",
            "items": [
                {"title": "网关可用性", "value": "99.98%", "status": "ok"},
                {"title": "运行时长(秒)", "value": int(time.time() - START_TS), "status": "info"},
                {"title": "实时通道", "value": "WebSocket /ws 已开放", "status": "ok"},
                {"title": "内部通道", "value": "gRPC -> Java/Python", "status": "ok"},
                {"title": "限流触发(近1h)", "value": "147", "status": "warn"},
            ],
        })

    # ---------- GET /api/orders ----------
    def _orders(self):
        self._send(200, [
            {"id": "ORD-1001", "tenantId": "default", "product": "企业版年度套餐",
             "amount": 29900, "status": "paid", "createdAt": "2026-08-15T10:02:11Z"},
            {"id": "ORD-1002", "tenantId": "default", "product": "增值短信包",
             "amount": 1200, "status": "pending", "createdAt": "2026-08-15T11:20:43Z"},
            {"id": "ORD-1003", "tenantId": "default", "product": "专业版月度套餐",
             "amount": 2990, "status": "refunded", "createdAt": "2026-08-14T09:15:00Z"},
        ])

    # ---------- POST /api/ai/rag ----------
    def _rag(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            req = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            req = {}
        query = req.get("query", "")
        self._send(200, {
            "answer": (
                f"基于知识库检索，针对『{query}』：当前租户最需关注的是 pending 订单的履约时效，"
                "以及企业版套餐的续费提醒；机会在于增值短信包的交叉销售。"
            ),
            "references": [
                {"content": "企业版年度套餐 SLA 承诺 99.95% 可用性，超赔规则见合同附录 B。",
                 "source": "kb#enterprise-sla"},
                {"content": "pending 订单平均履约时长 4.2h，超过阈值会触发风控。",
                 "source": "kb#order-sla"},
            ],
        })

    # ---------- GET /api/analytics/dashboard ----------
    def _analytics(self, tenant):
        self._send(200, {
            "tenant": tenant,
            "items": [
                {"title": "知识库条目数", "value": "128", "status": "ok", "meta": {"layer": "python"}},
                {"title": "模型网关", "value": "PrivateGateway", "status": "info"},
                {"title": "向量检索", "value": "pgvector 已启用", "status": "ok"},
                {"title": "租户隔离", "value": tenant, "status": "ok"},
            ],
        })

    # ---------- GET /api/compliance/status ----------
    def _compliance(self, tenant):
        self._send(200, {
            "tenant": tenant,
            "items": [
                {"title": "输入脱敏", "value": "已启用", "status": "ok", "meta": {"rules": 6}},
                {"title": "输出合规校验", "value": "已启用", "status": "ok", "meta": {"blocklist": 12}},
                {"title": "租户隔离", "value": "X-Tenant-Id 强制", "status": "ok"},
                {"title": "审计留痕", "value": "网关 AUDIT 日志", "status": "ok"},
                {"title": "等保等级", "value": "三级（参考实现）", "status": "info"},
            ],
        })

    def _dispatch(self, path: str):
        checked = self._auth()
        if checked is None:
            return
        tenant, _ = checked
        if path == "/api/gateway/status":
            self._gateway_status()
        elif path == "/api/orders":
            self._orders()
        elif path == "/api/ai/rag":
            self._rag()
        elif path == "/api/analytics/dashboard":
            self._analytics(tenant)
        elif path == "/api/compliance/status":
            self._compliance(tenant)
        else:
            self._send(404, {"error": "not found", "path": path})

    def do_GET(self):
        self._dispatch(self.path)

    def do_POST(self):
        self._dispatch(self.path)


def main():
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"mock-backend listening on http://127.0.0.1:{PORT}", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


if __name__ == "__main__":
    main()
