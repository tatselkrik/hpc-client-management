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

const approvedScreenshots = [
  "docs/screenshots/about-v0.2.2.jpg",
  "docs/screenshots/analytics-v0.2.2.jpg",
  "docs/screenshots/care-team-v0.2.2.jpg",
  "docs/screenshots/case-conceptualization-v0.2.2.jpg",
  "docs/screenshots/clients-v0.2.2.jpg",
  "docs/screenshots/dashboard-v0.2.2.jpg",
  "docs/screenshots/login-v0.2.2.jpg",
  "docs/screenshots/profile-v0.2.2.jpg",
  "docs/screenshots/settings-v0.2.2.jpg",
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
  expect(
    files.filter((path) => path.startsWith("docs/screenshots/")).sort()
  ).toEqual(approvedScreenshots);
  expect(files.some((path) => path.startsWith("private-backups/"))).toBe(false);
});

test("calendar tour uses placeholders until redacted screenshots are approved", async () => {
  const files = await collectPublicFiles();
  const readme = await readFile(resolve(root, "README.md"), "utf8");
  const pendingCalendarScreenshots = [
    "docs/screenshots/calendar-week-v0.3.5.jpg",
    "docs/screenshots/calendar-status-board-v0.3.5.jpg",
    "docs/screenshots/calendar-availability-v0.3.5.jpg",
  ];

  for (const path of pendingCalendarScreenshots) {
    expect(readme).toContain(`**Screenshot placeholder:**`);
    expect(readme).toContain(path);
    expect(files).not.toContain(path);
  }
});
