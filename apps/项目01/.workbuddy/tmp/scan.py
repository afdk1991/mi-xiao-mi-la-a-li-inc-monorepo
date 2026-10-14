import os, sys, json, time

ROOT = r"D:\网站全栈项目\项目01"
EXCLUDE_DIRS = {
    "node_modules", ".git", "vendor", "dist", "build", ".next", "out",
    "__pycache__", ".venv", "venv", "env", ".cache", ".idea", ".vscode",
    "coverage", ".turbo", ".svn", "target", "bin", "obj", ".gradle",
}
EXCLUDE_FILES_DIRS = {"package-lock.json", "pnpm-lock.yaml", "yarn.lock"}
CODE_EXT = {
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".php", ".java",
    ".go", ".rs", ".rb", ".c", ".h", ".cpp", ".hpp", ".cs", ".vue",
    ".css", ".scss", ".less", ".html", ".htm", ".json", ".yaml", ".yml",
    ".toml", ".xml", ".sh", ".sql", ".md", ".ini", ".conf", ".env",
}
LANG_MAP = {
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".py": "Python", ".php": "PHP", ".java": "Java", ".go": "Go", ".rs": "Rust",
    ".rb": "Ruby", ".c": "C/C++", ".h": "C/C++", ".cpp": "C/C++", ".hpp": "C/C++",
    ".cs": "C#", ".vue": "Vue", ".css": "CSS", ".scss": "SCSS", ".less": "LESS",
    ".html": "HTML", ".htm": "HTML", ".json": "JSON", ".yaml": "YAML", ".yml": "YAML",
    ".toml": "TOML", ".xml": "XML", ".sh": "Shell", ".sql": "SQL", ".md": "Markdown",
}
BINARY_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff",
              ".woff2", ".ttf", ".eot", ".mp4", ".webm", ".mp3", ".zip", ".tar",
              ".gz", ".rar", ".7z", ".pdf", ".exe", ".dll", ".so", ".dylib",
              ".safetensors", ".bin", ".onnx", ".pt", ".pth", ".model"}

t0 = time.time()

# ---------- pass 1: 一级目录统计 ----------
top = {}
for name in os.listdir(ROOT):
    p = os.path.join(ROOT, name)
    if os.path.isdir(p):
        top[name] = {"type": "dir", "files": 0, "bytes": 0, "lines": 0, "langs": {}, "sub": {}}
    else:
        try:
            sz = os.path.getsize(p)
        except OSError:
            sz = 0
        top[name] = {"type": "file", "files": 1, "bytes": sz, "lines": 0, "langs": {}}

result = {"root": ROOT, "top": {}, "lang_total": {}, "projects": [], "warnings": []}

def count_lines(path, maxbytes=2_000_000):
    try:
        if os.path.getsize(path) > maxbytes:
            return 0
        with open(path, "rb") as f:
            data = f.read()
        if b"\x00" in data[:4096]:
            return 0
        return data.count(b"\n") + (1 if data and not data.endswith(b"\n") else 0)
    except Exception:
        return 0

for name, info in top.items():
    if info["type"] == "file":
        ext = os.path.splitext(name)[1].lower()
        lg = LANG_MAP.get(ext)
        if lg:
            info["langs"][lg] = 1
        continue
    base = os.path.join(ROOT, name)
    for dirpath, dirnames, filenames in os.walk(base, topdown=True):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS and not d.startswith(".tmp")]
        # 记录二级目录
        rel = os.path.relpath(dirpath, base)
        if rel != ".":
            parts = rel.split(os.sep)
            if len(parts) == 1:
                info["sub"].setdefault(parts[0], 0)
        for fn in filenames:
            fp = os.path.join(dirpath, fn)
            try:
                sz = os.path.getsize(fp)
            except OSError:
                continue
            info["files"] += 1
            info["bytes"] += sz
            ext = os.path.splitext(fn)[1].lower()
            if ext in CODE_EXT:
                lg = LANG_MAP.get(ext, ext)
                info["langs"][lg] = info["langs"].get(lg, 0) + 1
                info["lines"] += count_lines(fp)
            if rel != ".":
                parts = rel.split(os.sep)
                if len(parts) >= 1:
                    info["sub"][parts[0]] = info["sub"].get(parts[0], 0) + 1

# ---------- pass 2: 识别项目 ----------
MARKERS = [
    ("package.json", "Node/前端"), ("pyproject.toml", "Python"), ("requirements.txt", "Python"),
    ("setup.py", "Python"), ("pom.xml", "Java/Maven"), ("build.gradle", "Java/Gradle"),
    ("go.mod", "Go"), ("Cargo.toml", "Rust"), ("composer.json", "PHP"),
    ("docker-compose.yml", "Docker Compose"), ("docker-compose.yaml", "Docker Compose"),
    ("Dockerfile", "Docker"), ("vite.config.ts", "Vite"), ("next.config.js", "Next.js"),
    ("angular.json", "Angular"), ("Gemfile", "Ruby"), ("mix.exs", "Elixir"),
]
projects = []
for dirpath, dirnames, filenames in os.walk(ROOT, topdown=True):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    depth = dirpath[len(ROOT):].count(os.sep)
    if depth > 4:
        dirnames[:] = []
        continue
    fl = set(filenames)
    hits = [(m, t) for m, t in MARKERS if m in fl]
    if hits:
        rel = os.path.relpath(dirpath, ROOT)
        try:
            nfiles = sum(len(f) for _, _, f in os.walk(dirpath))
        except Exception:
            nfiles = -1
        projects.append({
            "path": rel,
            "depth": depth,
            "kinds": sorted(set(t for _, t in hits)),
            "markers": sorted(m for m, _ in hits),
        })

result["projects"] = sorted(projects, key=lambda x: (x["depth"], x["path"]))[:120]

for name, info in sorted(top.items(), key=lambda kv: -kv[1]["bytes"]):
    langs = dict(sorted(info["langs"].items(), key=lambda kv: -kv[1])[:6])
    subs = dict(sorted(info.get("sub", {}).items(), key=lambda kv: -kv[1])[:14])
    result["top"][name] = {
        "type": info["type"],
        "files": info["files"],
        "mb": round(info["bytes"] / 1024 / 1024, 1),
        "code_lines": info["lines"],
        "top_langs": langs,
        "subdirs": subs,
    }

lt = {}
for name, info in top.items():
    for lg, c in info["langs"].items():
        lt[lg] = lt.get(lg, 0) + c
result["lang_total"] = dict(sorted(lt.items(), key=lambda kv: -kv[1]))
result["elapsed_sec"] = round(time.time() - t0, 1)

out = r"D:\网站全栈项目\项目01\.workbuddy\tmp\scan_result.json"
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)

# 控制台精简输出
print("=== TOP LEVEL (按体积) ===")
for name, info in sorted(result["top"].items(), key=lambda kv: -kv[1]["mb"]):
    print(f"{name:<40} {info['type']:<5} files={info['files']:<8} {info['mb']}MB  lines={info['code_lines']}")
    if info["top_langs"]:
        print("    langs:", info["top_langs"])
    if info["subdirs"]:
        print("    sub:", info["subdirs"])
print("\n=== LANG TOTAL (文件数) ===")
for lg, c in result["lang_total"].items():
    print(f"{lg:<12} {c}")
print("\n=== PROJECT MARKERS (前60) ===")
for p in result["projects"][:60]:
    print(f"[d{p['depth']}] {p['path']}  -> {p['kinds']}")
print("\nelapsed", result["elapsed_sec"], "sec; JSON ->", out)
