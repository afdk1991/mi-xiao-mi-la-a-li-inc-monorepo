import re
from collections import Counter
src = r"C:/Users/Admin/AppData/Local/Temp/cb_sitemap.xml"
import os
if not os.path.exists(src):
    src = "/tmp/cb_sitemap.xml"
s = open(src, encoding='utf-8', errors='ignore').read()
u = re.findall(r'<loc>\s*([^<\s]+)\s*</loc>', s)
print('URL 总数:', len(u))
uniq = {}
for x in u:
    p = x.replace('https://docs.cloudbase.net', '').split('?')[0]
    uniq.setdefault(p, x)
print('按路径去重:', len(uniq))
c = Counter(p.split('/')[1] if len(p.split('/')) > 1 else '(root)' for p in uniq)
for k, v in c.most_common(20):
    print('  /%-26s%6d' % (k, v))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cb_urls.txt')
with open(out, 'w', encoding='utf-8') as f:
    for v in sorted(uniq.values()):
        f.write(v + '\n')
print('清单 ->', out)
