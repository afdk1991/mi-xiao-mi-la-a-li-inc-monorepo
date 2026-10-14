import re
p = r"D:/网站全栈项目/项目002/wordpress/docker-compose.yml"
s = open(p, encoding="utf-8").read()
lines = s.split("\n")
out = []
i = 0
added = 0
while i < len(lines):
    line = lines[i]
    out.append(line)
    m = re.match(r"^(\s*)container_name:\s*\S+", line)
    if m:
        j = i + 1
        has = False
        while j < len(lines) and lines[j].strip() == "":
            j += 1
        if j < len(lines) and lines[j].lstrip().startswith("restart:"):
            has = True
        if not has:
            indent = m.group(1)
            out.append(indent + "  restart: unless-stopped")
            added += 1
    i += 1
open(p, "w", encoding="utf-8").write("\n".join(out))
print(f"已为 {added} 个服务注入 restart: unless-stopped")
