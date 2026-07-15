import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";
const usePolling = process.env.CHOKIDAR_USEPOLLING === "true";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: (source: string, filename: string) => {
          const normalized = filename.replaceAll("\\", "/");
          if (normalized.endsWith("/src/styles/index.scss")) return source;
          return `@use "@/styles/variables" as * with ($emit-css-vars: false);\n@use "@/styles/mixins" as *;\n${source}`;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    watch: usePolling
      ? {
          usePolling: true,
          interval: 100,
        }
      : undefined,
    proxy: {
      "/market": apiProxyTarget,
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
