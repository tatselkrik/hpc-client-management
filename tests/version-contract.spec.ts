import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const readProjectFile = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("all application version sources stay synchronized", async () => {
  const packageJson = JSON.parse(await readProjectFile("package.json")) as { version: string };
  const version = packageJson.version;
  const cargoManifest = await readProjectFile("src-tauri/Cargo.toml");
  const tauriConfig = await readProjectFile("src-tauri/tauri.conf.json");
  const sharedMetadata = await readProjectFile("src/appShared.ts");
  const exampleEnvironment = await readProjectFile("env.example");
  const productionBuild = await readProjectFile("scripts/build-production.mjs");

  expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(cargoManifest).toContain(`version = "${version}"`);
  expect(tauriConfig).toContain(`"version": "${version}"`);
  expect(sharedMetadata).toContain(`VITE_APP_VERSION ?? "${version}"`);
  expect(exampleEnvironment).toContain(`VITE_APP_VERSION=${version}`);
  expect(productionBuild).toContain("VITE_APP_VERSION: packageJson.version");
});

test("production builds are locked to the stable production project", async () => {
  const packageJson = JSON.parse(await readProjectFile("package.json")) as {
    scripts: Record<string, string>;
  };
  const productionBuild = await readProjectFile("scripts/build-production.mjs");

  expect(packageJson.scripts["tauri:build:production"]).toBe(
    "node scripts/build-production.mjs"
  );
  expect(productionBuild).toContain('"YOUR_PROJECT_REF"');
  expect(productionBuild).toContain('candidate.type === "publishable"');
  expect(productionBuild).toContain('VITE_APP_CHANNEL: "stable"');
  expect(productionBuild).toContain('VITE_ENABLE_MOBILE_UPLOAD: "false"');
  expect(productionBuild).toContain('const STAGING_PROJECT_REF = "YOUR_PROJECT_REF"');
  expect(productionBuild).toContain("builtText.includes(STAGING_PROJECT_REF)");
});

test("staging builds are signed and locked away from production", async () => {
  const packageJson = JSON.parse(await readProjectFile("package.json")) as {
    scripts: Record<string, string>;
  };
  const stagingBuild = await readProjectFile("scripts/build-staging.mjs");
  const signingHelper = await readProjectFile("scripts/updater-signing.mjs");

  expect(packageJson.scripts["tauri:build:staging"]).toBe(
    "node scripts/build-staging.mjs"
  );
  expect(stagingBuild).toContain('"YOUR_PROJECT_REF"');
  expect(stagingBuild).toContain('VITE_APP_CHANNEL: "staging"');
  expect(stagingBuild).toContain("builtText.includes(PRODUCTION_PROJECT_REF)");
  expect(signingHelper).toContain("TAURI_SIGNING_PRIVATE_KEY");
  expect(signingHelper).toContain("hpc-updater-password.dpapi");
});
