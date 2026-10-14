import os, re, urllib.request, ssl

SRC = r"D:\网站全栈项目\项目01\Mi-Xiao-Mi-La-A-Li-Inc\frontend\src"
BASE = "http://localhost:3001/api"
GC_FILE = r"D:\网站全栈项目\项目01\Mi-Xiao-Mi-La-A-Li-Inc\backend\src\routes\genericCollections.ts"

methods = r"(?:get|post|put|delete|fetchList|createItem|updateItem|deleteItem)"
pat = re.compile(r"api\." + methods + r"\(\s*(['\"`])(.*?)\1", re.IGNORECASE)

paths = {}
for root, dirs, files in os.walk(SRC):
    if "node_modules" in root:
        continue
    for f in files:
        if not f.endswith((".ts", ".tsx", ".js", ".jsx")):
            continue
        p = os.path.join(root, f)
        try:
            txt = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        for m in pat.finditer(txt):
            raw = m.group(2)
            norm = re.sub(r"\$\{[^}]*\}", "1", raw).strip()
            if not norm or norm.startswith("http"):
                continue
            if norm.startswith("/api"):
                norm = norm[4:]
            if not norm.startswith("/"):
                norm = "/" + norm
            paths.setdefault(norm, set()).add(os.path.relpath(p, SRC))

# parse existing configs (preserve userScoped)
existing = []
try:
    gctext = open(GC_FILE, encoding="utf-8", errors="ignore").read()
    for mm in re.finditer(r"\{\s*mountPath:\s*'([^']+)',\s*tableName:\s*'([^']+)'(?:,\s*userScoped:\s*(false|true))?\s*\}", gctext):
        existing.append({"mountPath": mm.group(1), "tableName": mm.group(2),
                         "userScoped": (mm.group(3) == "true" or mm.group(3) is None)})
except Exception as e:
    print("READ ERR", e)

existing_by_path = {c["mountPath"]: c for c in existing}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def probe(path):
    try:
        req = urllib.request.Request(BASE + path, method="GET")
        with urllib.request.urlopen(req, timeout=8, context=ctx) as r:
            return r.getcode()
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0

def normalize(path):
    path = path.split("?")[0]
    parts = path.strip("/").split("/")
    if parts and parts[-1].isdigit():
        parts = parts[:-1]
    return "/" + "/".join(parts)

new_set = {}
for path in paths:
    if probe(path) == 200:
        continue
    base = normalize(path)
    if base in existing_by_path:
        continue
    new_set.setdefault(base, set()).add(", ".join(sorted(paths[path])))

# build final configs: existing first, then new
final = list(existing)
for base in sorted(new_set):
    tbl = "gc_" + re.sub(r"[^0-9a-zA-Z]+", "_", base.strip("/"))
    final.append({"mountPath": base, "tableName": tbl, "userScoped": True})

# write file
lines = []
lines.append("import { createGenericRouter, CollectionConfig } from '../utils/genericCrud';")
lines.append("")
lines.append("/**")
lines.append(" * 通用集合配置：覆盖全站此前 404 的高频功能域。")
lines.append(" * 每条记录由通用 CRUD 工厂以 JSON payload 存储，前端页面表单字段即 schema，存进 SQLite 即真实可增删改查。")
lines.append(" * userScoped=false 用于明显属于\"公开/共享内容\"的域（SEO/合规/落地页/企业站等），其余按用户隔离。")
lines.append(" */")
lines.append("const configs: CollectionConfig[] = [")
for c in final:
    if c["userScoped"] is False:
        lines.append(f"  {{ mountPath: '{c['mountPath']}', tableName: '{c['tableName']}', userScoped: false }},")
    else:
        lines.append(f"  {{ mountPath: '{c['mountPath']}', tableName: '{c['tableName']}' }},")
lines.append("];")
lines.append("")
lines.append("export const genericCollections = configs.map((cfg) => ({")
lines.append("  mountPath: cfg.mountPath,")
lines.append("  router: createGenericRouter(cfg),")
lines.append("}));")
lines.append("")

with open(GC_FILE, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))

print(f"existing={len(existing)} new={len(new_set)} total={len(final)}")
print("written ->", GC_FILE)
