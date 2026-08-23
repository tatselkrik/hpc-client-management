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

  expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(cargoManifest).toContain(`version = "${version}"`);
  expect(tauriConfig.version).toBe(version);
  expect(sharedMetadata).toContain(`VITE_APP_VERSION ?? "${version}"`);
  expect(exampleEnvironment).toContain(`VITE_APP_VERSION=${version}`);
});
