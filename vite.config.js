import { defineConfig } from "vite-plus";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  plugins: [vue()],
});
