# -*- coding: utf-8 -*-
import zipfile, os
d = r'F:\网站全栈项目\项目008采集\cloudbase-fn'
zp = os.path.join(d, 'pp-worker-static.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    data = open(os.path.join(d, 'worker.js'), 'rb').read()
    zi = zipfile.ZipInfo('worker.js')
    zi.date_time = (2024, 1, 1, 0, 0, 0)
    zi.create_system = 3
    zi.compress_type = zipfile.ZIP_DEFLATED
    zi.external_attr = 0o100644 << 16
    z.writestr(zi, data)
print('worker static zip bytes:', os.path.getsize(zp))
