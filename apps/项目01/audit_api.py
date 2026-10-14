import os, re, urllib.request, ssl, sys, traceback

def main():
    SRC = r"D:\网站全栈项目\项目01\Mi-Xiao-Mi-La-A-Li-Inc\frontend\src"
    BASE = "http://localhost:3001/api"

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

    results = {}
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    for path in sorted(paths):
        url = BASE + path
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=8, context=ctx) as r:
                code = r.getcode()
        except urllib.error.HTTPError as e:
            code = e.code
        except Exception as e:
            code = "ERR:" + type(e).__name__
        results[path] = code

    ok = [p for p, c in results.items() if c == 200]
    bad = [(p, c) for p, c in results.items() if c != 200]
    out = []
    out.append(f"TOTAL PATHS: {len(results)}")
    out.append(f"200: {len(ok)}  NON-200: {len(bad)}")
    out.append("--- NON-200 ---")
    for p, c in bad:
        out.append(f"  {c}  {p}   <- {', '.join(sorted(paths[p]))}")
    text = "\n".join(out)
    print(text)
    with open(r"D:\网站全栈项目\audit_result.txt", "w", encoding="utf-8") as fh:
        fh.write(text)

if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(2)
