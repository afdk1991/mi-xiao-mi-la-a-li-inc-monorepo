// ============================================================
// CloudBase Web SDK 接入模板  (Web / Vue / React / Vite / Taro)
// 场景：浏览器端直连 CloudBase（文档型数据库 + 认证 + 存储）
// 安装：npm install @cloudbase/js-sdk
// 依据：docs.cloudbase.net — Web SDK / 文档数据库：Web SDK
// ============================================================

import cloudbase from '@cloudbase/js-sdk';

// —— 环境 ID：在 CloudBase 控制台获取，注意填完整 EnvId，不要填别名 ——
export const ENV_ID = 'YOUR_ENV_ID';

// 全局单例：只初始化一次，各处复用（官方文档明确要求，不要每次调用都 init）
let _app: ReturnType<typeof cloudbase.init> | null = null;

export function getApp() {
  if (!_app) {
    _app = cloudbase.init({ env: ENV_ID });
  }
  return _app;
}

export function getDb() {
  return getApp().database();
}

export const _ = () => getDb().command;

// ===================== 认证 =====================
// 认证必须用 SDK 内置能力，不要把登录逻辑搬进云函数（官方明确要求）

export const auth = () => getApp().auth({ persistence: 'local' });

/** 匿名登录 —— 适合不需要用户身份的只读场景 */
export async function signInAnonymously() {
  await auth().signInAnonymously();
  return auth().getLoginState();
}

/** 邮箱密码登录 */
export async function signInWithEmail(email: string, password: string) {
  await auth().signInWithEmailAndPassword(email, password);
  return auth().getLoginState();
}

/** 退出 */
export async function signOut() {
  await auth().signOut();
}

/** 判断是否已登录 —— 查询前调用，避免权限不足报错 */
export async function isLoggedIn() {
  const s = await auth().getLoginState();
  return !!s;
}

// ===================== 数据库 CRUD =====================

export interface Doc { _id?: string; [k: string]: unknown }

/** 新增 —— 注意：新文档 ID 在 result._id，不是 result.id */
export async function add<T extends Doc>(coll: string, data: T): Promise<string> {
  const r = await getDb().collection(coll).add({ ...data, createdAt: new Date() });
  return (r as unknown as { _id: string })._id;
}

/** 条件查询 */
export async function query<T>(coll: string, where: Record<string, unknown>) {
  const r = await getDb().collection(coll).where(where).get();
  return r.data as T[];
}

/** 分页查询（务必加分页，不要无界读取） */
export async function page<T>(coll: string, where: Record<string, unknown>,
  orderBy = 'createdAt', skip = 0, limit = 20) {
  const r = await getDb().collection(coll)
    .where(where).orderBy(orderBy, 'desc').skip(skip).limit(limit).get();
  return r.data as T[];
}

/** 更新 —— 检查 result.updated，不要以为 resolve 就等于成功 */
export async function update(coll: string, id: string, data: Partial<Doc>) {
  const r = await getDb().collection(coll).doc(id).update({ ...data, updatedAt: new Date() });
  return r;
}

/** 删除 */
export async function remove(coll: string, id: string) {
  return getDb().collection(coll).doc(id).remove();
}

/** 实时监听（watch）—— 数据变更自动推送 */
export function watch<T>(coll: string, where: Record<string, unknown>, cb: (docs: T[]) => void) {
  return getDb().collection(coll).where(where).watch({
    onChange: (snap: { docs: T[] }) => cb(snap.docs),
    onError: (err: Error) => console.error('[cloudbase watch]', err),
  });
}

// ===================== 云存储 =====================
// 两套 API，取决于你的环境类型，用错会报 STORAGE_NOT_EXIST：
//   ① 传统 NoSQL 环境 → app.uploadFile({ cloudPath, filePath })
//   ② PG / pgstore 环境 → app.storage.from(bucket).upload(key, file)
// 先确认环境类型（控制台或 envQuery），再启用对应分支。

/** ① NoSQL 环境：上传并换取可访问 URL */
export async function uploadNoSql(filePath: File, cloudPath: string) {
  const app = getApp();
  const r = await app.uploadFile({ cloudPath, filePath });
  const fileID = r.fileID;
  const t = await app.getTempFileURL({ fileList: [{ fileID }] });
  return { fileID, url: t.fileList[0].tempFileURL };
}

/** ② PG 环境：上传（bucket 需先在控制台创建） */
export async function uploadPg(bucket: string, key: string, file: File) {
  const app = getApp() as unknown as {
    storage: { from: (b: string) => {
      upload: (k: string, f: File) => Promise<unknown>;
      getPublicUrl: (k: string) => Promise<{ data: { publicUrl: string } }>;
    } }
  };
  await app.storage.from(bucket).upload(key, file);
  const u = await app.storage.from(bucket).getPublicUrl(key);
  return u.data.publicUrl;
}

// ===================== 错误处理 =====================
// 数据库错误必须转成可读的应用错误，不要静默吞掉
export async function safeQuery<T>(coll: string, where: Record<string, unknown>): Promise<T[]> {
  try {
    return await query<T>(coll, where);
  } catch (e) {
    const err = e as { message?: string; code?: string };
    console.error('[cloudbase] query failed:', err.code, err.message);
    throw new Error('数据读取失败，请稍后重试');
  }
}
