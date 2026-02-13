import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ mode }) => {
  const workspaceRoot = path.resolve(import.meta.dirname);
  const env = loadEnv(mode, workspaceRoot, "");
  const configuredBase = (env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");

  let proxyTarget: string | undefined;
  let proxyBasePath = "";
  if (configuredBase) {
    const parsed = new URL(configuredBase);
    proxyTarget = `${parsed.protocol}//${parsed.host}`;
    proxyBasePath = parsed.pathname === "/" ? "" : parsed.pathname;
  }

  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer(),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    envDir: workspaceRoot,
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      proxy: proxyTarget
        ? {
            "/api-proxy": {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (requestPath: string) =>
                `${proxyBasePath}${requestPath.replace(/^\/api-proxy/, "")}`,
            },
          }
        : undefined,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
