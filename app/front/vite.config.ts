// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Plugin customizado APENAS para servir o favicon (não interfere nos demais)
function faviconPlugin() {
  return {
    name: "favicon",
    configureServer(server: any) {
      server.middlewares.use("/favicon.ico", (_req: any, res: any) => {
        res.writeHead(200, { "Content-Type": "image/svg+xml" });
        res.end(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#4f46e5"/><stop offset="100%" style="stop-color:#7c3aed"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#g)"/><text x="50" y="68" font-family="Arial" font-size="40" font-weight="bold" fill="white" text-anchor="middle">PSA</text></svg>`
        );
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [faviconPlugin()],   // 👈 adicionado aqui, sem mexer nos plugins existentes
  },
});