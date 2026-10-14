import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [uni()],
  // tsconfig.json 已声明 "@/*" -> "src/*"，这里补上对应的解析规则；
  // 否则只有类型检查认这个别名，实际构建会报「无法解析 @/...」
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    rollupOptions: {
      output: {
        format: "iife",
      },
    },
  },
});
