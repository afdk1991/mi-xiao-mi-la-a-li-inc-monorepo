# -*- coding: utf-8 -*-
import zipfile, base64, os
d = r'F:\网站全栈项目\项目008采集\cloudbase-loader'
zp = os.path.join(d, 'priceprobe-loader.zip')
files = ['index.js', 'scf_bootstrap', 'package.json']
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        data = open(os.path.join(d, f), 'rb').read()
        zi = zipfile.ZipInfo(f)
        zi.date_time = (2024, 1, 1, 0, 0, 0)
        zi.create_system = 3
        zi.compress_type = zipfile.ZIP_DEFLATED
        zi.external_attr = (0o100755 if f == 'scf_bootstrap' else 0o100644) << 16
        z.writestr(zi, data)
b = open(zp, 'rb').read()
b64 = base64.b64encode(b).decode()
open(os.path.join(d, 'priceprobe-loader.b64'), 'w').write(b64)
print('zip bytes:', len(b), ' b64 len:', len(b64))
print('----B64----')
print(b64)
