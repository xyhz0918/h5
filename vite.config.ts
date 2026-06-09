import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [react()];

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
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("react") || id.includes("react-dom")) return "vendor-react";
            if (id.includes("gsap")) return "vendor-animation";
            if (id.includes("three")) return "vendor-three";
            if (id.includes("html-to-image")) return "vendor-export";
            return "vendor";
          }
        }
      }
    },
    server: {
      port: 5173,
      allowedHosts: true
    }
  };
});
