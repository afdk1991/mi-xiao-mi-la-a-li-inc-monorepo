// ============================================================
// CloudBase Node 服务端接入模板（NestJS / Express / Koa 后端）
// 场景：服务端以管理员身份操作数据库，绕过客户端权限限制
// 安装：npm install @cloudbase/node-sdk
// 依据：docs.cloudbase.net — Manager Node SDK
// ============================================================

const cloudbase = require('@cloudbase/node-sdk');

const ENV_ID = 'YOUR_ENV_ID';

// 服务端初始化：需配置密钥（从控制台获取，务必放环境变量，不要硬编码）
const app = cloudbase.init({
  env: ENV_ID,
  secretId: process.env.TENCENTCLOUD_SECRET_ID,
  secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
});

const db = app.database();
const _ = db.command;

/** 新增 */
async function add(coll, data) {
  const r = await db.collection(coll).add({ ...data, createdAt: new Date() });
  return r.id || r._id;
}

/** 查询 */
async function query(coll, where = {}) {
  return (await db.collection(coll).where(where).get()).data;
}

/** 分页 */
async function page(coll, where = {}, skip = 0, limit = 20) {
  return (await db.collection(coll)
    .where(where).orderBy('createdAt', 'desc').skip(skip).limit(limit).get()).data;
}

/** 批量导入 —— 数据迁移时用，分批避免单次过大 */
async function bulkInsert(coll, list, batch = 100) {
  for (let i = 0; i < list.length; i += batch) {
    const chunk = list.slice(i, i + batch);
    await db.collection(coll).add(chunk);
    console.log('imported', Math.min(i + batch, list.length), '/', list.length);
  }
}

/** 事务 —— 多集合一致性写入 */
async function runTransaction(fn) {
  const t = await db.startTransaction();
  try {
    const r = await fn(t);
    await t.commit();
    return r;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

module.exports = { app, db, _, add, query, page, bulkInsert, runTransaction };

// —— NestJS 集成示例 ——
// 建一个 Provider 全局注入，避免每次请求重复初始化：
/*
// cloudbase.provider.ts
import { Provider } from '@nestjs/common';
export const CloudBaseProvider: Provider = {
  provide: 'CLOUDBASE',
  useFactory: () => {
    const app = cloudbase.init({
      env: process.env.CLOUDBASE_ENV_ID,
      secretId: process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
    });
    return app.database();
  },
};
*/
