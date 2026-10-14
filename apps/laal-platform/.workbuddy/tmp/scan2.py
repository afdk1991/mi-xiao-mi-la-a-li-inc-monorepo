import os, json, time

BASE = r"D:\网站全栈项目\项目01\Mi-Xiao-Mi-La-A-Li-Inc"
EXCLUDE_DIRS = {
    "node_modules", ".git", "vendor", "dist", "build", ".next", "out",
    "__pycache__", ".venv", "venv", "env", ".cache", ".idea", ".vscode",
    "coverage", ".turbo", ".svn", "target", "bin", "obj", ".gradle", ".pnpm-store",
}
CODE_EXT = {".js",".jsx",".ts",".tsx",".mjs",".cjs",".py",".php",".java",".go",".rs",
            ".vue",".css",".scss",".less",".html",".json",".yaml",".yml",".md",".sql",".xml",".sh"}
LANG_MAP = {".js":"JS",".jsx":"JS",".mjs":"JS",".cjs":"JS",".ts":"TS",".tsx":"TS",
            ".py":"Py",".php":"PHP",".java":"Java",".go":"Go",".rs":"Rust",".vue":"Vue",
            ".css":"CSS",".scss":"SCSS",".less":"LESS",".html":"HTML",".json":"JSON",
            ".yaml":"YAML",".yml":"YAML",".md":"MD",".sql":"SQL",".xml":"XML",".sh":"SH"}

def stat(path):
    files = 0; lines = 0; langs = {}
    for dp, dn, fn in os.walk(path, topdown=True):
        dn[:] = [d for d in dn if d not in EXCLUDE_DIRS]
        for f in fn:
            ext = os.path.splitext(f)[1].lower()
            if ext not in CODE_EXT:
                continue
            fp = os.path.join(dp, f)
            try:
                sz = os.path.getsize(fp)
                if sz > 1_500_000:
                    continue
                with open(fp, "rb") as fh:
                    data = fh.read()
                if b"\x00" in data[:4096]:
                    continue
            except Exception:
                continue
            files += 1
            lines += data.count(b"\n") + (1 if data and not data.endswith(b"\n") else 0)
            lg = LANG_MAP.get(ext, ext)
            langs[lg] = langs.get(lg, 0) + 1
    return files, lines, langs

out = []
P = out.append

P("### Mi-Xiao-Mi-La-A-Li-Inc 顶层条目")
for n in sorted(os.listdir(BASE)):
    p = os.path.join(BASE, n)
    if os.path.isdir(p):
        P(f"  [DIR ] {n}")
    else:
        try: sz = os.path.getsize(p)
        except OSError: sz = 0
        P(f"  [FILE] {n}  ({sz} B)")

targets = [
    ("01-前端集群", 2), ("02-后端微服务集群", 2), ("03-全平台应用端", 2),
    ("04-数据库层", 2), ("05-x", 2), ("06-项目文档层", 2), ("07-公共资源", 2),
    ("08-卫星产品", 2), ("foundation", 2), ("python-fastapi", 2), ("deploy", 2),
    ("secrets", 2), ("dist-pages-build", 2),
]
P("\n### 二级目录明细（排除依赖目录）")
for name, _ in targets:
    p = os.path.join(BASE, name)
    if not os.path.isdir(p):
        continue
    f, l, lg = stat(p)
    top3 = sorted(lg.items(), key=lambda kv: -kv[1])[:5]
    P(f"\n[{name}]  代码文件={f}  行数={l}  语言={top3}")
    for sub in sorted(os.listdir(p)):
        sp = os.path.join(p, sub)
        if not os.path.isdir(sp):
            continue
        sf, sl, slg = stat(sp)
        s3 = sorted(slg.items(), key=lambda kv: -kv[1])[:4]
        kind = "DIR " if os.path.isdir(sp) else "FILE"
        P(f"   - {sub:<38} files={sf:<6} lines={sl:<8} {s3}")

# 顶层根文件
P("\n### 根目录散文件（顶层 .md / .json / .yml）")
for n in sorted(os.listdir(BASE)):
    p = os.path.join(BASE, n)
    if os.path.isfile(p) and os.path.splitext(n)[1].lower() in (".md", ".json", ".yml", ".yaml", ".txt"):
        try: sz = os.path.getsize(p)
        except OSError: sz = 0
        P(f"  {n}  ({sz} B)")

res = "\n".join(out)
with open(r"D:\网站全栈项目\项目01\.workbuddy\tmp\scan2_out.txt", "w", encoding="utf-8") as f:
    f.write(res)
print("done", len(res))
