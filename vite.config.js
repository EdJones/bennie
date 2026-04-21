import { defineConfig } from "vite-plus";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  plugins: [vue()],
  server: {
    proxy: {
      "/api/cemd": {
        target: "https://api.cemd.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cemd/, "/districts/"),
      },
    },
  },
});
