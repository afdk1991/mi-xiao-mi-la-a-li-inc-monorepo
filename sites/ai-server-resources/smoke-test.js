// 全站渲染冒烟测试：用 DOM 桩在各页面上下文运行 data.js + app.js，校验关键容器是否被正确填充
// 用法：node smoke-test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = __dirname;
const dataSrc = fs.readFileSync(path.join(DIR, 'assets/data.js'), 'utf8');
const curatedSrc = fs.readFileSync(path.join(DIR, 'assets/curated.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(DIR, 'assets/app.js'), 'utf8');

// 各页面：文件名 + 访问参数 + 期望被填充的容器 id
const PAGES = [
  { file: 'index.html',     query: '',        expect: ['homeStats', 'homeCats', 'homePicks', 'footTotal', 'year'] },
  { file: 'resources.html', query: '',        expect: ['libOut', 'libStat', 'libCats', 'footTotal', 'year'] },
  { file: 'resources.html', query: '?q=vLLM', expect: ['libOut', 'libStat'] },
  { file: 'resources.html', query: '?c=C',    expect: ['libOut', 'libStat'] },
  { file: 'resources.html', query: '?lic=r',  expect: ['libOut', 'libStat'] },
  { file: 'category.html',  query: '?c=A',    expect: ['catOut', 'catTitle', 'catMeta', 'catCrumb', 'catPager'] },
  { file: 'category.html',  query: '?c=H',    expect: ['catOut', 'catTitle', 'catPager'] },
  { file: 'category.html',  query: '',        expect: ['catOut', 'catTitle'] },
  { file: 'resource.html',  query: '?id=C1',  expect: ['resOut', 'resCrumb'] },
  { file: 'resource.html',  query: '?id=H5',  expect: ['resOut', 'resCrumb'] },
  { file: 'resource.html',  query: '?id=ZZ9', expect: ['resOut'] },
  { file: 'compliance.html',query: '',        expect: ['footTotal', 'year'] },
  { file: 'about.html',     query: '',        expect: ['footTotal', 'year'] },
  { file: 'curated.html',   query: '',        expect: ['curOut', 'curStat', 'curVerify', 'curNotes', 'curUpdated', 'footTotal', 'year'] }
];

// 针对精选页的额外断言
const CURATED_ASSERT = [
  { id: 'curOut',    re: /<tr>/g,  expect: 21 + 6, desc: '表格数据行 + 表头行 = 21 项 + 6 个表头' },
  { id: 'curOut',    re: /class="tag /g, expect: 21, desc: '许可标签数 = 21' },
  { id: 'curVerify', re: /<tr>/g,  expect: 1 + 5, desc: '需核实项 = 5 条 + 表头' },
  { id: 'curNotes',  re: /class="note-item"/g, expect: 10, desc: '注意事项 = 10 条' },
  { id: 'curStat',   re: /class="stat-card/g, expect: 6, desc: '统计卡 = 6 张' }
];

function makeEl(id) {
  const el = {
    id, textContent: '', innerHTML: '', value: '', style: {},
    addEventListener() {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    querySelectorAll() { return []; },
    getAttribute() { return null; },
    hasAttribute() { return false; },
    setAttribute() {},
    select() {}, closest() { return null; }, appendChild() {}
  };
  return el;
}

function runPage(page) {
  const html = fs.readFileSync(path.join(DIR, page.file), 'utf8');
  // 该页面真实存在的 id 集合
  const ids = new Set();
  const re = /\sid="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);

  const store = {};
  const listeners = [];
  const sandbox = {
    console,
    setTimeout,
    Date,
    RegExp,
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    document: {
      getElementById(id) {
        if (!ids.has(id)) return null;
        if (!store[id]) store[id] = makeEl(id);
        return store[id];
      },
      querySelectorAll() { return []; },
      addEventListener(type, cb) { if (type === 'DOMContentLoaded') listeners.push(cb); },
      createElement() { return makeEl('tmp'); },
      execCommand() { return true; }
    }
  };
  sandbox.window = sandbox;
  sandbox.window.location = { search: page.query, href: '' };
  sandbox.window.addEventListener = function () {};
  sandbox.window.scrollY = 0;
  sandbox.window.scrollTo = function () {};

  const ctx = vm.createContext(sandbox);
  vm.runInContext(dataSrc, ctx, { filename: 'assets/data.js' });
  if (/assets\/curated\.js/.test(html)) {
    vm.runInContext(curatedSrc, ctx, { filename: 'assets/curated.js' });
  }
  vm.runInContext(appSrc, ctx, { filename: 'assets/app.js' });
  listeners.forEach((cb) => cb());

  const errors = [];
  page.expect.forEach((id) => {
    const el = store[id];
    const filled = el && (String(el.innerHTML).length > 0 || String(el.textContent).length > 0);
    if (!filled) errors.push('容器未填充: #' + id);
  });
  // 精选页结构断言
  if (page.file === 'curated.html') {
    CURATED_ASSERT.forEach((a) => {
      const html2 = String((store[a.id] && store[a.id].innerHTML) || '');
      const n = (html2.match(a.re) || []).length;
      if (n !== a.expect) {
        errors.push('#' + a.id + ' 断言失败：期望 ' + a.expect + '，实际 ' + n + '（' + a.desc + '）');
      }
    });
  }
  // 输出内容健康检查
  Object.keys(store).forEach((id) => {
    const s = String(store[id].innerHTML) + String(store[id].textContent);
    if (/undefined|NaN|\[object Object\]/.test(s)) errors.push('输出含异常占位符: #' + id);
  });
  return { errors, store };
}

let failed = 0;
PAGES.forEach((p) => {
  const { errors, store } = runPage(p);
  const label = p.file + (p.query || '');
  if (errors.length) {
    failed++;
    console.log('✗ ' + label);
    errors.forEach((e) => console.log('    - ' + e));
  } else {
    const extra = store.libOut ? '（' + (store.libOut.innerHTML.match(/class="card"/g) || []).length + ' 卡）' : '';
    console.log('✓ ' + label + extra);
  }
});

console.log('\n结果：' + (PAGES.length - failed) + '/' + PAGES.length + ' 个页面场景通过');
process.exit(failed ? 1 : 0);
