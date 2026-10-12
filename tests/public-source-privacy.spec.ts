import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";
import JSZip from "jszip";

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
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /sb_secret_[A-Za-z0-9_-]{20,}/i,
  /gh[pousr]_[A-Za-z0-9]{30,}/i,
  /AKIA[A-Z0-9]{16}/i,
  /eyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}/i,
  /https?:\/\/[a-z0-9]{20}\.supabase\.co\b/i,
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

test("credential checks also apply to case-normalized Word XML", () => {
  expect(publicValuePatterns.every((pattern) => pattern.ignoreCase)).toBe(true);
});

test("historical Word XML follows public privacy checks", async () => {
  const gitOptions = ["-c", `safe.directory=${root.replaceAll("\\", "/")}`];
  const gitText = async (args: string[]) => {
    const { stdout } = await execFileAsync("git", [...gitOptions, ...args], {
      cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
    });
    return stdout;
  };
  const revisions = (await gitText(["rev-list", "HEAD", "--tags"]))
    .trim().split("\n");
  const inspected = new Set<string>();
  const findings: string[] = [];

  for (const revision of revisions) {
    const paths = (await gitText(["ls-tree", "-r", "--name-only", revision]))
      .trim().split("\n").filter((path) => path.endsWith(".docx"));
    for (const path of paths) {
      const object = (await gitText(["rev-parse", `${revision}:${path}`])).trim();
      if (inspected.has(object)) continue;
      inspected.add(object);
      const { stdout } = await execFileAsync("git", [...gitOptions, "cat-file", "blob", object], {
        cwd: root, encoding: "buffer", maxBuffer: 20 * 1024 * 1024,
      });
      const archive = await JSZip.loadAsync(stdout, { checkCRC32: true });
      for (const part of Object.values(archive.files)) {
        if (part.dir || !/\.(xml|rels)$/i.test(part.name)) continue;
        const content = (await part.async("string")).toLowerCase();
        if (publicValuePatterns.some((pattern) => pattern.test(content)) ||
            privateMarkers.some((marker) => content.includes(marker.toLowerCase()))) {
          findings.push(`${path}: ${part.name} contains a private marker`);
        }
      }
    }
  }
  expect(findings).toEqual([]);
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
