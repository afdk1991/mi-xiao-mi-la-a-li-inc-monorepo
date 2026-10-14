// ============================================================
// CloudBase 云函数模板（Node.js 运行时）
// 典型用途：API 代理（隐藏第三方 Key）、定时采集、Webhook 回调
// 依据：docs.cloudbase.net — 云函数
// ============================================================

const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: process.env.CLOUDBASE_ENV_ID || 'YOUR_ENV_ID' });
const db = app.database();

exports.main = async (event, context) => {
  const { action, payload } = event || {};

  try {
    switch (action) {
      // —— 示例：代理第三方 API，隐藏 Key ——
      // Key 存云函数环境变量，绝不返回给前端
      case 'proxy': {
        const KEY = process.env.THIRD_PARTY_KEY; // 控制台配置
        const url = payload.url;
        const res = await fetch(url, {
          headers: { Authorization: 'Bearer ' + KEY },
        });
        const data = await res.json();
        return { code: 0, data };
      }

      // —— 示例：写入数据库 ——
      case 'save': {
        const r = await db.collection(payload.coll).add({
          ...payload.data,
          createdAt: new Date(),
        });
        return { code: 0, id: r.id || r._id };
      }

      // —— 示例：查询 ——
      case 'list': {
        const d = await db.collection(payload.coll)
          .where(payload.where || {})
          .orderBy('createdAt', 'desc')
          .limit(payload.limit || 20)
          .get();
        return { code: 0, data: d.data };
      }

      default:
        return { code: -1, message: 'unknown action: ' + action };
    }
  } catch (e) {
    // 错误必须显式返回，不要静默失败
    return { code: -1, message: e.message };
  }
};

/*
部署要点：
1. 云函数默认超时较短，长耗时任务需调大超时或改用云托管 CloudRun
2. 云函数无长驻内存：Redis / 长连接池等有状态依赖需改造
3. 环境变量在控制台配置（THIRD_PARTY_KEY / CLOUDBASE_ENV_ID 等）
4. 定时采集任务配「定时触发器」，不要手动触发
*/
