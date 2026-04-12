import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
  },
  server: {
    proxy: {
      // Fallback HTTP API (same logic as Wails bridge)
      "/api": "http://localhost:8081",
      // Ollama — avoids CORS when pinging from the browser
      "/ollama": {
        target: "http://localhost:11434",
        rewrite: (path) => path.replace(/^\/ollama/, ""),
      },
    },
  },
});
