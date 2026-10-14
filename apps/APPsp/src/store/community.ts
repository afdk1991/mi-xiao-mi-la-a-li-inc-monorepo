import { reactive } from 'vue';
import { load, save } from '../utils/storage';

const FAV_KEY = 'appsp_favorites';   // productId[]
const LIKE_KEY = 'appsp_liked_posts'; // postId[]
const COMMENT_KEY = 'appsp_comments'; // { [postId]: string[] }

const state = reactive({
  favorites: load<string[]>(FAV_KEY, [] as string[]),
  likedPosts: load<string[]>(LIKE_KEY, [] as string[]),
  comments: load<Record<string, string[]>>(COMMENT_KEY, {}),
});

export const communityStore = {
  state,

  isFav(productId: string) {
    return state.favorites.includes(productId);
  },
  toggleFav(productId: string) {
    const idx = state.favorites.indexOf(productId);
    if (idx >= 0) state.favorites.splice(idx, 1);
    else state.favorites.unshift(productId);
    save(FAV_KEY, state.favorites);
  },

  isLiked(postId: string) {
    return state.likedPosts.includes(postId);
  },
  toggleLike(postId: string) {
    const idx = state.likedPosts.indexOf(postId);
    if (idx >= 0) state.likedPosts.splice(idx, 1);
    else state.likedPosts.unshift(postId);
    save(LIKE_KEY, state.likedPosts);
  },

  commentsOf(postId: string): string[] {
    return state.comments[postId] || [];
  },
  addComment(postId: string, text: string) {
    const t = text.trim();
    if (!t) return;
    if (!state.comments[postId]) state.comments[postId] = [];
    state.comments[postId].unshift(t);
    save(COMMENT_KEY, state.comments);
  },
};
