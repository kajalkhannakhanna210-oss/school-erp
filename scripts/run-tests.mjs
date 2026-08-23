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

// Compile the full project using tsconfig so path aliases like '@/lib/...' resolve correctly
const compile = spawnSync(
  process.execPath,
  [
    tsc,
    "--project",
    resolve(projectRoot, "tsconfig.json"),
    "--outDir",
    outDir,
  ],
  { cwd: projectRoot, stdio: "inherit" }
);

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const node = process.execPath;
const testFiles = [
  resolve(outDir, "tests", "public-forms-core.test.js"),
  resolve(outDir, "tests", "super-admin-session.test.js"),
  resolve(outDir, "tests", "documents-security.test.js"),
  resolve(outDir, "tests", "leaving-students.test.js"),
  resolve(outDir, "tests", "enquiries.test.js"),
];
const run = spawnSync(node, ["--test", ...testFiles], { cwd: projectRoot, stdio: "inherit" });

process.exit(run.status ?? 1);
