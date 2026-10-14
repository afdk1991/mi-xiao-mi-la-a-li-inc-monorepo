import { reactive, computed } from 'vue';
import { load, save } from '../utils/storage';

export interface UserProfile {
  isLoggedIn: boolean;
  phone: string;
  nick: string;
  avatarColor: string;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  region: string;   // 省市区
  detail: string;
  isDefault: boolean;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  color: string;
  spec: string;
  count: number;
  /** 商品缩略图 emoji，下单时从购物车行带入（历史订单无此字段，渲染时走兜底） */
  emoji?: string;
}

export type OrderStatus = 'pending_pay' | 'paid' | 'shipped' | 'done' | 'refund';

export interface Order {
  id: string;
  items: OrderItem[];
  totalPrice: number;
  address: Address | null;
  status: OrderStatus;
  createdAt: number;
}

export interface Coupon {
  id: string;
  title: string;
  amount: number;      // 满减面额
  threshold: number;   // 使用门槛
  expire: string;
  received: boolean;
}

const USER_KEY = 'appsp_user';
const ADDR_KEY = 'appsp_addresses';
const ORDER_KEY = 'appsp_orders';
const COUPON_KEY = 'appsp_coupons';

const state = reactive({
  /** 下单流程里临时选中的地址 id（不持久化，仅单次选择会话有效） */
  pendingAddressId: '',
  user: load<UserProfile>(USER_KEY, {
    isLoggedIn: false,
    phone: '',
    nick: '未登录',
    avatarColor: '#FF8A65',
  }),
  addresses: load<Address[]>(ADDR_KEY, [] as Address[]),
  orders: load<Order[]>(ORDER_KEY, [] as Order[]),
  coupons: load<Coupon[]>(COUPON_KEY, [
    { id: 'c1', title: '新人立减券', amount: 10, threshold: 59, expire: '2026-12-31', received: false },
    { id: 'c2', title: '满99减20', amount: 20, threshold: 99, expire: '2026-11-30', received: false },
    { id: 'c3', title: '包邮券', amount: 5, threshold: 39, expire: '2026-10-31', received: false },
  ] as Coupon[]),
});

function persistUser() { save(USER_KEY, state.user); }
function persistAddr() { save(ADDR_KEY, state.addresses); }
function persistOrder() { save(ORDER_KEY, state.orders); }
function persistCoupon() { save(COUPON_KEY, state.coupons); }

/** 订单号：'OD' + Date.now() 在同一毫秒内连下两单会撞号，导致 v-for key 重复、支付/删除联动错乱 */
let orderSeq = 0;
function nextOrderId(): string {
  orderSeq = (orderSeq + 1) % 100000;
  return `OD${Date.now()}${orderSeq.toString(36)}`;
}

/** 保证地址列表中至少有一个默认地址，避免出现「无默认地址」的悬空状态 */
function ensureDefaultAddress() {
  if (state.addresses.length === 0) return;
  if (!state.addresses.some((a) => a.isDefault)) {
    state.addresses[0].isDefault = true;
  }
}

export const userStore = {
  state,

  defaultAddress: computed<Address | null>(() => {
    return state.addresses.find((a) => a.isDefault) || state.addresses[0] || null;
  }),

  /** 下单页当前应展示的地址：优先本次选择的，否则回落到默认地址 */
  pendingAddress: computed<Address | null>(() => {
    const id = state.pendingAddressId;
    if (!id) return null;
    return state.addresses.find((a) => a.id === id) || null;
  }),

  setPendingAddress(id: string) {
    state.pendingAddressId = id;
  },
  clearPendingAddress() {
    state.pendingAddressId = '';
  },

  orderCountByStatus(status: OrderStatus) {
    return state.orders.filter((o) => o.status === status).length;
  },

  /** 手机号一键登录（本地模拟） */
  login(phone: string) {
    state.user.isLoggedIn = true;
    state.user.phone = phone;
    state.user.nick = '用户' + phone.slice(-4);
    state.user.avatarColor = '#FF8A65';
    persistUser();
  },

  logout() {
    state.user.isLoggedIn = false;
    state.user.phone = '';
    state.user.nick = '未登录';
    persistUser();
  },

  // ---------- 地址 ----------
  saveAddress(addr: Address) {
    const idx = state.addresses.findIndex((a) => a.id === addr.id);
    if (addr.isDefault) state.addresses.forEach((a) => (a.isDefault = false));
    if (idx >= 0) state.addresses[idx] = addr;
    else state.addresses.push(addr);
    ensureDefaultAddress();
    persistAddr();
  },
  removeAddress(id: string) {
    state.addresses = state.addresses.filter((a) => a.id !== id);
    if (state.pendingAddressId === id) state.pendingAddressId = '';
    ensureDefaultAddress();
    persistAddr();
  },
  setDefaultAddress(id: string) {
    state.addresses.forEach((a) => (a.isDefault = a.id === id));
    persistAddr();
  },

  // ---------- 订单 ----------
  createOrder(items: OrderItem[], totalPrice: number, address: Address | null): Order {
    const order: Order = {
      id: nextOrderId(),
      // 商品行深拷贝：购物车行后续被删除/改数量时，历史订单不应跟着变
      items: items.map((i) => ({ ...i })),
      totalPrice,
      // 地址深拷贝：若直接存 state.addresses 里的对象引用，用户日后编辑或删除该地址时，
      // 历史订单里的收货信息会连带变化（甚至指向已删除的地址）
      address: address ? { ...address } : null,
      status: 'pending_pay',
      createdAt: Date.now(),
    };
    state.orders.unshift(order);
    persistOrder();
    return order;
  },
  updateOrderStatus(id: string, status: OrderStatus) {
    const o = state.orders.find((x) => x.id === id);
    if (o) { o.status = status; persistOrder(); }
  },
  /** 删除订单（含持久化，避免重启后订单复活） */
  removeOrder(id: string) {
    state.orders = state.orders.filter((o) => o.id !== id);
    persistOrder();
  },

  // ---------- 优惠券 ----------
  receiveCoupon(id: string) {
    const c = state.coupons.find((x) => x.id === id);
    if (c) { c.received = true; persistCoupon(); }
  },
};