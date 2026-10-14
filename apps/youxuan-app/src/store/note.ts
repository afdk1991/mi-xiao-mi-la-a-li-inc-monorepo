import { reactive } from 'vue';
import { load, save } from '../utils/storage';

export interface Note {
  id: string;
  content: string;
  updatedAt: number;
}

const KEY = 'appsp_notes';
const state = reactive({ list: load<Note[]>(KEY, [] as Note[]) });

function persist() { save(KEY, state.list); }

/** 唯一 id：Date.now() 同毫秒连加会撞号，导致 v-for key 重复 */
let seq = 0;
function nextId(): string {
  seq = (seq + 1) % 100000;
  return `${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const noteStore = {
  state,
  add(content: string) {
    const c = content.trim();
    if (!c) return;
    state.list.unshift({ id: nextId(), content: c, updatedAt: Date.now() });
    persist();
  },
  update(id: string, content: string) {
    const it = state.list.find((x) => x.id === id);
    if (it) { it.content = content; it.updatedAt = Date.now(); persist(); }
  },
  remove(id: string) {
    state.list = state.list.filter((x) => x.id !== id);
    persist();
  },
};
