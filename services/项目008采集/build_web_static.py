# -*- coding: utf-8 -*-
import zipfile, os
d = r'F:\网站全栈项目\项目008采集\cloudbase-web'
zp = os.path.join(d, 'priceprobe-web-static.zip')
files = ['index.html', 'app.js', 'style.css']
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        data = open(os.path.join(d, f), 'rb').read()
        zi = zipfile.ZipInfo(f)
        zi.date_time = (2024, 1, 1, 0, 0, 0)
        zi.create_system = 3
        zi.compress_type = zipfile.ZIP_DEFLATED
        zi.external_attr = 0o100644 << 16
        z.writestr(zi, data)
print('web static zip bytes:', os.path.getsize(zp))
