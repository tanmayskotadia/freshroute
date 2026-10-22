import { build } from "esbuild";
import { mkdirSync } from "node:fs";
mkdirSync("build/api", { recursive: true });
await build({
  entryPoints: [
    "server/copilot.ts",
    "server/api.ts",
    "server/probe.ts",
    "server/importWorker.ts",
    "server/analysisWorker.ts",
    "server/outboxBridge.ts",
    "server/postDecisionWorker.ts",
  ],
  outdir: "build/api",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: false,
  minify: true,
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
