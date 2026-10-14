import { reactive } from 'vue';
import { load, save } from '../utils/storage';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

const KEY = 'appsp_todos';
const state = reactive({ list: load<Todo[]>(KEY, [] as Todo[]) });

function persist() { save(KEY, state.list); }

/** 生成唯一 id：Date.now() 在同一毫秒内连续添加会撞号，导致 v-for key 重复、勾选联动错乱 */
let seq = 0;
function nextId(): string {
  seq = (seq + 1) % 100000;
  return `${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const todoStore = {
  state,
  add(text: string) {
    const t = text.trim();
    if (!t) return false;
    state.list.unshift({ id: nextId(), text: t, done: false, createdAt: Date.now() });
    persist();
    return true;
  },
  toggle(id: string) {
    const it = state.list.find((x) => x.id === id);
    if (it) { it.done = !it.done; persist(); }
  },
  remove(id: string) {
    state.list = state.list.filter((x) => x.id !== id);
    persist();
  },
  clearDone() {
    state.list = state.list.filter((x) => !x.done);
    persist();
  },
};
