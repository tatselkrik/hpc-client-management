import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const root = process.cwd();
const execFileAsync = promisify(execFile);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ps1",
  ".rs",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

// Exact deployment markers are supplied only by a private local audit.
const privateMarkers: string[] = JSON.parse(process.env.HPC_PRIVATE_AUDIT_MARKERS ?? "[]");
const publicValuePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /AKIA[A-Z0-9]{16}/,
  /eyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}/,
  /https?:\/\/[a-z0-9]{20}\.supabase\.co\b/i,
];

async function collectPublicFiles(): Promise<string[]> {
  const { stdout } = await execFileAsync(
    "git",
    [
      "-c",
      `safe.directory=${root.replaceAll("\\", "/")}`,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
    ],
    { cwd: root, encoding: "utf8" }
  );
  return stdout
    .split("\0")
    .filter(Boolean)
    .filter((path) => existsSync(resolve(root, path)));
}

test("public source excludes credentials and live deployment URLs", async () => {
  const files = await collectPublicFiles();
  const findings: string[] = [];

  for (const pathFromRoot of files) {
    for (const marker of privateMarkers) {
      if (pathFromRoot.toLowerCase().includes(marker.toLowerCase())) {
        findings.push(`${pathFromRoot}: filename contains a private marker`);
      }
    }

    if (!textExtensions.has(extname(pathFromRoot).toLowerCase())) continue;
    const content = await readFile(resolve(root, pathFromRoot), "utf8");
    if (publicValuePatterns.some((pattern) => pattern.test(content))) {
      findings.push(`${pathFromRoot}: content contains a credential or live deployment URL`);
    }
    for (const marker of privateMarkers) {
      if (content.toLowerCase().includes(marker.toLowerCase())) {
        findings.push(`${pathFromRoot}: content contains a private marker`);
      }
    }
  }

  expect(findings).toEqual([]);
});

test("public source excludes private operational artifacts", async () => {
  const files = await collectPublicFiles();

  expect(files).not.toContain("AGENTS.md");
  expect(files).not.toContain("docs/staging-security-verification.md");
  expect(files.filter((path) => /^public\/.*-(icon|logo)\.(png|jpe?g)$/i.test(path))).toEqual([]);
  expect(files.some((path) => path.startsWith("docs/mockups/"))).toBe(false);
  expect(files.some((path) => path.startsWith("docs/screenshots/"))).toBe(false);
  expect(files.some((path) => path.startsWith("private-backups/"))).toBe(false);
});
