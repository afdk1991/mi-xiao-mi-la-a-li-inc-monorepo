// 运行时能力探针：TextDecoder 编码支持 + 动态 GBK 反向码表可行性
export const onRequestGet = async () => {
  const out = { runtime: 'edgeone-functions', ts: Date.now() };

  // 1) TextDecoder 各编码支持；用“保温杯”GBK 字节 B1A3 CEC2 B1AD
  out.decoder = {};
  for (const enc of ['utf-8', 'gbk', 'gb2312', 'gb18030', 'big5']) {
    try {
      const d = new TextDecoder(enc);
      out.decoder[enc] = d.decode(new Uint8Array([0xB1, 0xA3, 0xCE, 0xC2, 0xB1, 0xAD]));
    } catch (e) {
      out.decoder[enc] = 'UNSUPPORTED';
    }
  }

  // 2) 批量枚举 GBK 双字节并一次解码，验证位置对齐（用于反向编码表）
  try {
    const bytes = [];
    for (let b1 = 0x81; b1 <= 0xFE; b1++) {
      for (let b2 = 0x40; b2 <= 0xFE; b2++) {
        if (b2 === 0x7F) continue;
        bytes.push(b1, b2);
      }
    }
    const expected = bytes.length / 2;
    const t0 = Date.now();
    const s = new TextDecoder('gbk').decode(new Uint8Array(bytes));
    out.reverse = {
      expectedPairs: expected,
      decodedLen: s.length,
      aligned: s.length === expected,
      ms: Date.now() - t0,
      head: s.slice(0, 6),
    };
  } catch (e) {
    out.reverse = 'FAIL:' + e.message;
  }

  return new Response(JSON.stringify(out), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
