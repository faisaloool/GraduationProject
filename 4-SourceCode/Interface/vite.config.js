import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Intercepts anything starting with /api
      "/api": {
        target: "https://racks-hits-linking-postings.trycloudflare.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
