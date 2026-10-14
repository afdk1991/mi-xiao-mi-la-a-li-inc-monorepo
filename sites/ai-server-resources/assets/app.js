/* ===========================================================
   站点公共脚本：数据渲染、筛选、导出、交互
   依赖：assets/data.js（提供 window.CATS / window.RESOURCES）
   =========================================================== */
(function () {
  'use strict';

  var CATS = window.CATS || {};
  var RESOURCES = window.RESOURCES || [];
  var LIC_LABEL = { g: '宽松可商用', a: '需署名/有限制', r: '需授权/禁止转载' };
  var LIC_MD = { g: '🟢 宽松可商用', a: '🟡 需署名 / 有限制', r: '🔴 需授权 / 禁止转载' };
  var CAT_ORDER = Object.keys(CATS);

  /* ---------- 工具 ---------- */
  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }
  function byId(id) { return RESOURCES.filter(function (r) { return r.id === id; })[0]; }
  function inCat(c) { return RESOURCES.filter(function (r) { return r.cat === c; }); }
  function countLic(list, l) { return list.filter(function (r) { return r.l === l; }).length; }
  function strip(s) { return String(s).replace(/<[^>]+>/g, ''); }

  /* ---------- 资源卡片 ---------- */
  function cardHTML(r) {
    return '<article class="card">'
      + '<h3><a href="resource.html?id=' + r.id + '">' + r.name + '</a></h3>'
      + '<div class="badges">'
      + '<span class="tag type">' + r.type + '</span>'
      + '<span class="tag ' + r.l + '">' + LIC_LABEL[r.l] + '</span>'
      + '</div>'
      + '<div class="row"><span class="k">内容</span><span>' + r.desc + '</span></div>'
      + '<div class="row"><span class="k">人群</span><span>' + r.who + '</span></div>'
      + '<div class="lic"><b>许可 / 版权：</b>' + r.lic + '</div>'
      + '<div class="links">'
      + r.links.map(function (l) {
        return '<a href="' + l[1] + '" target="_blank" rel="noreferrer">' + l[0] + ' ↗</a>';
      }).join('')
      + '<a href="resource.html?id=' + r.id + '" class="link-dashed">详情</a>'
      + '</div>'
      + '</article>';
  }
  function renderInto(el, list, emptyText) {
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="empty"><b>没有匹配的资源</b>' + (emptyText || '试试更换关键词，或清除筛选条件。') + '</div>';
      return;
    }
    el.innerHTML = '<div class="grid">' + list.map(cardHTML).join('') + '</div>';
  }

  /* ---------- 分类导航卡 ---------- */
  function catCardsHTML() {
    return '<div class="cat-grid">' + CAT_ORDER.map(function (k) {
      var items = inCat(k);
      var c = CATS[k];
      return '<a class="cat-card" href="category.html?c=' + k + '">'
        + '<div class="top"><span class="idx">' + k + '</span><h3>' + c.t + '</h3></div>'
        + '<p>' + c.d + '</p>'
        + '<div class="meta">'
        + '<span><b>' + items.length + '</b> 项资源</span>'
        + '<span>🟢 ' + countLic(items, 'g') + '</span>'
        + '<span>🟡 ' + countLic(items, 'a') + '</span>'
        + '<span>🔴 ' + countLic(items, 'r') + '</span>'
        + '</div></a>';
    }).join('') + '</div>';
  }

  /* ---------- 资源库筛选 ---------- */
  function initLibrary() {
    var out = document.getElementById('libOut');
    if (!out) return;
    var stat = document.getElementById('libStat');
    var qEl = document.getElementById('libQ');
    var sortEl = document.getElementById('libSort');
    var bar = document.getElementById('libCats');
    var state = { q: '', lic: null, cat: null, sort: 'default' };

    if (bar) {
      var html = '<span class="chip on" data-cat="">全部类别</span>';
      CAT_ORDER.forEach(function (k) {
        html += '<span class="chip" data-cat="' + k + '">' + k + ' · ' + CATS[k].t + '</span>';
      });
      bar.innerHTML = html;
    }

    function apply() {
      var list = RESOURCES.filter(function (r) {
        if (state.lic && r.l !== state.lic) return false;
        if (state.cat && r.cat !== state.cat) return false;
        if (state.q) {
          var hay = (r.name + r.type + r.desc + r.who + strip(r.lic) +
            r.links.map(function (l) { return l[0] + l[1]; }).join('')).toLowerCase();
          if (hay.indexOf(state.q) === -1) return false;
        }
        return true;
      });
      if (state.sort === 'lic') {
        var rank = { g: 0, a: 1, r: 2 };
        list.sort(function (x, y) { return rank[x.l] - rank[y.l] || x.id.localeCompare(y.id); });
      } else if (state.sort === 'name') {
        list.sort(function (x, y) { return x.name.localeCompare(y.name, 'zh'); });
      } else {
        list.sort(function (x, y) { return x.id.localeCompare(y.id); });
      }

      if (stat) {
        stat.textContent = '共 ' + list.length + ' 项'
          + (state.cat ? '（' + CATS[state.cat].t + '）' : '');
      }

      // 按类目分组显示
      if (!list.length) {
        out.innerHTML = '<div class="empty"><b>没有匹配的资源</b>试试更换关键词，或清除筛选条件。</div>';
        return;
      }
      var blocks = '';
      CAT_ORDER.forEach(function (k) {
        var items = list.filter(function (r) { return r.cat === k; });
        if (!items.length) return;
        blocks += '<div class="section">'
          + '<div class="section-head"><div>'
          + '<h2><span class="idx-tag">' + k + '</span> ' + CATS[k].t + '</h2>'
          + '<p class="sub">' + CATS[k].d + '</p></div>'
          + '<span class="more"><a href="category.html?c=' + k + '">查看分类页 →</a></span></div>'
          + '<div class="grid">' + items.map(cardHTML).join('') + '</div></div>';
      });
      out.innerHTML = blocks;
    }

    document.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('.chip') : null;
      if (!c) return;
      if (c.getAttribute('data-lic') !== null && c.hasAttribute('data-lic')) {
        state.lic = (state.lic === c.getAttribute('data-lic')) ? null : c.getAttribute('data-lic');
        document.querySelectorAll('#libToolbar .chip[data-lic]').forEach(function (x) {
          x.classList.toggle('on', x.getAttribute('data-lic') === state.lic);
        });
      }
      if (c.hasAttribute('data-cat')) {
        state.cat = c.getAttribute('data-cat') || null;
        document.querySelectorAll('#libCats .chip').forEach(function (x) {
          x.classList.toggle('on', x.getAttribute('data-cat') === state.cat);
        });
      }
      apply();
    });

    if (qEl) qEl.addEventListener('input', function (e) {
      state.q = e.target.value.trim().toLowerCase();
      apply();
    });
    if (sortEl) sortEl.addEventListener('change', function (e) {
      state.sort = e.target.value;
      apply();
    });

    // 支持 URL 预置参数：?q= / ?c= / ?lic=
    var pq = param('q'), pc = param('c'), pl = param('lic');
    if (pq && qEl) { qEl.value = pq; state.q = pq.trim().toLowerCase(); }
    if (pc && CATS[pc]) {
      state.cat = pc;
      if (bar) bar.querySelectorAll('.chip').forEach(function (x) {
        x.classList.toggle('on', x.getAttribute('data-cat') === pc);
      });
    }
    if (pl && (pl === 'g' || pl === 'a' || pl === 'r')) {
      state.lic = pl;
      document.querySelectorAll('#libToolbar .chip[data-lic]').forEach(function (x) {
        x.classList.toggle('on', x.getAttribute('data-lic') === pl);
      });
    }
    apply();
  }

  /* ---------- 分类详情页 ---------- */
  function initCategory() {
    var el = document.getElementById('catOut');
    if (!el) return;
    var key = (param('c') || 'A').toUpperCase();
    if (!CATS[key]) key = 'A';
    var c = CATS[key];
    var items = inCat(key);

    var t = document.getElementById('catTitle');
    var d = document.getElementById('catDesc');
    var m = document.getElementById('catMeta');
    var crumb = document.getElementById('catCrumb');
    if (t) t.textContent = key + '. ' + c.t;
    if (d) d.textContent = c.d;
    if (m) m.textContent = items.length + ' 项资源 · 🟢 ' + countLic(items, 'g')
      + ' / 🟡 ' + countLic(items, 'a') + ' / 🔴 ' + countLic(items, 'r');
    if (crumb) crumb.innerHTML = '<a href="index.html">首页</a><span>/</span>'
      + '<a href="resources.html">资源库</a><span>/</span>' + c.t;

    renderInto(el, items);

    // 上下分类翻页
    var pager = document.getElementById('catPager');
    if (pager) {
      var i = CAT_ORDER.indexOf(key);
      var prev = CAT_ORDER[i - 1], next = CAT_ORDER[i + 1];
      var h = '';
      if (prev) h += '<a href="category.html?c=' + prev + '"><span class="dir">← 上一类目</span>'
        + '<span class="ttl">' + prev + '. ' + CATS[prev].t + '</span></a>';
      else h += '<span class="pager-fill"></span>';
      if (next) h += '<a class="next" href="category.html?c=' + next + '"><span class="dir">下一类目 →</span>'
        + '<span class="ttl">' + next + '. ' + CATS[next].t + '</span></a>';
      else h += '<span class="pager-fill"></span>';
      pager.innerHTML = h;
    }
    document.title = key + '. ' + c.t + ' · 可转载资源清单';
  }

  /* ---------- 资源详情页 ---------- */
  function initResource() {
    var el = document.getElementById('resOut');
    if (!el) return;
    var id = param('id');
    var r = byId(id);
    if (!r) {
      el.innerHTML = '<div class="empty"><b>未找到该资源</b>请返回'
        + '<a href="resources.html">资源库</a>重新选择。</div>';
      return;
    }
    var c = CATS[r.cat];
    document.title = r.name + ' · 可转载资源清单';

    var crumb = document.getElementById('resCrumb');
    if (crumb) crumb.innerHTML = '<a href="index.html">首页</a><span>/</span>'
      + '<a href="resources.html">资源库</a><span>/</span>'
      + '<a href="category.html?c=' + r.cat + '">' + c.t + '</a><span>/</span>' + r.name;

    var main = '<div class="detail-head">'
      + '<div class="badges mb-sm">'
      + '<span class="tag type">' + r.type + '</span>'
      + '<span class="tag ' + r.l + '">' + LIC_LABEL[r.l] + '</span>'
      + '<span class="tag type">' + r.cat + ' · ' + c.t + '</span></div>'
      + '<h1>' + r.name + '</h1></div>'
      + '<div class="panel">'
      + '<h3>主要内容</h3><p class="panel-p">' + r.desc + '</p>'
      + '<h3>适合人群</h3><p class="panel-p">' + r.who + '</p>'
      + '<h3>许可与版权</h3>'
      + '<div class="lic-block">'
      + r.lic + '</div>'
      + '<h3>获取渠道</h3><div class="links">'
      + r.links.map(function (l) {
        return '<a href="' + l[1] + '" target="_blank" rel="noreferrer">' + l[0] + ' ↗</a>';
      }).join('')
      + '</div></div>';

    var related = inCat(r.cat).filter(function (x) { return x.id !== r.id; }).slice(0, 4);
    var side = '<div class="side-card"><h4>资源编号</h4>'
      + '<p class="mono-sm text-2 mb-0">' + r.id + '</p></div>'
      + '<div class="side-card"><h4>同类资源（' + c.t + '）</h4><ul>'
      + related.map(function (x) {
        return '<li><a href="resource.html?id=' + x.id + '">' + x.name + '</a></li>';
      }).join('')
      + '</ul></div>'
      + '<div class="side-card"><h4>转载前检查</h4><ul>'
      + '<li>打开原始链接，确认当前 LICENSE 未变更</li>'
      + '<li>区分<b>代码许可</b>与<b>文档 / 权重许可</b></li>'
      + '<li>保留原作者署名与原文链接</li>'
      + '<li>商标与 Logo 需单独授权</li>'
      + '</ul><p class="mt-md"><a class="btn ghost sm" href="compliance.html">查看合规指南 →</a></p></div>';

    el.innerHTML = '<div class="detail-grid"><div class="detail-main">' + main + '</div>'
      + '<aside>' + side + '</aside></div>';
  }

  /* ---------- 首页统计 / 精选 ---------- */
  function initHome() {
    var s = document.getElementById('homeStats');
    if (s) {
      var cells = [
        ['', RESOURCES.length, '收录资源总数'],
        ['', CAT_ORDER.length, '内容分类'],
        ['g', countLic(RESOURCES, 'g'), '宽松可商用'],
        ['a', countLic(RESOURCES, 'a'), '需署名 / 有限制'],
        ['r', countLic(RESOURCES, 'r'), '需授权 / 禁止转载']
      ];
      s.innerHTML = cells.map(function (c) {
        return '<div class="stat-card ' + c[0] + '"><div class="num">' + c[1] + '</div>'
          + '<div class="lbl">' + c[2] + '</div></div>';
      }).join('');
    }
    var cg = document.getElementById('homeCats');
    if (cg) cg.innerHTML = catCardsHTML();

    // 精选：每类各取 1 项宽松许可资源
    var pick = document.getElementById('homePicks');
    if (pick) {
      var picks = [];
      CAT_ORDER.forEach(function (k) {
        var hit = inCat(k).filter(function (r) { return r.l === 'g'; })[0];
        if (hit) picks.push(hit);
      });
      renderInto(pick, picks.slice(0, 6));
    }
    var t2 = document.getElementById('footTotal');
    if (t2) t2.textContent = RESOURCES.length;
  }

  /* ---------- 精选清单（21 项） ---------- */
  function curatedAll() {
    var S = window.CURATED_SECTIONS || [];
    var all = [];
    S.forEach(function (s) {
      s.items.forEach(function (it) { all.push({ sec: s, it: it }); });
    });
    return all;
  }
  function licTagOf(level) {
    return '<span class="tag ' + level + '">' + LIC_LABEL[level] + '</span>';
  }
  function initCurated() {
    var out = document.getElementById('curOut');
    if (!out) return;
    var S = window.CURATED_SECTIONS;
    var M = window.CURATED_META || {};
    var all = curatedAll();

    var html = '';
    S.forEach(function (s, si) {
      html += '<div class="section" id="sec-' + s.key + '">'
        + '<div class="section-head"><div>'
        + '<h2><span class="idx-tag">' + (si + 1) + '</span> ' + s.title + '</h2>'
        + '<p class="sub">共 ' + s.items.length + ' 项</p></div></div>'
        + '<div class="table-wrap"><table>'
        + '<thead><tr><th>名称</th><th>类型</th><th>核心内容</th><th>适合人群</th><th>获取渠道</th><th>许可状态</th></tr></thead><tbody>';
      s.items.forEach(function (it) {
        var need = /需核实/.test(it.note);
        html += '<tr>'
          + '<td><b>' + it.name + '</b></td>'
          + '<td>' + it.type + '</td>'
          + '<td>' + it.desc + '</td>'
          + '<td>' + it.who + '</td>'
          + '<td>' + it.links.map(function (l) {
            return '<a href="' + l[1] + '" target="_blank" rel="noreferrer">' + l[0] + ' ↗</a>';
          }).join('<br>') + '</td>'
          + '<td>' + licTagOf(it.level) + '<div class="lic-name"><b>' + it.lic + '</b></div>'
          + '<div class="lic-note">'
          + (need ? '<b class="text-danger">⚠️ ' : '') + it.note + (need ? '</b>' : '')
          + '</div></td></tr>';
      });
      html += '</tbody></table></div></div>';
    });
    out.innerHTML = html;

    // 统计
    var stat = document.getElementById('curStat');
    if (stat) {
      var cnt = { g: 0, a: 0, r: 0 };
      all.forEach(function (x) { cnt[x.it.level]++; });
      var need = all.filter(function (x) { return /需核实/.test(x.it.note); });
      stat.innerHTML = '<div class="stat-card"><div class="num">' + all.length + '</div>'
        + '<div class="lbl">精选资源</div></div>'
        + '<div class="stat-card"><div class="num">' + S.length + '</div>'
        + '<div class="lbl">分类</div></div>'
        + '<div class="stat-card g"><div class="num">' + cnt.g + '</div><div class="lbl">宽松可商用</div></div>'
        + '<div class="stat-card a"><div class="num">' + cnt.a + '</div><div class="lbl">需署名 / 有限制</div></div>'
        + '<div class="stat-card r"><div class="num">' + cnt.r + '</div><div class="lbl">仅可引用 / 需授权</div></div>'
        + '<div class="stat-card"><div class="num">' + need.length + '</div><div class="lbl">标注「需核实」项</div></div>';
    }

    // 需核实项汇总
    var vr = document.getElementById('curVerify');
    if (vr) {
      var need = all.filter(function (x) { return /需核实/.test(x.it.note); });
      vr.innerHTML = '<div class="table-wrap"><table><thead><tr>'
        + '<th>资源</th><th>许可状态</th><th>风险点</th></tr></thead><tbody>'
        + need.map(function (x) {
          return '<tr><td><b>' + x.it.name + '</b></td><td>' + x.it.lic + '</td>'
            + '<td>' + x.it.note + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    // 转载注意事项
    var nt = document.getElementById('curNotes');
    if (nt && window.CURATED_NOTES) {
      nt.innerHTML = '<div class="note-list">' + window.CURATED_NOTES.map(function (n, i) {
        return '<div class="note-item"><div class="nidx">' + (i + 1) + '</div>'
          + '<div><h4>' + n.t + '</h4><p>' + n.d + '</p></div></div>';
      }).join('') + '</div>';
    }

    var up = document.getElementById('curUpdated');
    if (up && M.updated) up.textContent = M.updated;
  }

  function toCuratedMarkdown() {
    var S = window.CURATED_SECTIONS || [];
    var M = window.CURATED_META || {};
    var all = curatedAll();
    var md = '# AI 大模型 + 服务器/计算机底层技术｜可转载资源精选清单（' + all.length + ' 项）\n\n';
    md += '> 编制日期：' + (M.updated || '') + '　|　用途：内容平台转载 / 引用　|　筛选口径：权威、公开、许可清晰优先\n';
    md += '> 许可标签：🟢 宽松可商用 · 🟡 需署名或有附加条件 · 🔴 仅允许署名引用或需授权 · ⚠️ 许可不明确需核实\n';
    md += '> 完整版（' + RESOURCES.length + ' 项）见 `RESOURCES.md` / 站点「资源库」页。\n\n---\n';

    S.forEach(function (s) {
      md += '\n## ' + s.title + '（' + s.items.length + ' 项）\n\n';
      md += '| 名称 | 类型 | 核心内容 | 适合人群 | 获取渠道 | 许可状态 |\n';
      md += '|---|---|---|---|---|---|\n';
      s.items.forEach(function (it) {
        md += '| **' + it.name + '** | ' + it.type + ' | ' + it.desc + ' | ' + it.who + ' | '
          + it.links.map(function (l) { return '[' + l[0] + '](' + l[1] + ')'; }).join(' / ') + ' | '
          + it.lic + '｜' + it.note + ' |\n';
      });
      md += '\n';
    });

    md += '---\n\n## 转载注意事项小结\n\n';
    (window.CURATED_NOTES || []).forEach(function (n, i) {
      md += '**' + (i + 1) + '. ' + n.t + '。** ' + n.d + '\n\n';
    });

    md += '### 合规速查：三步判断能否转载\n\n';
    md += '1. **找许可声明**——页面页脚 / 仓库 LICENSE / 文档 Legal Notice。找不到 → 默认不可转载，走邮件授权。\n';
    md += '2. **看条款类型**——CC 系列查 BY / SA / NC / ND 四个要素；开源项目查 OSI 许可名；论文查摘要页许可标注。\n';
    md += '3. **定使用方式**——原样转载 / 改编 / 翻译 / 商用，逐项对照上述限制，确认署名要素与链接是否齐备。\n\n';
    md += '---\n\n> 本清单许可信息基于 ' + (M.updated || '') + ' 的公开声明核实，仅供合规参考，不构成法律意见。'
      + '上游许可可能变更，正式商用前建议再次核对原始许可页面。\n';
    return md;
  }

  /* ---------- Markdown 导出 ---------- */
  function toMarkdown() {
    var md = '# AI 大模型与服务器 / 计算机技术 · 可转载资源清单\n\n';
    md += '> 整理时间：2026-10 ｜ 共 ' + RESOURCES.length + ' 项资源 ｜ 分 ' + CAT_ORDER.length + ' 大类\n>\n';
    md += '> **免责声明**：本清单为整理性索引，不构成法律意见。开源许可可能随版本变更，'
      + '模型权重许可与代码许可相互独立。**正式转载、商用或翻译前请逐项核对目标页面 / 仓库当前的 LICENSE 声明。**\n\n';
    md += '| 许可标记 | 含义 |\n|---|---|\n';
    md += '| 🟢 | 宽松可商用：保留许可声明即可商用、改写、再分发 |\n';
    md += '| 🟡 | 可转载但需署名 / 相同方式共享，或附带使用限制（如 RFC 不得修改、自定义模型许可门槛） |\n';
    md += '| 🔴 | 仅可引用片段或需书面授权：arXiv 默认许可、非商业许可、默认版权内容 |\n\n---\n';

    CAT_ORDER.forEach(function (k) {
      md += '\n## ' + k + '. ' + CATS[k].t + '（' + inCat(k).length + ' 项）\n\n' + CATS[k].d + '\n\n';
      inCat(k).forEach(function (r, i) {
        md += '### ' + (i + 1) + '. ' + r.name + '\n\n';
        md += '- **编号**：' + r.id + '\n';
        md += '- **类型**：' + r.type + '\n';
        md += '- **许可等级**：' + LIC_MD[r.l] + '\n';
        md += '- **许可 / 版权说明**：' + strip(r.lic) + '\n';
        md += '- **主要内容**：' + r.desc + '\n';
        md += '- **适合人群**：' + r.who + '\n';
        md += '- **获取渠道**：' + r.links.map(function (l) {
          return '[' + l[0] + '](' + l[1] + ')';
        }).join(' ｜ ') + '\n\n';
      });
    });

    md += '\n---\n\n## 附录 A：许可合规速查表\n\n';
    md += '| 许可类型 | 可商用 | 需署名 | 衍生需同协议 | 可修改 | 典型来源 |\n|---|---|---|---|---|---|\n';
    [
      ['CC0 / 公有领域', '✅', '否', '否', '✅', 'SQLite 官方文档、MDN 代码示例'],
      ['MIT / BSD / PostgreSQL License', '✅', '保留许可文本', '否', '✅', 'llama.cpp、Ollama、nginx 文档'],
      ['Apache-2.0', '✅', '保留 LICENSE+NOTICE、标注改动', '否', '✅', 'vLLM、Transformers、Qwen3、OLMo 2'],
      ['GPL-2.0', '✅', '✅', '✅ 强 copyleft', '✅', 'Linux 内核文档、man-pages'],
      ['GFDL 1.3', '✅', '✅', '✅', '✅', 'Arch Wiki'],
      ['CC BY 4.0', '✅', '✅', '否', '✅', 'Kubernetes 文档、Distill.pub'],
      ['CC BY-SA 4.0', '✅', '✅', '✅', '✅', '维基百科、MDN 文档、Red Hat 文档'],
      ['CC BY-NC-SA / BY-NC-ND', '❌ 非商业', '✅', '✅', 'ND 禁止改写', '阮一峰周刊、部分中文教程'],
      ['自定义模型许可', '部分允许', '✅ 含品牌要求', '视条款', '✅', 'Llama 4、Gemma、Qwen Research'],
      ['arXiv 默认非独占许可', '❌ 需授权', '—', '—', '❌', '仅 CC BY / CC0 版本可自由转载'],
      ['默认版权（知乎 / CSDN）', '❌ 书面授权', '—', '—', '❌', '站内转载功能或联系作者'],
      ['IETF TLP-5（RFC）', '✅ 复制/分发/翻译', '✅ 注明编号', '—', '❌ 不得改后称 RFC', 'RFC Editor']
    ].forEach(function (r) { md += '| ' + r.join(' | ') + ' |\n'; });

    md += '\n## 附录 B：转载五条红线\n\n';
    md += '1. **权重开放 ≠ 开源**：Llama 4（700M MAU 门槛 + "Built with Llama" + 衍生须以 Llama 开头命名）、'
      + 'Gemma 自定义条款、部分 Qwen 尺寸的 Research License（非商用）均非 OSI 认可许可。\n';
    md += '2. **arXiv 论文默认不可全文转载**：默认许可下版权仍归作者 / 出版方，'
      + '仅 CC BY / CC0 标注版本可自由转载；安全做法是引用观点、重画图表、注明编号。\n';
    md += '3. **商标与 Logo 不在 CC 范围内**：Mozilla、Red Hat、NVIDIA、Cloudflare 等品牌标识需单独授权。\n';
    md += '4. **中文社区内容默认禁止转载**：知乎、CSDN、掘金默认"保留所有权利"，注明出处不等于获得授权。\n';
    md += '5. **数据集许可独立于模型许可**：模型 Apache-2.0 不代表语料可再分发，需逐子集核对。\n\n';

    md += '## 附录 C：署名模板\n\n';
    md += '**CC BY-SA 4.0**\n\n```\n本文部分内容来自「<文章标题>」（<原文 URL>），作者 <作者>,\n'
      + '采用 CC BY-SA 4.0 许可发布，本文沿用相同许可。\n```\n\n';
    md += '**CC BY-NC-SA**\n\n```\n本文转载自《<标题>》（<原文 URL>），\n'
      + '采用「自由转载-非商用-非衍生-保持署名」许可，仅作非商业用途。\n```\n\n';
    md += '**Apache-2.0 / MIT**\n\n```\n本文代码/内容基于 <项目名>（<仓库 URL>）修改，\n'
      + '以 Apache License 2.0 发布；修改处已标注。\n```\n\n';
    md += '**RFC**\n\n```\n本节译自 IETF RFC <编号>，版权归 IETF Trust，\n'
      + '按 Trust Legal Provisions 复制与翻译，未作修改。\n```\n';
    return md;
  }

  function setupExport() {
    var mdOut = document.getElementById('mdOut');
    var modal = document.getElementById('modal');
    if (!mdOut || !modal) return;
    // 精选页导出精选版，其余页面导出全量版
    var curated = !!document.getElementById('curOut');
    var gen = curated ? toCuratedMarkdown : toMarkdown;
    var fname = curated ? 'CURATED.md' : 'RESOURCES.md';
    var title = document.getElementById('mdTitle');
    if (title) title.textContent = curated ? '精选清单（Markdown）' : '完整清单（Markdown）';
    document.querySelectorAll('.js-export').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var self = this;
        self.classList.add('is-loading');            // 加载态（样式见 style.css 07 区）
        // 生成 Markdown 为同步操作，短暂延时用于呈现加载反馈
        window.setTimeout(function () {
          mdOut.value = gen();
          self.classList.remove('is-loading');
          modal.classList.add('on');
        }, 140);
      });
    });
    var close = document.getElementById('closeBtn');
    if (close) close.addEventListener('click', function () { modal.classList.remove('on'); });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('on');
    });
    var copy = document.getElementById('copyBtn');
    if (copy) copy.addEventListener('click', function () {
      mdOut.select();
      var tip = document.getElementById('copyTip');
      var done = function () {
        if (tip) tip.textContent = '已复制到剪贴板';
        setTimeout(function () { if (tip) tip.textContent = ''; }, 2500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mdOut.value).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        try { document.execCommand('copy'); done(); } catch (e) { /* 忽略 */ }
      }
    });
    var dl = document.getElementById('dlBtn');
    if (dl) dl.addEventListener('click', function () {
      dl.classList.add('is-loading');
      window.setTimeout(function () {
        var blob = new Blob([gen()], { type: 'text/markdown;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fname;
        a.click();
        dl.classList.remove('is-loading');
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }, 140);
    });
  }

  /* ---------- 技术文章：列表 + 详情 ---------- */
  function artCardHTML(a) {
    return '<article class="card art-card">'
      + '<div class="badges">'
      + '<span class="tag type">' + a.cat + '</span>'
      + '<span class="tag g">' + a.license + '</span>'
      + '</div>'
      + '<h3><a href="article.html?id=' + a.id + '">' + a.title + '</a></h3>'
      + '<p class="art-sum">' + a.summary + '</p>'
      + '<div class="art-meta"><span>' + (a.source ? '↻ 官方原文转载' : '✎ 原创科普') + '</span>'
      + (a.source ? '<span>📄 ' + a.source + '</span>' : '')
      + '<span>⏱ ' + a.read + '</span>'
      + '<span>↻ ' + a.updated + '</span></div>'
      + '<div class="links"><a href="article.html?id=' + a.id + '" class="link-dashed">阅读全文 →</a></div>'
      + '</article>';
  }
  function initArticles() {
    var out = document.getElementById('artOut');
    if (!out) return;
    var stat = document.getElementById('artStat');
    // 原创正文 + 联网抓取的官方原文（许可均允许全文转载）
    var AS = (window.ARTICLES || []).concat(window.FETCHED || []);
    if (stat) {
      var n1 = (window.ARTICLES || []).length, n2 = (window.FETCHED || []).length;
      stat.textContent = '共 ' + AS.length + ' 篇正文：原创 ' + n1 + ' 篇 ＋ 官方原文转载 ' + n2 + ' 篇';
    }
    if (!AS.length) { out.innerHTML = '<div class="empty"><b>暂无文章</b></div>'; return; }
    out.innerHTML = '<div class="grid">' + AS.map(artCardHTML).join('') + '</div>';
  }
  function initArticle() {
    var el = document.getElementById('artDetailOut');
    if (!el) return;
    var id = param('id');
    var AS = (window.ARTICLES || []).concat(window.FETCHED || []);
    var a = AS.filter(function (x) { return x.id === id; })[0];
    if (!a) {
      el.innerHTML = '<div class="empty"><b>未找到该文章</b>请返回'
        + '<a href="articles.html">文章列表</a>重新选择。</div>';
      return;
    }
    document.title = a.title + ' · 技术文章';
    var crumb = document.getElementById('artCrumb');
    if (crumb) crumb.innerHTML = '<a href="index.html">首页</a><span>/</span>'
      + '<a href="articles.html">技术文章</a><span>/</span>' + a.title;

    var main = '<article class="article">'
      + '<div class="article-head">'
      + '<div class="badges mb-sm"><span class="tag type">' + a.cat + '</span>'
      + '<span class="tag g">' + a.license + '</span></div>'
      + '<h1>' + a.title + '</h1>'
      + '<div class="article-meta">' + (a.source ? '↻ 官方原文转载：' + a.source : '✎ 原创科普')
      + '　·　⏱ ' + a.read + '　·　↻ 更新 ' + a.updated + '</div>'
      + '</div>'
      + a.html
      + '</article>';

    var related = AS.filter(function (x) { return x.id !== a.id; }).slice(0, 4);
    var side = '<div class="side-card"><h4>许可</h4>'
      + '<p class="mono-sm text-2 mb-0">' + a.license + '</p></div>'
      + '<div class="side-card"><h4>更多技术文章</h4><ul>'
      + related.map(function (x) {
        return '<li><a href="article.html?id=' + x.id + '">' + x.title + '</a></li>';
      }).join('')
      + '</ul></div>'
      + '<div class="side-card"><h4>转载说明</h4><ul>'
      + '<li>本文为原创，采用 CC BY 4.0</li>'
      + '<li>可自由转载 / 改编 / 商用</li>'
      + '<li>请保留署名与许可声明</li>'
      + '<li>衍生作品同样以 CC BY 4.0 发布</li>'
      + '</ul><p class="mt-md"><a class="btn ghost sm" href="compliance.html">查看合规指南 →</a></p></div>';

    el.innerHTML = '<div class="detail-grid"><div class="detail-main">' + main + '</div>'
      + '<aside>' + side + '</aside></div>';
    // 收藏 + 评论（全栈：用户隔离，云端存储）
    if (window.CLOUD && window.CLOUD.articleExtras) {
      window.CLOUD.articleExtras.render(el, id);
    }
  }

  /* ---------- 全文阅读：一次性渲染全部文章的完整正文（非卡片清单） ---------- */
  function initFullContent() {
    var out = document.getElementById('fullOut');
    if (!out) return;

    var AS = (window.ARTICLES || []).concat(window.FETCHED || []);
    var n1 = (window.ARTICLES || []).length, n2 = (window.FETCHED || []).length;
    var chars = AS.reduce(function (n, a) {
      return n + String(a.html || '').replace(/<[^>]+>/g, '').length;
    }, 0);

    var stat = document.getElementById('fullStat');
    if (stat) {
      stat.textContent = '共 ' + AS.length + ' 篇正文（原创 ' + n1 + ' 篇 ＋ 官方原文转载 ' + n2
        + ' 篇），合计约 ' + chars + ' 字——以下为完整正文，可直接阅读。';
    }

    if (!AS.length) { out.innerHTML = '<div class="empty"><b>暂无正文内容</b></div>'; return; }

    // 目录（锚点跳转）
    var toc = document.getElementById('fullToc');
    if (toc) {
      toc.innerHTML = '<b class="toc-title">目录（点击跳转）</b><ol class="toc-list">'
        + AS.map(function (a, i) {
          return '<li><a href="#sec-' + a.id + '">' + (i + 1) + '. ' + a.title + '</a>'
            + '<span class="toc-kind ' + (a.source ? 'k-fetch' : 'k-orig') + '">'
            + (a.source ? '官方原文转载' : '原创科普') + '</span></li>';
        }).join('')
        + '</ol>';
    }

    // 正文：连续渲染，不做折叠
    out.innerHTML = AS.map(function (a, i) {
      return '<section class="full-sec" id="sec-' + a.id + '">'
        + '<div class="article">'
        + '<div class="article-head">'
        + '<div class="badges mb-sm"><span class="tag type">' + a.cat + '</span>'
        + '<span class="tag g">' + (a.source ? '官方原文转载' : '原创科普') + '</span></div>'
        + '<h2 class="full-h">' + (i + 1) + '. ' + a.title + '</h2>'
        + '<div class="article-meta">'
        + (a.source ? '↻ 官方原文转载：' + a.source + '　·　许可：' + a.license
                    : '✎ 原创科普　·　许可：' + a.license)
        + '　·　⏱ ' + a.read + '　·　↻ ' + a.updated + '</div>'
        + '</div>'
        + a.html
        + '</div></section>';
    }).join('');
  }

  /* ---------- 主题切换（明 / 暗，持久化 + 跟随系统） ---------- */
  function setupTheme() {
    var root = document.documentElement;
    if (!root) return;                       // DOM 桩环境（smoke-test）无 documentElement
    var btn = document.getElementById('themeToggle');
    function prefersDark() {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function apply(theme) {
      if (theme === 'dark' || theme === 'light') root.setAttribute('data-theme', theme);
      else root.removeAttribute('data-theme');
      var isDark = root.getAttribute('data-theme') === 'dark'
        || (!root.getAttribute('data-theme') && prefersDark());
      if (btn) { btn.textContent = isDark ? '☀' : '🌙'; btn.setAttribute('aria-pressed', String(isDark)); }
    }
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    apply(saved || (prefersDark() ? 'dark' : 'light'));
    if (btn) btn.addEventListener('click', function () {
      var next = (root.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
    // 用户未手动选择时，跟随系统配色实时切换
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        var cur = null;
        try { cur = localStorage.getItem('theme'); } catch (err) {}
        if (!cur) apply(e.matches ? 'dark' : 'light');
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---------- 阅读进度条（仅文章 / 全文视图） ---------- */
  function setupReadbar() {
    var bar = document.getElementById('readBar');
    if (!bar) return;
    function active() {
      if (location.hash) {
        var r = (location.hash.replace(/^#\//, '')).split('/')[0].split('?')[0];
        return r === 'article' || r === 'content';
      }
      return !!document.getElementById('artDetailOut') || !!document.getElementById('fullOut');
    }
    function update() {
      if (!active()) { bar.classList.remove('on'); bar.style.width = '0'; return; }
      var d = document.documentElement;
      var max = (d.scrollHeight - d.clientHeight) || 1;
      var p = Math.min(1, Math.max(0, (window.scrollY || d.scrollTop) / max));
      bar.classList.add('on');
      bar.style.width = (p * 100) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('hashchange', update);
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- 页头滚动阴影 ---------- */
  function setupHeaderShadow() {
    var h = document.querySelector ? document.querySelector('.site-header') : null;
    if (!h) return;
    function upd() { h.classList.toggle('scrolled', (window.scrollY || 0) > 8); }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ---------- 滚动渐显（reveal） ---------- */
  function setupReveal() {
    var sel = '.section,.panel,.note,.flow,.cat-grid,.grid,.stat-row,.note-list,.toc-box,.full-sec,.detail-grid,.detail-head';
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    function reg(el) { if (!el || el.classList.contains('reveal')) return; el.classList.add('reveal'); io.observe(el); }
    document.querySelectorAll(sel).forEach(reg);
    // 捕获动态注入的区块（全文阅读 / 文章详情）
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches(sel)) reg(n);
            if (n.querySelectorAll) n.querySelectorAll(sel).forEach(reg);
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
    // 兜底：1.6s 后强制显示，确保任何情况下内容最终可见
    setTimeout(function () {
      document.querySelectorAll(sel).forEach(reg);
      document.querySelectorAll('.reveal:not(.is-visible)').forEach(function (el) { el.classList.add('is-visible'); });
    }, 1600);
  }

  /* ---------- 通用交互 ---------- */
  function setupCommon() {
    // 主题 / 进度条 / 页头阴影 / 滚动渐显
    setupTheme();
    setupReadbar();
    setupHeaderShadow();
    setupReveal();

    // 移动端导航
    var tg = document.getElementById('navToggle');
    var nav = document.getElementById('siteNav');
    if (tg && nav) tg.addEventListener('click', function () { nav.classList.toggle('open'); });

    // 顶部搜索跳转资源库
    var gs = document.getElementById('globalSearch');
    if (gs) gs.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var v = gs.value.trim();
        window.location.href = 'resources.html' + (v ? '?q=' + encodeURIComponent(v) : '');
      }
    });

    // 首页百度式大搜索框：回车 或 点击「搜索资源」均跳转资源库
    var hs = document.getElementById('heroSearch');
    if (hs) {
      var goHero = function () {
        var v = hs.value.trim();
        window.location.href = 'resources.html' + (v ? '?q=' + encodeURIComponent(v) : '');
      };
      hs.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); goHero(); }
      });
      var bdForm = document.getElementById('bdSearch');
      if (bdForm) bdForm.addEventListener('submit', function (e) { e.preventDefault(); goHero(); });
    }

    // 回到顶部
    var tt = document.getElementById('toTop');
    if (tt) {
      window.addEventListener('scroll', function () {
        tt.classList.toggle('show', window.scrollY > 400);
      });
      tt.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // 模板复制按钮
    document.querySelectorAll('.btn.copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.getAttribute('data-target'));
        if (!target) return;
        var text = target.innerText;
        var done = function () {
          var old = btn.textContent;
          btn.textContent = '已复制';
          setTimeout(function () { btn.textContent = old; }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {
            try { document.execCommand('copy'); done(); } catch (e) { /* 忽略 */ }
          });
        }
      });
    });

    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
    var ft = document.getElementById('footTotal');
    if (ft) ft.textContent = RESOURCES.length;
  }

  /* ---------- 启动 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    setupCommon();
    setupExport();
    // 数据来自云端：先加载，再渲染（失败也用兜底空数据渲染，保证页面不白屏）
    var renderAll = function () {
      // 云端数据已就位：重新定序分类（CATS 为就地填充的同一引用）
      CAT_ORDER = Object.keys(CATS);
      initHome();
      initLibrary();
      initCategory();
      initResource();
      initCurated();
      initArticles();
      initArticle();
      initFullContent();
    };
    if (window.CLOUD && window.CLOUD.data) {
      window.CLOUD.data.load().then(renderAll, renderAll);
    } else {
      renderAll();
    }
  });

  window.SITE = {
    CATS: CATS, RESOURCES: RESOURCES, LIC_LABEL: LIC_LABEL,
    cardHTML: cardHTML, catCardsHTML: catCardsHTML, toMarkdown: toMarkdown,
    toCuratedMarkdown: toCuratedMarkdown,
    param: param, byId: byId, inCat: inCat, countLic: countLic,
    initArticles: initArticles, initArticle: initArticle,
    initFullContent: initFullContent
  };
})();
