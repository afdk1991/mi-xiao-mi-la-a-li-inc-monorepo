/* ===========================================================
   cloud.js —— 全栈后端桥接层（WorkBuddy Cloud Service）
   职责：
   1) 初始化云客户端（publicConfig 为公有配置，可安全内联）
   2) CLOUD.data.load()：从云端拉取 categories / resources / articles，
      映射为现有 app.js 期望的 window.CATS / RESOURCES / ARTICLES / FETCHED，
      并异步加载文章正文（静态文件 assets/articles/<slug>.html）
   3) 注入登录 / 注册 UI（邮箱验证码 + WorkBuddy + 微信），处理 OAuth 回调
   4) 文章详情页的收藏 + 评论（按用户隔离，RLS 保障）
   5) 管理后台鉴权与 CRUD 辅助
   依赖：先加载 CDN 全局 WorkBuddyCloud，再加载本文件
   =========================================================== */
(function () {
  'use strict';

  // ---- 公有配置（仅前端可见，无权限）----
  var PUBLIC_CONFIG = {
    endpoint: 'https://ai-server-res.app.workbuddy.host',
    oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
    publishableKey: 'wbpk_mYNHWXRnPgPBADbe6e552T_hcjDIA3RMneNo8zgCZ6PFVDfB4Ysfkum'
  };

  var cloud = null;
  try {
    cloud = WorkBuddyCloud.createWorkBuddyCloud({
      endpoint: PUBLIC_CONFIG.endpoint,
      oauthRelayBaseUrl: PUBLIC_CONFIG.oauthRelayBaseUrl,
      publishableKey: PUBLIC_CONFIG.publishableKey
    });
  } catch (e) {
    console.error('[cloud] 初始化失败：', e);
  }

  // ---- 同步初始化全局容器（稳定引用）----
  // app.js 在脚本加载时即捕获这些引用；data.load 随后就地填充，
  // 因此必须保证引用稳定（不可整体重新赋值 window.X）。
  window.CATS = window.CATS || {};
  window.RESOURCES = window.RESOURCES || [];
  window.ARTICLES = window.ARTICLES || [];
  window.FETCHED = window.FETCHED || [];

  // 就地填充辅助：保留原对象引用，仅清空并写入新内容
  function refillObj(obj, src) {
    Object.keys(obj).forEach(function (k) { delete obj[k]; });
    Object.keys(src).forEach(function (k) { obj[k] = src[k]; });
  }
  function refillArr(arr, src) {
    arr.length = 0;
    src.forEach(function (x) { arr.push(x); });
  }

  // ---- 工具 ----
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtTime(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
        ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    } catch (e) { return String(iso); }
  }

  // ---- 数据层 ----
  var data = {
    load: function () {
      // 兜底默认值，保证页面不崩溃
      window.CATS = window.CATS || {};
      window.RESOURCES = window.RESOURCES || [];
      window.ARTICLES = window.ARTICLES || [];
      window.FETCHED = window.FETCHED || [];

      if (!cloud) return Promise.resolve(false);

      var self = this;
      return Promise.all([
        cloud.database.from('categories').select('code,title,description').order('code', { ascending: true }),
        cloud.database.from('resources').select('id,cat,name,type,license_level,license,description,audience,links').order('id', { ascending: true }),
        cloud.database.from('articles').select('slug,title,category,summary,source,source_url,license,original,read_time,updated').order('slug', { ascending: true })
      ]).then(function (res) {
        var catR = res[0], resR = res[1], artR = res[2];
        if (catR.error) { console.error('[cloud] categories', catR.error); }
        if (resR.error) { console.error('[cloud] resources', resR.error); }
        if (artR.error) { console.error('[cloud] articles', artR.error); }

        // categories → {A:{t,d}}（就地填充，保持 app.js 持有的引用）
        var cats = {};
        (catR.data || []).forEach(function (c) { cats[c.code] = { t: c.title, d: c.description }; });
        refillObj(window.CATS, cats);

        // resources → 现有形状（就地填充，保持 app.js 持有的引用）
        var RES = (resR.data || []).map(function (r) {
          return {
            // 云端 resources.id 为 bigint 自增主键；前端（排序、详情页链接、后台 eq）一律按字符串处理
            id: String(r.id), cat: r.cat, name: r.name, type: r.type,
            l: r.license_level, lic: r.license, desc: r.description,
            who: r.audience, links: Array.isArray(r.links) ? r.links : []
          };
        });
        refillArr(window.RESOURCES, RES);

        // articles → ARTICLES(原创) + FETCHED(转载)
        var arts = (artR.data || []).map(function (a) {
          return {
            id: a.slug, title: a.title, cat: a.category, summary: a.summary,
            license: a.license, source: a.source || '', sourceUrl: a.source_url || '',
            read: a.read_time || '', updated: a.updated || '', html: '',
            _orig: !!a.original
          };
        });
        refillArr(window.ARTICLES, arts.filter(function (a) { return a._orig; }));
        refillArr(window.FETCHED, arts.filter(function (a) { return !a._orig; }));

        // 加载正文（静态文件）—— 全部并行
        return self._loadBodies(arts).then(function () { return true; });
      }).catch(function (err) {
        console.error('[cloud] 数据加载失败：', err);
        return false;
      });
    },

    _loadBodies: function (arts) {
      var base = (document.baseURI || location.href);
      var urlOf = function (id) {
        try { return new URL('assets/articles/' + id + '.html', base).href; }
        catch (e) { return 'assets/articles/' + id + '.html'; }
      };
      return Promise.all(arts.map(function (a) {
        return fetch(urlOf(a.id)).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        }).then(function (html) { a.html = html; }).catch(function () {
          a.html = '<div class="note"><b>正文加载失败</b>请刷新页面重试，或返回列表。</div>';
        });
      }));
    }
  };

  // ---- 鉴权 UI 与流程 ----
  var authUI = {
    btn: null,
    init: function () {
      if (!cloud) return;
      this._injectStyle();
      this._injectButton();
      this._injectModal();
      this._wireModal();
      this._bindState();
      this._handleCallback();
    },

    _injectStyle: function () {
      if (document.getElementById('wbAuthStyle')) return;
      var css = [
        '.wb-auth-btn{margin-left:8px;padding:6px 14px;border-radius:999px;border:1px solid var(--line,#e3e3e8);',
        'background:var(--brand,#3b6cff);color:#fff;cursor:pointer;font-size:13px;white-space:nowrap;}',
        '.wb-auth-btn.ghost{background:transparent;color:var(--text,#222);}',
        '.wb-user{position:relative;margin-left:8px;}',
        '.wb-user-btn{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;',
        'border:1px solid var(--line,#e3e3e8);background:transparent;cursor:pointer;font-size:13px;}',
        '.wb-user-menu{position:absolute;right:0;top:42px;min-width:160px;background:var(--card,#fff);',
        'border:1px solid var(--line,#e3e3e8);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.14);',
        'padding:8px;z-index:60;}',
        '.wb-user-menu a,.wb-user-menu button{display:block;width:100%;text-align:left;padding:8px 10px;',
        'border:0;background:transparent;border-radius:8px;cursor:pointer;font-size:14px;color:var(--text,#222);}',
        '.wb-user-menu a:hover,.wb-user-menu button:hover{background:var(--bg,#f5f5f8);}',
        '.wb-modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;',
        'justify-content:center;z-index:200;padding:16px;}',
        '.wb-modal-mask.on{display:flex;}',
        '.wb-modal{width:100%;max-width:420px;background:var(--card,#fff);border-radius:16px;padding:22px;',
        'box-shadow:0 20px 60px rgba(0,0,0,.25);}',
        '.wb-modal h3{margin:0 0 4px;font-size:18px;}',
        '.wb-modal p.sub{margin:0 0 16px;color:var(--text-2,#888);font-size:13px;}',
        '.wb-field{width:100%;padding:10px 12px;border:1px solid var(--line,#e3e3e8);border-radius:10px;',
        'font-size:14px;margin-bottom:10px;box-sizing:border-box;}',
        '.wb-opt{display:flex;gap:10px;margin:6px 0 14px;flex-wrap:wrap;}',
        '.wb-opt button{flex:1;min-width:120px;padding:10px;border-radius:10px;border:1px solid var(--line,#e3e3e8);',
        'background:var(--bg,#f5f5f8);cursor:pointer;font-size:14px;}',
        '.wb-primary{width:100%;padding:11px;border:0;border-radius:10px;background:var(--brand,#3b6cff);',
        'color:#fff;cursor:pointer;font-size:15px;margin-top:4px;}',
        '.wb-ghost{width:100%;padding:10px;border:1px solid var(--line,#e3e3e8);border-radius:10px;',
        'background:transparent;cursor:pointer;font-size:14px;margin-top:8px;}',
        '.wb-msg{font-size:13px;min-height:18px;margin-top:8px;}',
        '.wb-msg.err{color:#d33;}.wb-msg.ok{color:#2a9d4a;}',
        '.wb-divider{display:flex;align-items:center;gap:8px;color:var(--text-2,#888);font-size:12px;margin:12px 0;}',
        '.wb-divider::before,.wb-divider::after{content:"";flex:1;height:1px;background:var(--line,#e3e3e8);}'
      ].join('');
      var st = document.createElement('style');
      st.id = 'wbAuthStyle';
      st.textContent = css;
      document.head.appendChild(st);
    },

    _injectButton: function () {
      var box = document.querySelector('.nav-search') || document.querySelector('.site-header .container');
      if (!box) return;
      var btn = document.createElement('button');
      btn.id = 'wbAuthBtn';
      btn.className = 'wb-auth-btn';
      btn.type = 'button';
      btn.textContent = '登录';
      box.insertBefore(btn, box.firstChild);
      this.btn = btn;
    },

    _renderUser: function (user) {
      if (!this.btn) return;
      var old = document.getElementById('wbUserWrap');
      if (old) old.remove();
      if (!user) {
        this.btn.style.display = '';
        this.btn.textContent = '登录';
        return;
      }
      this.btn.style.display = 'none';
      var wrap = document.createElement('div');
      wrap.className = 'wb-user';
      wrap.id = 'wbUserWrap';
      var name = (user.name || (user.email || '').split('@')[0] || '用户');
      var btn = document.createElement('button');
      btn.className = 'wb-user-btn';
      btn.type = 'button';
      btn.textContent = '👤 ' + name;
      var menu = document.createElement('div');
      menu.className = 'wb-user-menu';
      menu.style.display = 'none';
      var adminLink = '<a href="admin.html">管理后台</a>';
      menu.innerHTML = adminLink +
        '<button type="button" id="wbLogout">退出登录</button>';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      });
      document.addEventListener('click', function () { menu.style.display = 'none'; });
      menu.querySelector('#wbLogout').addEventListener('click', function () {
        cloud.auth.signOut().then(function () { location.reload(); });
      });
      wrap.appendChild(btn);
      wrap.appendChild(menu);
      this.btn.parentNode.insertBefore(wrap, this.btn);
    },

    _injectModal: function () {
      if (document.getElementById('wbAuthModal')) return;
      var mask = document.createElement('div');
      mask.className = 'wb-modal-mask';
      mask.id = 'wbAuthModal';
      mask.innerHTML =
        '<div class="wb-modal">' +
        '<h3>登录 / 注册</h3>' +
        '<p class="sub">登录后可收藏资源、评论文章；数据保存在云端。</p>' +
        '<div class="wb-opt">' +
        '<button type="button" id="wbOtpTab">邮箱验证码</button>' +
        '<button type="button" id="wbWbTab">WorkBuddy</button>' +
        '<button type="button" id="wbWxTab">微信</button>' +
        '</div>' +
        '<div id="wbOtpPane">' +
        '<input class="wb-field" id="wbEmail" type="email" placeholder="你的邮箱（用于接收验证码）" />' +
        '<button class="wb-primary" type="button" id="wbSendCode">获取验证码</button>' +
        '<input class="wb-field" id="wbCode" type="text" placeholder="6 位验证码" style="margin-top:10px;" />' +
        '<button class="wb-primary" type="button" id="wbVerify">登录 / 注册</button>' +
        '</div>' +
        '<div id="wbOauthPane" style="display:none;">' +
        '<button class="wb-primary" type="button" id="wbWbLogin">使用 WorkBuddy 登录</button>' +
        '<button class="wb-ghost" type="button" id="wbWxLogin">使用微信登录</button>' +
        '</div>' +
        '<div class="wb-divider">提示</div>' +
        '<p class="sub" style="margin:0;">微信 / WorkBuddy 登录将在新标签页完成授权后自动返回本站。</p>' +
        '<div class="wb-msg" id="wbAuthMsg"></div>' +
        '<button class="wb-ghost" type="button" id="wbClose">关闭</button>' +
        '</div>';
      document.body.appendChild(mask);
      var self = this;
      mask.addEventListener('click', function (e) { if (e.target === mask) self.close(); });
      document.getElementById('wbClose').addEventListener('click', function () { self.close(); });
    },

    open: function () { var m = document.getElementById('wbAuthModal'); if (m) m.classList.add('on'); },
    close: function () { var m = document.getElementById('wbAuthModal'); if (m) m.classList.remove('on'); },

    _setMsg: function (txt, kind) {
      var el = document.getElementById('wbAuthMsg');
      if (!el) return;
      el.textContent = txt || '';
      el.className = 'wb-msg' + (kind ? ' ' + kind : '');
    },

    _wireModal: function () {
      var self = this;
      var otpTab = document.getElementById('wbOtpTab');
      var wbTab = document.getElementById('wbWbTab');
      var wxTab = document.getElementById('wbWxTab');
      var otpPane = document.getElementById('wbOtpPane');
      var oauthPane = document.getElementById('wbOauthPane');
      function show(which) {
        otpPane.style.display = (which === 'otp') ? '' : 'none';
        oauthPane.style.display = (which === 'oauth') ? '' : 'none';
        self._setMsg('');
      }
      if (otpTab) otpTab.addEventListener('click', function () { show('otp'); });
      if (wbTab) wbTab.addEventListener('click', function () { show('oauth'); });
      if (wxTab) wxTab.addEventListener('click', function () { show('oauth'); });

      if (this.btn) this.btn.addEventListener('click', function () { self.open(); });

      var pending = null;
      var sendBtn = document.getElementById('wbSendCode');
      if (sendBtn) sendBtn.addEventListener('click', function () {
        var email = (document.getElementById('wbEmail').value || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { self._setMsg('请输入有效的邮箱地址', 'err'); return; }
        sendBtn.disabled = true;
        self._setMsg('正在发送验证码…');
        cloud.auth.sendOtp({ email: email }).then(function (r) {
          if (r.error) { self._setMsg(r.error.message || '发送失败', 'err'); sendBtn.disabled = false; return; }
          pending = { email: email, verificationId: r.data.verificationId, isExistingUser: r.data.isExistingUser };
          self._setMsg('验证码已发送至 ' + email + '，请查收', 'ok');
          sendBtn.disabled = false;
        }).catch(function (e) { self._setMsg('网络错误，请重试', 'err'); sendBtn.disabled = false; });
      });

      var verifyBtn = document.getElementById('wbVerify');
      if (verifyBtn) verifyBtn.addEventListener('click', function () {
        var code = (document.getElementById('wbCode').value || '').trim();
        if (!pending) { self._setMsg('请先获取验证码', 'err'); return; }
        if (!/^\d{4,8}$/.test(code)) { self._setMsg('请输入正确的验证码', 'err'); return; }
        verifyBtn.disabled = true;
        cloud.auth.verifyOtp({
          email: pending.email, verificationId: pending.verificationId,
          isExistingUser: pending.isExistingUser, token: code
        }).then(function (r) {
          verifyBtn.disabled = false;
          if (r.error) { self._setMsg(r.error.message || '验证失败', 'err'); return; }
          self.close();
          self._refreshUser();
        }).catch(function () { self._setMsg('网络错误，请重试', 'err'); verifyBtn.disabled = false; });
      });

      var wbLogin = document.getElementById('wbWbLogin');
      if (wbLogin) wbLogin.addEventListener('click', function () {
        var back = new URL(location.href); back.pathname = '/';
        ['code', 'state', 'provider'].forEach(function (k) { back.searchParams.delete(k); });
        cloud.auth.signInWithOAuth({ provider: 'workbuddy', redirectTo: back.toString() })
          .then(function (r) {
            if (r.error) { self._setMsg(r.error.message || '发起授权失败', 'err'); return; }
            location.assign(r.data.url);
          }).catch(function () { self._setMsg('网络错误', 'err'); });
      });

      var wxLogin = document.getElementById('wbWxLogin');
      if (wxLogin) wxLogin.addEventListener('click', function () {
        cloud.auth.signInWithOAuth({ provider: 'wechat', redirectTo: location.origin })
          .then(function (r) {
            if (r.error) { self._setMsg(r.error.message || '发起授权失败', 'err'); return; }
            location.assign(r.data.url);
          }).catch(function () { self._setMsg('网络错误', 'err'); });
      });
    },

    _handleCallback: function () {
      var url = new URL(location.href);
      if (!url.searchParams.has('code') && !url.searchParams.has('error')) return;
      var provider = url.searchParams.get('provider');
      var self = this;
      if (provider !== 'workbuddy' && provider !== 'wechat') {
        this._setMsg('授权回调缺少有效的登录方式', 'err');
        return;
      }
      var handler = provider === 'workbuddy' ? cloud.auth.handleWorkBuddyCallback : cloud.auth.handleWechatWebCallback;
      if (typeof handler !== 'function') { this._setMsg('当前环境暂不支持此登录方式', 'err'); return; }
      handler.call(cloud.auth).then(function (r) {
        ['code', 'state', 'provider'].forEach(function (k) { url.searchParams.delete(k); });
        history.replaceState(null, '', url.pathname + url.search + url.hash);
        if (r.error) { self._setMsg(r.error.message || '登录失败', 'err'); }
        else if (r.data) { self.close(); self._refreshUser(); }
      }).catch(function () {});
    },

    _bindState: function () {
      var self = this;
      this._refreshUser();
      if (cloud.auth.onAuthStateChange) {
        cloud.auth.onAuthStateChange(function (ev, session) {
          self._renderUser(session && session.user ? session.user : null);
        });
      }
    },

    _refreshUser: function () {
      var self = this;
      cloud.auth.getSession().then(function (r) {
        var user = (r.data && r.data.user) ? r.data.user : null;
        self._renderUser(user);
      }).catch(function () {});
    }
  };

  // ---- 评论 + 收藏（文章详情页）----
  var articleExtras = {
    render: function (container, slug) {
      if (!container || !slug) return;
      var type = 'article';
      var wrap = document.createElement('section');
      wrap.className = 'wb-extras';
      wrap.style.marginTop = '28px';
      wrap.innerHTML =
        '<div class="wb-favbar" style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">' +
        '<button type="button" class="wb-fav-btn wb-field" id="wbFavBtn" style="width:auto;margin:0;">☆ 收藏</button>' +
        '<span class="wb-fav-hint" style="color:var(--text-2,#888);font-size:13px;">收藏后可随时在「我的」中找回</span>' +
        '</div>' +
        '<div class="wb-comments"><h3 style="margin:0 0 10px;">评论 <span id="wbCmtCount" style="color:var(--text-2,#888);font-weight:400;font-size:14px;"></span></h3>' +
        '<div id="wbCmtList"></div>' +
        '<div id="wbCmtForm" style="margin-top:14px;"></div></div>';

      container.appendChild(wrap);
      this._initFavorite(wrap.querySelector('#wbFavBtn'), type, slug);
      this._initComments(wrap.querySelector('#wbCmtList'), wrap.querySelector('#wbCmtForm'), type, slug);
    },

    _initFavorite: function (btn, type, slug) {
      if (!btn || !cloud) return;
      var self = this;
      function refresh() {
        cloud.auth.getSession().then(function (sr) {
          if (!sr.data) { btn.textContent = '☆ 收藏（登录后）'; btn.disabled = false; return; }
          cloud.database.from('favorites').select('id').eq('target_type', type).eq('target_slug', slug).maybeSingle()
            .then(function (r) {
              if (r.data) { btn.textContent = '★ 已收藏'; btn.classList.add('on'); }
              else { btn.textContent = '☆ 收藏'; btn.classList.remove('on'); }
              btn.disabled = false;
            });
        });
      }
      btn.addEventListener('click', function () {
        cloud.auth.getSession().then(function (sr) {
          if (!sr.data) { if (window.CLOUD) window.CLOUD.authUI.open(); return; }
          cloud.database.from('favorites').select('id').eq('target_type', type).eq('target_slug', slug).maybeSingle()
            .then(function (r) {
              if (r.data) {
                return cloud.database.from('favorites').delete().eq('target_type', type).eq('target_slug', slug)
                  .then(function () { refresh(); });
              }
              return cloud.database.from('favorites').insert({ target_type: type, target_slug: slug })
                .then(function (res) {
                  if (res.error) { alert('操作失败：' + (res.error.message || '')); return; }
                  refresh();
                });
            });
        });
      });
      refresh();
    },

    _initComments: function (listEl, formEl, type, slug) {
      if (!listEl || !formEl || !cloud) return;
      var self = this;
      function load() {
        cloud.database.from('comments').select('id,owner_name,content,created_at')
          .eq('target_type', type).eq('target_slug', slug).order('created_at', { ascending: true })
          .then(function (r) {
            var cnt = document.getElementById('wbCmtCount');
            if (cnt) cnt.textContent = r.data ? '(' + r.data.length + ')' : '';
            if (r.error) { listEl.innerHTML = '<div class="note">评论加载失败</div>'; return; }
            if (!r.data || !r.data.length) {
              listEl.innerHTML = '<div class="note" style="color:var(--text-2,#888);">还没有评论，来抢沙发～</div>';
              return;
            }
            listEl.innerHTML = r.data.map(function (c) {
              var mine = '';
              return '<div class="wb-cmt" style="border-top:1px solid var(--line,#e3e3e8);padding:12px 0;">' +
                '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-2,#888);">' +
                '<b style="color:var(--text,#222);">' + escHtml(c.owner_name || '匿名') + '</b>' +
                '<span>' + fmtTime(c.created_at) + '</span></div>' +
                '<div style="margin-top:6px;line-height:1.6;">' + escHtml(c.content) + '</div>' +
                mine + '</div>';
            }).join('');
          });
      }
      function renderForm() {
        cloud.auth.getSession().then(function (sr) {
          if (!sr.data) {
            formEl.innerHTML = '<div class="note">登录后即可发表评论。<button type="button" class="wb-ghost" id="wbCmtLogin" style="width:auto;margin:0 0 0 8px;padding:4px 10px;">去登录</button></div>';
            var lb = formEl.querySelector('#wbCmtLogin');
            if (lb && window.CLOUD) lb.addEventListener('click', function () { window.CLOUD.authUI.open(); });
            return;
          }
          formEl.innerHTML = '<textarea id="wbCmtInput" class="wb-field" rows="3" placeholder="理性发言，友善讨论…"></textarea>' +
            '<button type="button" class="wb-primary" id="wbCmtSubmit">发表评论</button>';
          formEl.querySelector('#wbCmtSubmit').addEventListener('click', function () {
            var ta = formEl.querySelector('#wbCmtInput');
            var v = (ta.value || '').trim();
            if (!v) { return; }
            var btn = formEl.querySelector('#wbCmtSubmit'); btn.disabled = true;
            cloud.database.from('comments').insert({
              target_type: type, target_slug: slug, content: v,
              owner_name: (sr.data.user && sr.data.user.name) || null
            }).then(function (r) {
              btn.disabled = false;
              if (r.error) { alert('评论失败：' + (r.error.message || '')); return; }
              ta.value = ''; load();
            });
          });
        });
      }
      load();
      renderForm();
    }
  };

  // ---- 管理后台辅助 ----
  var admin = {
    isAdmin: function () {
      if (!cloud) return Promise.resolve(false);
      return cloud.database.from('admins').select('id').maybeSingle()
        .then(function (r) { return !!r.data; })
        .catch(function () { return false; });
    },
    claim: function () {
      if (!cloud) return Promise.resolve({ error: { message: '未初始化' } });
      return cloud.database.from('admins').insert({}).then(function (r) {
        if (r.error) return { error: r.error };
        return { data: true };
      });
    }
  };

  window.CLOUD = {
    cloud: cloud,
    data: data,
    authUI: authUI,
    articleExtras: articleExtras,
    admin: admin,
    PUBLIC_CONFIG: PUBLIC_CONFIG
  };

  // 注入登录 UI（与页面渲染无关，独立初始化）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { authUI.init(); });
  } else {
    authUI.init();
  }
})();
