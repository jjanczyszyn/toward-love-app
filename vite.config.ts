import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served at the app.toward.love custom domain (root).
export default defineConfig({
  base: "/",
  plugins: [react()],
});
