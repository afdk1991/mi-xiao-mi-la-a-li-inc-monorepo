/* 一次性维护脚本：把散落在页面里的内联样式收敛为公共类
   用法：node clean-inline.js
   只替换 style="…" 属性，不动 DOM 结构与 id，保证脚本功能不受影响。
   功能性内联样式（列宽 width:*、计数器 counter-reset:n）予以保留。 */
'use strict';
var fs = require('fs');

var MAP = [
  // —— 页面标题组 ——
  ['margin:0 0 8px;font-size:27px;letter-spacing:-.4px', 'page-title'],
  ['margin:0;color:var(--text-2);max-width:780px', 'page-lead'],
  ['margin:0;color:var(--text-2);max-width:820px', 'page-lead'],
  ['margin:0;color:var(--text-2);max-width:760px', 'page-lead'],
  ['margin:0 0 6px;color:var(--text-2);max-width:780px', 'page-lead'],
  ['margin-bottom:22px', 'page-head'],
  ['margin:10px 0 0;color:var(--text-3);font-size:13px', 'page-meta'],

  // —— 面板内文本 ——
  ['margin:0 0 12px;color:var(--text-2);font-size:14px', 'panel-lead'],
  ['margin:0 0 14px;color:var(--text-2);font-size:14px', 'panel-lead'],
  ['margin:0 0 16px;color:var(--text-2);font-size:14px', 'panel-lead'],
  ['margin:26px 0 10px;font-size:16px', 'panel-sub'],
  ['margin:14px 0 0;font-size:13.5px;color:var(--text-2)', 'text-2 mt-md'],
  ['margin:0;font-size:13px;color:var(--text-3)', 'text-3'],
  ['margin:0;padding-left:22px;color:var(--text-2);font-size:14px;line-height:2', 'steps'],

  // —— 间距工具类 ——
  ['margin-bottom:24px', 'mb-lg'],
  ['margin-top:26px', 'mt-lg'],
  ['margin-top:28px', 'mt-lg'],
  ['margin-top:8px', 'mt-sm'],
  ['margin-bottom:18px', 'mb-md'],
  ['margin:18px 0 0', 'mt-md'],
  ['margin-bottom:26px', ''],        // .stat-row 自带间距，直接移除
  ['flex:1', 'spacer'],
  ['margin-left:auto', 'ml-auto'],

  // —— 行内代码 / 表格 ——
  ['font-family:var(--mono);font-size:12.5px', 'mono-sm'],
  ['min-width:520px', 'table-narrow'],
  ['min-width:560px', 'table-mid'],
  ['min-width:600px', 'table-wide'],

  // —— 已由 .tb-row select 统一定义，可整体移除 ——
  ['padding:7px 10px;border:1px solid var(--border-strong);border-radius:8px;background:#fff;font-size:13px;color:var(--text)', '']
];

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function apply(html, styleVal, cls) {
  var re = new RegExp('<([a-zA-Z][\\w-]*)([^>]*?)\\sstyle="' + esc(styleVal) + '"([^>]*?)\\s?>', 'g');
  return html.replace(re, function (m, tag, before, after) {
    var attrs = (before || '') + ' ' + (after || '');
    var cm = /class="([^"]*)"/.exec(attrs);
    if (cls) {
      if (cm) attrs = attrs.replace(/class="([^"]*)"/, 'class="' + cm[1] + ' ' + cls + '"');
      else attrs += ' class="' + cls + '"';
    }
    attrs = attrs.replace(/\s{2,}/g, ' ').replace(/\s>/, '>');
    return '<' + tag + attrs + '>';
  });
}

var files = fs.readdirSync('.').filter(function (f) { return f.endsWith('.html'); });
var total = 0;
files.forEach(function (f) {
  var src = fs.readFileSync(f, 'utf8');
  var before = (src.match(/style="[^"]*"/g) || []).length;
  var out = src;
  MAP.forEach(function (m) { out = apply(out, m[0], m[1]); });
  var after = (out.match(/style="[^"]*"/g) || []).length;
  if (out !== src) fs.writeFileSync(f, out, 'utf8');
  total += before - after;
  console.log(f + '：内联样式 ' + before + ' → ' + after +
    (after ? '（保留 ' + (out.match(/style="[^"]*"/g) || []).join(' | ') + '）' : ''));
});
console.log('\n共收敛 ' + total + ' 处内联样式为公共类');
