import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { compression } from "vite-plugin-compression2";

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    react(),
    compression({
      algorithms: ["gzip", "brotliCompress"],
      threshold: 10240,
      skipIfLargerOrEqual: true
    })
  ];

  if (mode === "analyze") {
    plugins.push(
      visualizer({
        filename: "reports/bundle-stats.html",
        template: "treemap",
        gzipSize: true,
        brotliSize: true,
        open: false
      }) as PluginOption
    );
  }

  return {
    base: "./",
    plugins,
    server: {
      port: 5173,
      allowedHosts: true
    }
  };
});
