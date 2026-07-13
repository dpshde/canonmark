/**
 * Prove mobile package resolves shipped @versemark/core the same way App.tsx does.
 * Spawns core vitest package-entry tests (real scoreRound / loadState).
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appTsx = path.resolve(__dirname, "../App.tsx");
const coreRoot = path.resolve(__dirname, "../../../packages/core");

if (!existsSync(appTsx)) {
  console.error("FAIL: App.tsx missing");
  process.exit(1);
}
const appSrc = readFileSync(appTsx, "utf8");
if (!appSrc.includes('from "@versemark/core"')) {
  console.error("FAIL: App.tsx must import from @versemark/core");
  process.exit(1);
}
for (const name of ["scoreRound", "emptyAppState", "BOOKS", "loadState"]) {
  if (!appSrc.includes(name)) {
    console.error(`FAIL: App.tsx must use ${name} from core`);
    process.exit(1);
  }
}

const r = spawnSync(
  "npx",
  ["vitest", "run", "tests/package-entry.test.ts"],
  { cwd: coreRoot, encoding: "utf8", shell: true }
);
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
if (r.status !== 0) {
  console.error("FAIL: core package-entry tests (shared import path)");
  process.exit(r.status ?? 1);
}
console.log("OK: mobile App.tsx imports @versemark/core; package-entry tests green");
