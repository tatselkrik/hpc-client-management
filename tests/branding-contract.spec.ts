import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("public branding stays generic and all display surfaces use the shared configuration", async () => {
  const config = await readFile("src/lib/branding.ts", "utf8");
  expect(config).toContain('|| "/hpc-logo.svg"');
  expect(config).toContain('|| "/hpc-icon.svg"');
  for (const path of ["src/features/auth/AuthScreens.tsx", "src/components/AppSidebar.tsx", "src/features/analytics/exportAnalyticsPresentation.ts"]) {
    const source = await readFile(path, "utf8");
    expect(source).toContain("CLINIC_LOGO_URL");
    expect(source).not.toContain('"/hpc-logo.svg"');
  }
});

test("embedded export artwork does not require native network permission", async () => {
  const source = await readFile("src/features/analytics/exportAnalyticsPresentation.ts", "utf8");
  expect(source).toContain('if (assetPath.startsWith("data:image/png;base64,")) return assetPath;');
});
