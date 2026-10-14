#!/usr/bin/env python3
# ============================================================
# CloudBase HTTP API 调用模板（Python）
# 适用：无官方 SDK 的场景 —— Python 后端、采集脚本、Electron 侧进程、Go 服务
# 依据：docs.cloudbase.net — HTTP API / 接口文档
# ============================================================

import os, json, time, hmac, hashlib, random
import urllib.request
import urllib.error

ENV_ID = os.environ.get("CLOUDBASE_ENV_ID", "YOUR_ENV_ID")
SECRET_ID = os.environ.get("TENCENTCLOUD_SECRET_ID")
SECRET_KEY = os.environ.get("TENCENTCLOUD_SECRET_KEY")

BASE = "https://YOUR_ENV_ID.api.tcloudbasegateway.com"  # 以控制台实际网关地址为准


def _req(path, body):
    """发送 HTTP API 请求。

    生产环境应使用腾讯云 SDK（tencentcloud-sdk-python）做签名，
    此处为最小可运行示意，演示请求结构与错误处理。
    """
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        # 认证/权限类错误要单独识别，不要笼统重试
        print("HTTPError", e.code, e.read().decode("utf-8", "ignore"))
        raise


def insert(coll, doc):
    """写入一条文档"""
    return _req("/v1/document/insert", {
        "envId": ENV_ID, "collectionName": coll, "document": doc,
    })


def find(coll, where, limit=20):
    """查询文档"""
    return _req("/v1/document/find", {
        "envId": ENV_ID, "collectionName": coll,
        "query": where, "limit": limit,
    })


def upload_file(local_path, cloud_path):
    """上传文件 —— 需先换取上传凭证，再 PUT 到 COS，此处为流程示意"""
    # 1) 换取上传凭证
    # 2) PUT 到凭证返回的 URL
    # 3) 拿到 fileID，库里只存 fileID
    raise NotImplementedError("按控制台返回的上传凭证流程实现")


if __name__ == "__main__":
    print("env:", ENV_ID)
    # print(insert("demo", {"name": "test", "ts": int(time.time())}))
