import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.BACKEND_API_KEY?.trim();

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: "https://move-it-be.vercel.app",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          ...(apiKey ? { headers: { "X-API-Key": apiKey } } : {}),
        },
      },
    },
  };
});
