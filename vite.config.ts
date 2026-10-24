import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  // Relativ base virker både på GitHub Pages (/AngryFriend/) og i Capacitor-appen
  base: "./",
  server: { port: 5173 },
  build: {
    target: "es2020",
    // Phaser er stor og ændrer sig sjældent - egen chunk giver bedre caching
    rollupOptions: {
      output: { manualChunks: { phaser: ["phaser"] } },
    },
    chunkSizeWarningLimit: 1600,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
