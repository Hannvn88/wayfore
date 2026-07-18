import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The automations section is the only React part of an otherwise static
// HTML/CSS/JS site. We build it as a single self-contained ES-module bundle
// (React + the FileDrawer/AutomationSheet components inlined) with fixed,
// unhashed filenames, emitted into ../assets so index.html can mount it as a
// small island on GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../assets",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: "src/main.jsx",
      output: {
        entryFileNames: "automations.js",
        assetFileNames: "automations.[ext]",
        format: "es",
      },
    },
  },
});
