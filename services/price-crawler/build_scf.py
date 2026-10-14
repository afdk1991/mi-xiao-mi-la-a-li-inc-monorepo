# -*- coding: utf-8 -*-
"""构建 CloudBase SCF 函数代码包（精简白名单，仅云端必需文件）。

云端无 playwright：只打包纯 urllib 可稳定出数的 4 个平台与必要核心，
其余 30 个源文件缺失时 SourceFactory.init_registry 自动跳过（import 失败 continue）。

zip 根布局：index.py + price_collector/...，handler=index.main_handler。
产物：cloudbase/scf-priceprobe.zip 与 .b64。
"""
import base64
import os
import shutil
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
FN = os.path.join(ROOT, "cloudbase", "scf-priceprobe")
PC = os.path.join(ROOT, "price_collector")

# 白名单（相对 price_collector）
CORE = ["__init__.py", "models.py", "pipeline.py", "cleaning.py",
        "scoring.py", "analysis.py", "ai.py"]
SOURCES = ["__init__.py", "base.py", "registry.py", "_http.py", "_browser.py",
           "dangdang.py", "suning.py", "yanxuan.py", "miyoupin.py"]

# 重建目标目录
if os.path.exists(FN):
    shutil.rmtree(FN)
os.makedirs(os.path.join(FN, "price_collector", "sources"))

shutil.copy2(os.path.join(ROOT, "cloudbase", "scf-index.py"),
             os.path.join(FN, "index.py")) if os.path.exists(
    os.path.join(ROOT, "cloudbase", "scf-index.py")) else None

# index.py 已由编辑器写在 scf-priceprobe/index.py（若重建会丢），故从备份模板取
# 约定：index.py 的权威源放在 cloudbase/index_template.py
idx_template = os.path.join(ROOT, "cloudbase", "index_template.py")
shutil.copy2(idx_template, os.path.join(FN, "index.py"))

for f in CORE:
    shutil.copy2(os.path.join(PC, f), os.path.join(FN, "price_collector", f))
for f in SOURCES:
    shutil.copy2(os.path.join(PC, "sources", f),
                 os.path.join(FN, "price_collector", "sources", f))

zp = os.path.join(ROOT, "cloudbase", "scf-priceprobe.zip")
if os.path.exists(zp):
    os.remove(zp)
with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
    for base, _dirs, files in os.walk(FN):
        for f in files:
            full = os.path.join(base, f)
            arc = os.path.relpath(full, FN).replace(os.sep, "/")
            z.write(full, arc)

raw = open(zp, "rb").read()
b64 = base64.b64encode(raw)
open(os.path.join(ROOT, "cloudbase", "scf-priceprobe.b64"), "wb").write(b64)
with zipfile.ZipFile(zp) as z:
    nlist = z.namelist()
print("zip bytes:", len(raw))
print("b64 len:", len(b64))
print("files:", len(nlist))
for n in nlist:
    print("  ", n)
