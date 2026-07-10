import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

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
        api: "modern-compiler",
        additionalData: (source: string, filename: string) => {
          const normalized = filename.replaceAll("\\", "/");
          if (normalized.endsWith("/src/styles/index.scss")) return source;
          return `@use "@/styles/variables" as * with ($emit-css-vars: false);\n@use "@/styles/mixins" as *;\n${source}`;
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/market": "http://localhost:4000",
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
