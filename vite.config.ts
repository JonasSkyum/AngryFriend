import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/AngryFriend/",
  server: { port: 5173 },
  build: {
    target: "es2020",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
