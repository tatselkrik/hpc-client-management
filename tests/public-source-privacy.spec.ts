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

const approvedScreenshots = [
  "docs/screenshots/about-v0.3.5.jpg",
  "docs/screenshots/analytics-v0.3.5.jpg",
  "docs/screenshots/calendar-clinic-setup-v0.3.5.jpg",
  "docs/screenshots/calendar-my-availability-v0.3.5.jpg",
  "docs/screenshots/calendar-status-board-v0.3.5.jpg",
  "docs/screenshots/calendar-team-availability-v0.3.5.jpg",
  "docs/screenshots/calendar-v0.3.5.jpg",
  "docs/screenshots/care-team-v0.3.5.jpg",
  "docs/screenshots/clients-v0.3.5.jpg",
  "docs/screenshots/dashboard-v0.3.5.jpg",
  "docs/screenshots/login-v0.3.5.jpg",
  "docs/screenshots/profile-v0.3.5.jpg",
  "docs/screenshots/settings-v0.3.5.jpg",
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
  expect(
    files.filter((path) => path.startsWith("docs/screenshots/")).sort()
  ).toEqual(approvedScreenshots);
  expect(files.some((path) => path.startsWith("private-backups/"))).toBe(false);
});

test("application tour keeps approved screenshots ordered and collapsible", async () => {
  const files = await collectPublicFiles();
  const readme = await readFile(resolve(root, "README.md"), "utf8");
  const screenshotTour = [
    "docs/screenshots/login-v0.3.5.jpg",
    "docs/screenshots/dashboard-v0.3.5.jpg",
    "docs/screenshots/clients-v0.3.5.jpg",
    "docs/screenshots/calendar-v0.3.5.jpg",
    "docs/screenshots/calendar-status-board-v0.3.5.jpg",
    "docs/screenshots/calendar-my-availability-v0.3.5.jpg",
    "docs/screenshots/calendar-team-availability-v0.3.5.jpg",
    "docs/screenshots/calendar-clinic-setup-v0.3.5.jpg",
    "docs/screenshots/analytics-v0.3.5.jpg",
    "docs/screenshots/care-team-v0.3.5.jpg",
    "docs/screenshots/settings-v0.3.5.jpg",
    "docs/screenshots/about-v0.3.5.jpg",
    "docs/screenshots/profile-v0.3.5.jpg",
  ];

  let previousPosition = -1;
  for (const path of screenshotTour) {
    expect(files).toContain(path);
    const position = readme.indexOf(path);
    expect(position).toBeGreaterThan(previousPosition);
    expect(readme.lastIndexOf("<details>", position)).toBeGreaterThan(
      readme.lastIndexOf("</details>", position)
    );
    previousPosition = position;
  }
  expect(readme).not.toContain("**Screenshot placeholder:**");
});
