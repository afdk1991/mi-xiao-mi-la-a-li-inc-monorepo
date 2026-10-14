/* ============================================================
   mixm.top · 米小米 —— 站点逻辑
   - 能力矩阵：平台根路由 /  → data.modules（34 行业模块）
   - 功能模块：平台接口 /api/modules → data[]（8 个详细模块，含状态）
   - 任一接口不可达时回退内置清单，保证页面完整可用
   ============================================================ */
(function () {
  "use strict";

  var FALLBACK_INDUSTRIES = [
    "电商", "会员", "AI工具", "CRM", "本地生活", "OA办公", "笔记", "财务",
    "考勤", "项目管理", "营销SaaS", "在线教育", "本地信息", "跨境独立站", "社区团购", "多商户商城",
    "大宗批发", "家政上门", "进销存ERP", "房产平台", "汽车平台", "兴趣社区", "票务预订", "供应链集采",
    "招投标平台", "物流货运", "宠物经济", "游戏电竞", "金融工具", "开发者工具", "WaaS平台", "AI智库",
    "新能源汽车", "自由职业者"
  ];

  var FALLBACK_FEATURE_MODULES = [
    { id: "mall", name: "B2C商城", path: "/mall", status: "active" },
    { id: "b2b2c", name: "多商户商城", path: "/b2b2c", status: "active" },
    { id: "membership", name: "会员积分", path: "/points", status: "active" },
    { id: "ai", name: "AI内容生产", path: "/ai-content", status: "developing" },
    { id: "crm", name: "CRM系统", path: "/crm", status: "developing" },
    { id: "booking", name: "本地预约", path: "/booking", status: "developing" },
    { id: "education", name: "知识教育", path: "/school", status: "developing" },
    { id: "supply", name: "供应链集采", path: "/supply", status: "developing" }
  ];

  function el(id) { return document.getElementById(id); }

  function setApiState(id, ok, text) {
    var s = el(id);
    if (!s) return;
    s.textContent = text;
    s.className = "api-state" + (ok ? " ok" : " err");
  }

  // ---------- 能力矩阵（34 行业模块） ----------
  // 数据源：/api/platform → nginx 反代 → node-api 根路由 {data:{version, modules:[...]}}
  var INDUSTRIES_API = "/api/platform";

  function renderIndustries(list) {
    var grid = el("moduleGrid");
    if (!grid) return;
    grid.innerHTML = "";
    list.forEach(function (name) {
      var card = document.createElement("div");
      card.className = "mod";
      var dot = document.createElement("span");
      dot.className = "mod-dot";
      var txt = document.createElement("span");
      txt.textContent = name;
      card.appendChild(dot);
      card.appendChild(txt);
      grid.appendChild(card);
    });
  }

  function renderIndustrySkeleton(n) {
    var grid = el("moduleGrid");
    if (!grid) return;
    var html = "";
    for (var i = 0; i < n; i++) html += '<div class="mod skeleton">·</div>';
    grid.innerHTML = html;
  }

  // ---------- 功能模块（8 详细模块） ----------
  function renderFeatureModules(list) {
    var grid = el("fmGrid");
    if (!grid) return;
    grid.innerHTML = "";
    list.forEach(function (m) {
      var card = document.createElement("div");
      card.className = "fm";

      var top = document.createElement("div");
      top.className = "fm-top";
      var name = document.createElement("span");
      name.className = "fm-name";
      name.textContent = m.name;
      var st = document.createElement("span");
      st.className = "fm-status " + (m.status === "active" ? "active" : "developing");
      st.textContent = m.status === "active" ? "已上线" : "开发中";
      top.appendChild(name);
      top.appendChild(st);

      var p = document.createElement("div");
      p.className = "fm-path";
      p.textContent = m.path || "/";

      var idl = document.createElement("div");
      idl.className = "fm-id";
      idl.textContent = "id: " + (m.id || "-");

      card.appendChild(top);
      card.appendChild(p);
      card.appendChild(idl);
      grid.appendChild(card);
    });
  }

  function renderFeatureSkeleton(n) {
    var grid = el("fmGrid");
    if (!grid) return;
    var html = "";
    for (var i = 0; i < n; i++) html += '<div class="fm skeleton">·</div>';
    grid.innerHTML = html;
  }

  function updateHeroStats(modules, version) {
    var mc = el("statModules"); if (mc) mc.textContent = String(modules.length);
    var hc = el("heroModuleCount"); if (hc) hc.textContent = String(modules.length);
    var sv = el("statVersion"); if (sv) sv.textContent = (version || "8.0");
  }

  function fetchJson(url, timeoutMs) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 6000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function (e) { clearTimeout(timer); throw e; });
  }

  // 解析「34 行业模块」：{data:{modules:[..]}} / {modules:[..]} / 数组
  function parseIndustries(data) {
    if (Array.isArray(data)) return { list: data, version: null };
    if (data && Array.isArray(data.modules)) return { list: data.modules, version: data.version };
    if (data && data.data && Array.isArray(data.data.modules)) return { list: data.data.modules, version: data.data.version || data.version };
    return null;
  }

  // 解析「8 功能模块」：{data:[..]} / 数组
  function parseFeatureModules(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && data.data && Array.isArray(data.data.data)) return data.data.data;
    return null;
  }

  function loadIndustries() {
    renderIndustrySkeleton(12);
    setApiState("apiState", false, "正在接入平台 API…");
    fetchJson(INDUSTRIES_API)
      .then(parseIndustries)
      .then(function (res) {
        if (!res || !res.list || res.list.length === 0) throw new Error("empty");
        renderIndustries(res.list);
        updateHeroStats(res.list, res.version);
        setApiState("apiState", true, "已实时接入 · " + res.list.length + " 行业模块");
      })
      .catch(function () {
        renderIndustries(FALLBACK_INDUSTRIES);
        updateHeroStats(FALLBACK_INDUSTRIES, "8.0");
        setApiState("apiState", false, "API 暂不可达，展示内置清单");
      });
  }

  function loadFeatureModules() {
    renderFeatureSkeleton(8);
    setApiState("apiState2", false, "正在接入 /api/modules…");
    fetchJson("/api/modules")
      .then(parseFeatureModules)
      .then(function (list) {
        if (!list || list.length === 0) throw new Error("empty");
        renderFeatureModules(list);
        setApiState("apiState2", true, "已实时同步 · " + list.length + " 个模块");
      })
      .catch(function () {
        renderFeatureModules(FALLBACK_FEATURE_MODULES);
        setApiState("apiState2", false, "API 暂不可达，展示内置清单");
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadIndustries();
    loadFeatureModules();
  });
})();
