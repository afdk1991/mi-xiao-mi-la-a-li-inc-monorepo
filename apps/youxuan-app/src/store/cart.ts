import { reactive, computed } from 'vue';
import { load, save } from '../utils/storage';

export interface CartItem {
  id: string;        // 购物车行 id = productId + spec
  productId: string;
  title: string;
  price: number;
  color: string;
  spec: string;
  count: number;
  checked: boolean;
  /** 商品缩略图 emoji，从商品详情带入购物车（老数据无此字段，渲染时走兜底） */
  emoji?: string;
}

const KEY = 'appsp_cart';
const MAX_COUNT = 999;

interface CartState {
  items: CartItem[];
}

const state = reactive<CartState>({
  items: load<CartItem[]>(KEY, []),
});

function persist() {
  save(KEY, state.items);
}

/** 购物车行 id 规则：productId + '_' + spec */
export function lineIdOf(productId: string, spec: string): string {
  return `${productId}_${spec}`;
}

export const cartStore = {
  state,
  totalCount: computed(() => state.items.reduce((s, i) => s + i.count, 0)),
  checkedCount: computed(() => state.items.filter((i) => i.checked).reduce((s, i) => s + i.count, 0)),
  checkedPrice: computed(() =>
    state.items.filter((i) => i.checked).reduce((s, i) => s + i.price * i.count, 0),
  ),

  add(item: Omit<CartItem, 'id' | 'count' | 'checked'>, count = 1) {
    const lineId = lineIdOf(item.productId, item.spec);
    const exist = state.items.find((i) => i.id === lineId);
    if (exist) {
      exist.count = Math.min(MAX_COUNT, exist.count + count);
    } else {
      state.items.push({ ...item, id: lineId, count: Math.min(MAX_COUNT, count), checked: true });
    }
    persist();
  },

  /** 立即购买：只勾选指定行（会持久化，避免重启后勾选状态丢失） */
  setOnlyChecked(lineId: string) {
    let hit = false;
    state.items.forEach((i) => {
      i.checked = i.id === lineId;
      if (i.id === lineId) hit = true;
    });
    persist();
    return hit;
  },

  changeCount(id: string, delta: number) {
    const it = state.items.find((i) => i.id === id);
    if (!it) return;
    it.count += delta;
    if (it.count <= 0) {
      state.items = state.items.filter((i) => i.id !== id);
    } else if (it.count > MAX_COUNT) {
      it.count = MAX_COUNT;
    }
    persist();
  },

  setChecked(id: string, checked: boolean) {
    const it = state.items.find((i) => i.id === id);
    if (it) it.checked = checked;
    persist();
  },

  toggleAll(checked: boolean) {
    state.items.forEach((i) => (i.checked = checked));
    persist();
  },

  remove(id: string) {
    state.items = state.items.filter((i) => i.id !== id);
    persist();
  },

  clearChecked() {
    state.items = state.items.filter((i) => !i.checked);
    persist();
  },

  clear() {
    state.items = [];
    persist();
  },
};