# ============================================================
# CloudBase 云函数模板（Python 运行时）
# 依据：docs.cloudbase.net — 云函数 / 运行时支持
# 说明：Python 云函数走 HTTP API 或云数据库 REST 接口访问资源
# ============================================================

import os
import json
import time
import urllib.request
import urllib.error

ENV_ID = os.environ.get("CLOUDBASE_ENV_ID", "YOUR_ENV_ID")
SECRET_ID = os.environ.get("TENCENTCLOUD_SECRET_ID")
SECRET_KEY = os.environ.get("TENCENTCLOUD_SECRET_KEY")


def main(event, context):
    """云函数入口。

    event   —— 调用方传入的参数（dict）
    context —— 运行时上下文（含 function_name / request_id 等）
    """
    action = (event or {}).get("action")

    try:
        if action == "collect":
            return collect(event.get("payload", {}))
        if action == "proxy":
            return proxy(event.get("payload", {}))
        return {"code": -1, "message": f"unknown action: {action}"}
    except Exception as e:
        # 错误显式返回，便于前端定位
        return {"code": -1, "message": str(e)}


def collect(payload):
    """采集逻辑占位 —— 结果应写入云数据库，不要只写本地文件。

    云函数的本地磁盘不持久化：函数实例回收后文件即丢失。
    采集结果必须写云数据库 / 云存储，否则等于采集完就丢。
    """
    started = time.time()
    items = payload.get("items", [])
    # TODO: 实现采集
    result = {"count": len(items)}
    # TODO: 写入 CloudBase 云数据库（走 HTTP API 或 Manager SDK）
    return {"code": 0, "data": result, "elapsed": round(time.time() - started, 2)}


def proxy(payload):
    """代理第三方 API —— Key 从环境变量读，绝不返回前端。"""
    key = os.environ.get("THIRD_PARTY_KEY")
    url = payload.get("url")
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return {"code": 0, "data": json.loads(resp.read().decode("utf-8"))}


# 部署要点：
# 1. 重型依赖（PIL / reportlab / numpy 等）打包为「层」，避免每次部署上传依赖
# 2. 云函数有超时上限，长耗时采集需拆分或改云托管
# 3. 定时采集配「定时触发器」
