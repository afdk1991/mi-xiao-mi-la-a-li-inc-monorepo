// ============================================================
// CloudBase 小程序接入模板（微信原生 / Taro / uni-app）
// 场景：小程序端使用 wx.cloud 直连云开发
// 前提：小程序已在开发者工具中开通云开发
// 依据：docs.cloudbase.net — 文档数据库：小程序 SDK
// ============================================================

// 环境 ID 在 app.js 的 wx.cloud.init 中配置
const ENV_ID = 'YOUR_ENV_ID';

// app.js —— 初始化（只需一次）
/*
App({
  onLaunch() {
    wx.cloud.init({ env: 'YOUR_ENV_ID', traceUser: true });
  }
});
*/

const db = () => wx.cloud.database();
const _ = () => wx.cloud.database().command;

/** 新增 —— 小程序端返回 _id 同样在 _id 字段 */
async function add(coll, data) {
  const r = await db().collection(coll).add({
    data: { ...data, createdAt: db().serverDate() },
  });
  return r._id;
}

/** 查询 */
async function query(coll, where) {
  const r = await db().collection(coll).where(where).get();
  return r.data;
}

/** 分页 */
async function page(coll, where, skip = 0, limit = 20) {
  return (await db().collection(coll)
    .where(where).orderBy('createdAt', 'desc').skip(skip).limit(limit).get()).data;
}

/** 更新 */
async function update(coll, id, data) {
  return db().collection(coll).doc(id).update({ data });
}

/** 删除 */
async function remove(coll, id) {
  return db().collection(coll).doc(id).remove();
}

/** 实时监听 */
function watch(coll, where, cb) {
  return db().collection(coll).where(where).watch({
    onChange: (snap) => cb(snap.docs),
    onError: (err) => console.error('[watch]', err),
  });
}

/** 文件上传 —— 小程序端走 wx.cloud.uploadFile */
async function upload(filePath, cloudPath) {
  const r = await wx.cloud.uploadFile({ cloudPath, filePath });
  return r.fileID; // 库里只存 fileID，不要存临时 URL
}

/** 拿临时访问链接 */
async function getUrl(fileID) {
  const r = await wx.cloud.getTempFileURL({ fileList: [fileID] });
  return r.fileList[0].tempFileURL;
}

/** 调用云函数 */
async function callFn(name, data) {
  const r = await wx.cloud.callFunction({ name, data });
  return r.result;
}

module.exports = { db, _, add, query, page, update, remove, watch, upload, getUrl, callFn, ENV_ID };
