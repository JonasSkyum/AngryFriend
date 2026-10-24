import { defineConfig } from "vite";

export default defineConfig({
  // Relativ base virker både på GitHub Pages (/AngryFriend/) og i Capacitor-appen
  base: "./",
  server: { port: 5173 },
  build: {
    target: "es2020",
    // Små assets (SVG-ojisan, font) inlines så første load er én request færre
    assetsInlineLimit: 8192,
    cssCodeSplit: false,
  },
});
