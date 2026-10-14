import { request } from './request';
import type { Post, Product, ToolItem } from './types';
import { mockTools } from '../mock/data';

/**
 * 后端（CloudBase PG REST）在查询成功时返回数组，出错时返回 { code, message, details } 这类对象。
 * 若不做校验直接 .map 会抛 TypeError，页面 catch 到的是类型错误而非网络错误，表现为白屏。
 * 这里统一收敛为「非数组即空列表」，由调用方的 error 分支负责提示。
 */
function asArray(data: unknown): Array<Record<string, unknown>> {
  return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
}

/** 安全取数字：后端字段缺失或类型异常时不产生 NaN，避免价格显示成 "¥NaN" */
function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** 安全取字符串：非字符串一律回落空串，避免模板里 .slice 报错 */
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

/** 商品：CloudBase PG REST */
export async function fetchProducts() {
  const res = await request<Array<Record<string, unknown>>>({
    url: '/products?select=id,title,price,original_price,sales,tag,color',
  });
  const list: Product[] = asArray(res.data).map((r) => ({
    id: str(r.id),
    title: str(r.title, '未命名商品'),
    price: num(r.price),
    originalPrice: r.original_price != null ? num(r.original_price, 0) : undefined,
    sales: num(r.sales),
    tag: str(r.tag) || undefined,
    color: str(r.color, '#EEEEEE'),
    emoji: str(r.emoji) || undefined,
  }));
  return { code: 0, message: 'ok', data: list };
}

/** 帖子：CloudBase PG REST，snake_case -> camelCase */
export async function fetchPosts() {
  const res = await request<Array<Record<string, unknown>>>({
    url: '/posts?select=id,author,avatar_color,content,image_color,likes,comments,time',
  });
  const list: Post[] = asArray(res.data).map((r) => ({
    id: str(r.id),
    author: str(r.author, '匿名'),
    avatarColor: str(r.avatar_color, '#CCCCCC'),
    content: str(r.content),
    imageColor: str(r.image_color, '#F0F0F0'),
    likes: num(r.likes),
    comments: num(r.comments),
    time: str(r.time),
  }));
  return { code: 0, message: 'ok', data: list };
}

/** 工具：纯前端配置，不请求后端 */
export function fetchTools(): Promise<{ code: number; message: string; data: ToolItem[] }> {
  return Promise.resolve({ code: 0, message: 'ok', data: mockTools });
}