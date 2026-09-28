import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: process.env.DEV_API_PROXY
    ? {
        proxy: {
          "/api": {
            target: process.env.DEV_API_PROXY,
            changeOrigin: true,
          },
        },
      }
    : undefined,
});
