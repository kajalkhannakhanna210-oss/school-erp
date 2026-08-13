import { rmSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptsDir, "..");
const outDir = resolve(projectRoot, ".test-dist");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const tsc = resolve(projectRoot, "node_modules", "typescript", "bin", "tsc");

const compile = spawnSync(
  process.execPath,
  [
    tsc,
    "--outDir",
    outDir,
    "--rootDir",
    projectRoot,
    "--module",
    "commonjs",
    "--moduleResolution",
    "node",
    "--target",
    "es2020",
    "--esModuleInterop",
    "--skipLibCheck",
    "tests/public-forms-core.test.ts",
    "lib/security/public-forms-core.ts",
  ],
  { cwd: projectRoot, stdio: "inherit" }
);

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const node = process.execPath;
const testFile = resolve(outDir, "tests", "public-forms-core.test.js");
const run = spawnSync(node, ["--test", testFile], { cwd: projectRoot, stdio: "inherit" });

process.exit(run.status ?? 1);
