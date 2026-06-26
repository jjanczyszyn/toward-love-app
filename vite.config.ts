import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from the GitHub Pages project path jjanczyszyn.github.io/toward-love-app/
export default defineConfig({
  base: "/toward-love-app/",
  plugins: [react()],
});
