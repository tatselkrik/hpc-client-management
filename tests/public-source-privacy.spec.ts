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

const privateMarkers = [
  ["Heart", "iculate"].join(""),
  ["Doc", " Don"].join(""),
  ["ksbn", "rmvityislrzymllv"].join(""),
  ["uole", "qgiazpbechgzptza"].join(""),
  ["0963", " 238 9815"].join(""),
  ["034", "-445-1248"].join(""),
  ["Puer", " Sanctus"].join(""),
  ["Doña", " Juliana"].join(""),
  ["clinic", ".bcd@gmail.com"].join(""),
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

test("public source contains no clinic identity or live project markers", async () => {
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
  const formerBrand = privateMarkers[0].toLowerCase();
  expect(files).not.toContain(`public/${formerBrand}-icon.png`);
  expect(files).not.toContain(`public/${formerBrand}-logo.png`);
  expect(files.some((path) => path.startsWith("docs/mockups/"))).toBe(false);
  expect(files.some((path) => path.startsWith("docs/screenshots/"))).toBe(false);
  expect(files.some((path) => path.startsWith("private-backups/"))).toBe(false);
});
