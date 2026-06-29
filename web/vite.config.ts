import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5184,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8711",
        changeOrigin: true,
      },
      "/docs": {
        target: "http://127.0.0.1:8711",
        changeOrigin: true,
      },
      "/openapi.json": {
        target: "http://127.0.0.1:8711",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["highlight.js", "lowlight", "@tiptap/extension-code-block-lowlight"],
  },
});
