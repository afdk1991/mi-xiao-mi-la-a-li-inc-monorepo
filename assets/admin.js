/* ===========================================================
   admin.js —— 管理后台（受 admins 表保护）
   功能：分类 / 资源 / 文章元数据 的增删改查（云端）
   依赖：assets/cloud.js（提供 window.CLOUD.cloud 与鉴权）
   =========================================================== */
(function () {
  'use strict';
  var cloud = window.CLOUD && window.CLOUD.cloud;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s); }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function show(msg, kind) {
    var el = $('adminMsg'); if (!el) return;
    el.textContent = msg || '';
    el.className = 'wb-msg' + (kind ? ' ' + kind : '');
  }

  // 网关：未登录 / 非管理员时显示，提供登录或认领入口
  function showGate(isLoggedIn) {
    var gate = $('adminGate'), panel = $('adminPanel');
    if (gate) gate.style.display = '';
    if (panel) panel.style.display = 'none';
    show(isLoggedIn
      ? '当前账号还不是管理员。点击「申请成为管理员」会把当前账号加入 admins 表（仅个人站点适用）。'
      : '请先登录后再进入管理后台。');
    var enter = $('adminEnterBtn');
    if (enter) enter.onclick = function () {
      if (!isLoggedIn) { if (window.CLOUD) window.CLOUD.authUI.open(); return; }
      if (confirm('确认为当前账号申请管理员权限？（仅个人站点使用）')) {
        window.CLOUD.admin.claim().then(function (r) {
          if (r.error) { show('申请失败：' + (r.error.message || ''), 'err'); }
          else { show('已设为管理员，正在刷新…', 'ok'); setTimeout(function () { location.reload(); }, 700); }
        });
      }
    };
  }

  // ---------- 分类 ----------
  function renderCategories() {
    cloud.database.from('categories').select('code,title,description').order('code', { ascending: true })
      .then(function (r) {
        var el = $('tabCategories'); if (!el) return;
        if (r.error) { el.innerHTML = '<div class="note">加载失败</div>'; return; }
        var rows = r.data || [];
        el.innerHTML = '<table class="wb-admin-table"><thead><tr><th>代码</th><th>标题</th><th>描述</th><th>操作</th></tr></thead><tbody>' +
          rows.map(function (c) {
            return '<tr><td>' + escHtml(c.code) + '</td><td>' + escHtml(c.title) + '</td><td>' +
              escHtml(c.description) + '</td><td><button data-act="edit-cat" data-code="' + escHtml(c.code) +
              '">编辑</button> <button data-act="del-cat" data-code="' + escHtml(c.code) + '">删除</button></td></tr>';
          }).join('') + '</tbody></table>';
      });
  }
  function catForm(code) {
    var go = function (cur) {
      var t = prompt('分类标题：', cur && cur.title ? cur.title : '');
      if (t === null) return;
      var d = prompt('分类描述：', cur && cur.description ? cur.description : '');
      if (d === null) return;
      var done = function () { renderCategories(); show('已保存', 'ok'); };
      if (code) {
        cloud.database.from('categories').update({ title: t, description: d }).eq('code', code)
          .then(function (r) { if (r.error) show('更新失败：' + r.error.message, 'err'); else done(); });
      } else {
        var c2 = prompt('分类代码（A-H 单字母）：', '');
        if (!c2) return;
        cloud.database.from('categories').insert({ code: c2.toUpperCase(), title: t, description: d })
          .then(function (r) { if (r.error) show('新增失败：' + r.error.message, 'err'); else done(); });
      }
    };
    if (code) {
      cloud.database.from('categories').select('code,title,description').eq('code', code).single()
        .then(function (r) { go(r.data || null); });
    } else { go(null); }
  }

  // ---------- 资源 ----------
  function linksParse(text) {
    // 每行 "标签|网址"，转成 [[label,url],...]
    var out = [];
    (text || '').split('\n').forEach(function (line) {
      line = line.trim(); if (!line) return;
      var i = line.indexOf('|');
      if (i === -1) out.push([line, '']);
      else out.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    });
    return out;
  }
  function linksToText(links) {
    if (!Array.isArray(links)) return '';
    return links.map(function (l) { return (l[0] || '') + '|' + (l[1] || ''); }).join('\n');
  }
  function renderResources() {
    cloud.database.from('resources').select('id,cat,name,type,license_level,license').order('id', { ascending: true })
      .then(function (r) {
        var el = $('tabResources'); if (!el) return;
        if (r.error) { el.innerHTML = '<div class="note">加载失败</div>'; return; }
        var rows = r.data || [];
        el.innerHTML = '<table class="wb-admin-table"><thead><tr><th>ID</th><th>类</th><th>名称</th><th>类型</th><th>许可等级</th><th>许可</th><th>操作</th></tr></thead><tbody>' +
          rows.map(function (x) {
            return '<tr><td>' + x.id + '</td><td>' + escHtml(x.cat) + '</td><td>' + escHtml(x.name) +
              '</td><td>' + escHtml(x.type) + '</td><td>' + escHtml(x.license_level) + '</td><td>' +
              escHtml(x.license) + '</td><td><button data-act="edit-res" data-id="' + x.id +
              '">编辑</button> <button data-act="del-res" data-id="' + x.id + '">删除</button></td></tr>';
          }).join('') + '</tbody></table>';
      });
  }
  function resForm(id, r0) {
    r0 = r0 || null;
    var cat = prompt('类目代码（A-H）：', r0 ? r0.cat : '');
    if (cat === null) return;
    var name = prompt('名称：', r0 ? r0.name : ''); if (name === null) return;
    var type = prompt('类型：', r0 ? r0.type : ''); if (type === null) return;
    var licLv = prompt('许可等级（g/a/r）：', r0 ? r0.license_level : 'g'); if (licLv === null) return;
    var lic = prompt('许可/版权说明：', r0 ? r0.license : ''); if (lic === null) return;
    var desc = prompt('主要内容：', r0 ? r0.description : ''); if (desc === null) return;
    var who = prompt('适合人群：', r0 ? r0.audience : ''); if (who === null) return;
    var linksText = prompt('获取渠道（每行 "标签|网址"）：', r0 ? linksToText(r0.links) : '');
    if (linksText === null) return;
    var payload = {
      cat: cat.toUpperCase(), name: name, type: type, license_level: licLv, license: lic,
      description: desc, audience: who, links: linksParse(linksText)
    };
    var done = function () { renderResources(); show('已保存', 'ok'); };
    var run;
    if (id) run = cloud.database.from('resources').update(payload).eq('id', id);
    else run = cloud.database.from('resources').insert(payload);
    run.then(function (r) { if (r.error) show('保存失败：' + r.error.message, 'err'); else done(); });
  }

  // ---------- 文章元数据 ----------
  function renderArticles() {
    cloud.database.from('articles').select('slug,title,category,original,source').order('slug', { ascending: true })
      .then(function (r) {
        var el = $('tabArticles'); if (!el) return;
        if (r.error) { el.innerHTML = '<div class="note">加载失败</div>'; return; }
        var rows = r.data || [];
        el.innerHTML = '<table class="wb-admin-table"><thead><tr><th>slug</th><th>标题</th><th>类</th><th>原创</th><th>来源</th><th>操作</th></tr></thead><tbody>' +
          rows.map(function (a) {
            return '<tr><td>' + escHtml(a.slug) + '</td><td>' + escHtml(a.title) + '</td><td>' +
              escHtml(a.category) + '</td><td>' + (a.original ? '是' : '否') + '</td><td>' +
              escHtml(a.source) + '</td><td><button data-act="edit-art" data-slug="' + escHtml(a.slug) +
              '">编辑</button> <button data-act="del-art" data-slug="' + escHtml(a.slug) + '">删除</button></td></tr>';
          }).join('') + '</tbody></table>';
      });
  }
  function artForm(slug) {
    var title = prompt('标题：', ''); if (title === null) return;
    var cat = prompt('类目代码（A-H）：', 'A'); if (cat === null) return;
    var summary = prompt('摘要：', ''); if (summary === null) return;
    var license = prompt('许可：', 'CC BY 4.0'); if (license === null) return;
    var source = prompt('来源（原创留空）：', ''); if (source === null) return;
    var sourceUrl = prompt('原文链接（可空）：', ''); if (sourceUrl === null) return;
    var read = prompt('阅读时长：', ''); if (read === null) return;
    var updated = prompt('更新时间：', ''); if (updated === null) return;
    var original = confirm('是否为原创文章？');
    var payload = {
      title: title, category: cat.toUpperCase(), summary: summary, license: license,
      source: source, source_url: sourceUrl, read_time: read, updated: updated, original: original, body: ''
    };
    var done = function () { renderArticles(); show('已保存（正文请通过静态文件 assets/articles/' + (slug || '新slug') + '.html 维护）', 'ok'); };
    var run;
    if (slug) run = cloud.database.from('articles').update(payload).eq('slug', slug);
    else { var s = prompt('slug（英文短标识）：', ''); if (!s) return; payload.slug = s; run = cloud.database.from('articles').insert(payload); }
    run.then(function (r) { if (r.error) show('保存失败：' + r.error.message, 'err'); else done(); });
  }

  // ---------- 事件委托 ----------
  function bindTableClicks() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'edit-cat') catForm(b.getAttribute('data-code'));
      else if (act === 'del-cat') {
        if (confirm('删除分类 ' + b.getAttribute('data-code') + '？')) {
          cloud.database.from('categories').delete().eq('code', b.getAttribute('data-code'))
            .then(function (r) { if (r.error) show('删除失败：' + r.error.message, 'err'); else renderCategories(); });
        }
      } else if (act === 'edit-res') {
        var id = b.getAttribute('data-id');
        cloud.database.from('resources').select('*').eq('id', id).single().then(function (r) {
          if (r.data) resForm(id, r.data);
        });
      } else if (act === 'del-res') {
        if (confirm('删除资源 #' + b.getAttribute('data-id') + '？')) {
          cloud.database.from('resources').delete().eq('id', b.getAttribute('data-id'))
            .then(function (r) { if (r.error) show('删除失败：' + r.error.message, 'err'); else renderResources(); });
        }
      } else if (act === 'edit-art') artForm(b.getAttribute('data-slug'));
      else if (act === 'del-art') {
        if (confirm('删除文章 ' + b.getAttribute('data-slug') + '？')) {
          cloud.database.from('articles').delete().eq('slug', b.getAttribute('data-slug'))
            .then(function (r) { if (r.error) show('删除失败：' + r.error.message, 'err'); else renderArticles(); });
        }
      }
    });
  }

  function renderPanel() {
    show('');
    $('adminPanel').style.display = '';
    $('adminGate').style.display = 'none';
    renderCategories(); renderResources(); renderArticles();
    bindTableClicks();
    var addCat = $('addCat'); if (addCat) addCat.addEventListener('click', function () { catForm(null); });
    var addRes = $('addRes'); if (addRes) addRes.addEventListener('click', function () { resForm(null, null); });
    var addArt = $('addArt'); if (addArt) addArt.addEventListener('click', function () { artForm(null); });
  }

  // 旧入口占位（实际逻辑已上移为新的 init，下方重新定义）
  function init() {
    if (!cloud) { show('云客户端未初始化', 'err'); return; }
    cloud.auth.getSession().then(function (sr) {
      if (!sr.data) { showGate(false); return; }
      window.CLOUD.admin.isAdmin().then(function (ok) {
        if (ok) renderPanel();
        else showGate(true);
      }).catch(function () { showGate(true); });
    }).catch(function () { showGate(false); });

    if (cloud.auth && cloud.auth.onAuthStateChange) {
      cloud.auth.onAuthStateChange(function (ev, session) {
        if (session && session.user) { init(); }
        else { showGate(false); }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
