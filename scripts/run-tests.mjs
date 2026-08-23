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

// Compile using a test-specific tsconfig so path aliases resolve and emit JS
const compile = spawnSync(
  process.execPath,
  [
    tsc,
    "--project",
    resolve(projectRoot, "tsconfig.test.json")
  ],
  { cwd: projectRoot, stdio: "inherit" }
);

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

// Post-process compiled files to rewrite '@/lib/' imports into relative paths under .test-dist/lib
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
function rewriteDir(dir) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) rewriteDir(full);
    else if (st.isFile() && full.endsWith('.js')) {
      let content = readFileSync(full, 'utf8');
      // Only rewrite imports that start with "@/lib/" to "./"
      content = content.replace(/@\/lib\//g, './');
      writeFileSync(full, content, 'utf8');
    }
  }
}
rewriteDir(outDir);

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
