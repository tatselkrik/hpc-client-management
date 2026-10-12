import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const readProjectFile = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("all application version sources stay synchronized", async () => {
  const packageJson = JSON.parse(await readProjectFile("package.json")) as { version: string };
  const version = packageJson.version;
  const cargoManifest = await readProjectFile("src-tauri/Cargo.toml");
  const tauriConfig = JSON.parse(
    (await readProjectFile("src-tauri/tauri.conf.json")).replace(/^\uFEFF/, "")
  ) as {
    version: string;
  };
  const sharedMetadata = await readProjectFile("src/appShared.ts");
  const exampleEnvironment = await readProjectFile("env.example");
  const releaseNotes = await readProjectFile("src/releaseNotes.ts");

  expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(cargoManifest).toContain(`version = "${version}"`);
  expect(tauriConfig.version).toBe(version);
  expect(sharedMetadata).toContain(`VITE_APP_VERSION ?? "${version}"`);
  expect(exampleEnvironment).toContain(`VITE_APP_VERSION=${version}`);
  expect(releaseNotes).toContain(`APP_RELEASE_NOTES_VERSION = "${version}"`);
  expect(releaseNotes).toContain("export const APP_RELEASE_NOTES = [");
});

test("current release documentation stays synchronized with the application", async () => {
  const { version } = JSON.parse(await readProjectFile("package.json")) as { version: string };
  const readme = await readProjectFile("README.md");
  const changelog = await readProjectFile("CHANGELOG.md");
  const securityPolicy = await readProjectFile("SECURITY.md");
  const guidePath = `docs/user-guide-${version}.md`;
  const guide = await readProjectFile(guidePath);

  expect(readme).toContain(`**Current version:** ${version}`);
  expect(readme).toContain(`](${guidePath})`);
  expect(readme).toContain("## Release log");
  expect(changelog).toContain(`## ${version} - `);
  expect(securityPolicy).toContain(`current public version, \`${version}\``);
  expect(guide).toContain(`# HPC Client Management ${version} User Guide`);
});
test("public builds use generic configuration and no deployment endpoint", async () => {
  const packageJson = JSON.parse(await readProjectFile("package.json")) as {
    scripts: Record<string, string>;
  };
  const tauriConfig = await readProjectFile("src-tauri/tauri.conf.json");
  const exampleEnvironment = await readProjectFile("env.example");

  expect(tauriConfig).toContain('"identifier": "com.example.hpcclientmanagement"');
  expect(tauriConfig).not.toContain('"updater"');
  expect(tauriConfig).not.toContain("functions/v1/app-updater");
  expect(exampleEnvironment).toContain("VITE_SUPABASE_URL=");
  expect(exampleEnvironment).toContain("VITE_SUPABASE_PUBLISHABLE_KEY=");
  expect(packageJson.scripts).not.toHaveProperty("tauri:build:production");
  expect(packageJson.scripts).not.toHaveProperty("tauri:build:staging");
  expect(packageJson.scripts).not.toHaveProperty("release:update:production");
  expect(packageJson.scripts).not.toHaveProperty("release:update:staging");
});
