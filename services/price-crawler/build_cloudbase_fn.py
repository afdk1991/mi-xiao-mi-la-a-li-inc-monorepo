# 打包 cloudbase-fn 为 CloudBase HTTP 函数 zip（保留 scf_bootstrap 可执行位），并生成 base64。
import zipfile, os, base64, stat, sys

src = r'F:\网站全栈项目\项目008采集\cloudbase-fn'
zip_path = os.path.join(src, 'priceprobe-api.zip')
b64_path = os.path.join(src, 'priceprobe-api.b64')
files = ['index.js', 'package.json', 'scf_bootstrap']

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        data = open(os.path.join(src, f), 'rb').read()
        mode = 0o755 if f == 'scf_bootstrap' else 0o644
        zi = zipfile.ZipInfo(f)
        zi.create_system = 3  # unix
        zi.external_attr = (stat.S_IFREG | mode) << 16
        z.writestr(zi, data)

raw = open(zip_path, 'rb').read()
open(b64_path, 'w').write(base64.b64encode(raw).decode())
print('zip bytes:', len(raw))
print('b64 len:', len(base64.b64encode(raw).decode()))
# 列出 zip 内容核对权限
with zipfile.ZipFile(zip_path) as z:
    for i in z.infolist():
        print(' ', i.filename, oct(i.external_attr >> 16))
