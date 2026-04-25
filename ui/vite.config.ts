import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Silence ECONNREFUSED noise during the brief startup window when vite is
// already proxying but the Express server hasn't bound to 4021 yet. The UI
// hooks already swallow these errors and the next poll succeeds — we just
// don't want them spamming the dev console.
const quietProxyError = (proxy: {
  on: (e: string, cb: (err: NodeJS.ErrnoException) => void) => void;
}): void => {
  proxy.on("error", (err) => {
    if (err.code === "ECONNREFUSED") return;
    // eslint-disable-next-line no-console
    console.warn(`[vite proxy] ${err.code ?? "error"}: ${err.message}`);
  });
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:4021",
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: quietProxyError,
      },
      "/events": {
        target: "http://localhost:4021",
        changeOrigin: false,
        configure: quietProxyError,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
