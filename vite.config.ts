import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

const packagePath = (packageName: string) => `/node_modules/${packageName}/`;

const isPackage = (id: string, packageName: string) =>
  id.includes(packagePath(packageName));

const isPackagePrefix = (id: string, packagePrefix: string) =>
  id.includes(`/node_modules/${packagePrefix}`);

const analyticsPackages = [
  "recharts",
  "decimal.js-light",
  "eventemitter3",
  "react-is",
];

const presentationPackages = [
  "pptxgenjs",
  "jszip",
  "cfb",
  "fast-xml-parser",
  "fflate",
  "lie",
  "pako",
  "sax",
  "ssf",
  "uuid",
  "xml",
];

const supabasePackagePrefixes = [
  "@supabase/",
  "@gotrue/",
  "@postgrest/",
  "@realtime/",
  "@storage/",
];

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (
            isPackage(id, "react") ||
            isPackage(id, "react-dom") ||
            isPackage(id, "scheduler")
          ) {
            return "vendor-react";
          }

          if (supabasePackagePrefixes.some((packagePrefix) => isPackagePrefix(id, packagePrefix))) {
            return "vendor-supabase";
          }

          if (isPackagePrefix(id, "@tauri-apps/")) {
            return "vendor-tauri";
          }

          if (
            analyticsPackages.some((packageName) => isPackage(id, packageName)) ||
            isPackagePrefix(id, "d3-")
          ) {
            return "vendor-analytics";
          }

          if (presentationPackages.some((packageName) => isPackage(id, packageName))) {
            return "vendor-presentation";
          }

          return undefined;
        },
      },
    },
  },

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
