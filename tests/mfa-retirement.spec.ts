import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { hasAuthenticatedSession, requireFreshPasswordSession } from "../supabase/functions/_shared/security";
import { fetchSupabasePages } from "../src/lib/supabasePagination";

const token = (claims: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
const baseClaims = { sub: "test-user", role: "authenticated", aal: "aal1" };

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/rpc/hpc_authentication_policy", route =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify("password") }));
});

for (const mode of ["legacy", "verified", "unenrolled"]) {
  test(`transition retains legacy backend safeguards: ${mode}`, async ({ page }) => {
    await page.route("**/rest/v1/rpc/hpc_authentication_policy", route => route.fulfill({
      status:404, contentType:"application/json", body:JSON.stringify({code:"PGRST202"}),
    }));
    await page.goto(`/tests/mfa-policy.html?mode=${mode}`);
    await page.getByRole("button", {name:"Exercise sign-in"}).click();
    const report = page.getByTestId("auth-result");
    if (mode === "legacy") {
      await expect(report).toContainText("setShowMfaChallengeScreen:true");
      await expect(report).not.toContainText("loadClients");
      await page.getByRole("button", {name:"Verify existing factor"}).click();
      await expect(report).toContainText("verified-existing-factor");
      await expect(report).toContainText("loadClients");
    } else if (mode === "verified") {
      await expect(report).toContainText("loadClients");
    } else {
      await expect(page.getByTestId("enrollment-required")).toHaveText("true");
      await expect(report).not.toContainText("loadClients");
    }
    await expect(page.getByRole("button", { name: /Add Authenticator|Enable MFA/ })).toHaveCount(0);
  });
}

test("policy failure does not silently disable legacy MFA", async ({ page }) => {
  await page.route("**/rest/v1/rpc/hpc_authentication_policy", route => route.fulfill({
    status:503, contentType:"application/json", body:JSON.stringify({message:"Unavailable"}),
  }));
  await page.goto("/tests/mfa-policy.html?mode=legacy");
  await page.getByRole("button", {name:"Exercise sign-in"}).click();
  await expect(page.getByTestId("auth-result")).not.toContainText("loadClients");
  await expect(page.getByTestId("auth-result")).toContainText("setUserEmail");
});

test("the same installation switches from legacy verification to password-only after cutover", async ({ page }) => {
  let retired = false;
  await page.route("**/rest/v1/rpc/hpc_authentication_policy", route => route.fulfill({
    status: retired ? 200 : 404, contentType:"application/json",
    body: JSON.stringify(retired ? "password" : {code:"PGRST202"}),
  }));
  await page.goto("/tests/mfa-policy.html?mode=legacy");
  await page.getByRole("button", {name:"Exercise sign-in"}).click();
  await expect(page.getByTestId("auth-result")).toContainText("setShowMfaChallengeScreen:true");
  retired = true;
  await page.getByRole("button", {name:"Exercise sign-in"}).click();
  await expect(page.getByTestId("auth-result")).toContainText("loadClients");
  await expect(page.getByTestId("auth-result")).toContainText("setShowMfaChallengeScreen:false");
  await expect(page.getByText("MFA Code", {exact:true})).toHaveCount(0);
});

test("appointment analytics exclude future/removed bookings and paginate all results", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-11T04:00:00Z"));
  const requests: URL[] = [];
  const rows = Array.from({ length: 1003 }, () => ({
    status: "completed", client_stage_at_booking: "existing", appointment_mode: "in_person",
  }));
  await page.route("https://example.supabase.co/rest/v1/appointments*", async route => {
    const url = new URL(route.request().url());
    requests.push(url);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const correctFilters = url.searchParams.get("removed_at") === "is.null" &&
      url.searchParams.getAll("starts_at").some(value => value === "lt.2026-10-11T04:00:00.000Z") &&
      url.searchParams.getAll("starts_at").some(value => value === "gte.2026-09-11T04:00:00.000Z");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(
      correctFilters ? rows.slice(offset, offset + 250) : [...rows, rows[0], rows[0]].slice(offset, offset + 250)
    ) });
  });
  await page.goto("/tests/mfa-policy.html?analytics");
  const metric = page.locator("article").filter({ has: page.getByText("Appointments", { exact: true }) });
  await expect(metric.locator("strong")).toHaveText("1,003");
  expect(requests.length).toBeGreaterThan(4);
  expect(requests.every(url => url.searchParams.get("order") === "starts_at.asc,id.asc")).toBe(true);
});

test("validated password sessions work without MFA, but anonymous and missing claims fail", () => {
  expect(hasAuthenticatedSession(token(baseClaims))).toBe(true);
  expect(hasAuthenticatedSession(token({ ...baseClaims, aal: "aal2" }))).toBe(true);
  expect(hasAuthenticatedSession(token({ ...baseClaims, is_anonymous: true }))).toBe(false);
  expect(hasAuthenticatedSession(token({ ...baseClaims, role: "anon" }))).toBe(false);
  expect(hasAuthenticatedSession(token({ ...baseClaims, sub: undefined }))).toBe(false);
  expect(hasAuthenticatedSession("malformed")).toBe(false);
});

test("sensitive operations accept only a recent password AMR, not refreshed tokens or OTP", () => {
  const now = Math.floor(Date.now() / 1000);
  const session = (method: string, timestamp: number) => token({
    ...baseClaims, iat: now, amr: [{ method, timestamp }],
  });
  expect(requireFreshPasswordSession(session("password", now))).toBeNull();
  expect(requireFreshPasswordSession(session("password", now - 301))).not.toBeNull();
  expect(requireFreshPasswordSession(session("password", now + 120))).not.toBeNull();
  expect(requireFreshPasswordSession(session("totp", now))).not.toBeNull();
  expect(requireFreshPasswordSession(session("otp", now))).not.toBeNull();
  expect(requireFreshPasswordSession(token(baseClaims))).not.toBeNull();
});

test("pagination loads more than 1000 rows even when server cap is below requested size", async () => {
  const rows = Array.from({ length: 1031 }, (_, id) => ({ id }));
  const result = await fetchSupabasePages(() => ({
    range: async (from, to) => ({ data: rows.slice(from, Math.min(to + 1, from + 37)), error: null }),
  }));
  expect(result.error).toBeNull();
  expect(result.data).toEqual(rows);
});

test("pagination reports a later-page error instead of declaring partial results complete", async () => {
  const result = await fetchSupabasePages(() => ({
    range: async (from) => from === 0
      ? { data: [{ id: 1 }], error: null }
      : { data: null, error: { message: "Connection lost" } },
  }));
  expect(result.error?.message).toBe("Connection lost");
});

test("retirement migration keeps role guards and allows authenticated aal1 without deleting users", async () => {
  const sql = await readFile("supabase/migrations/20261011154347_retire_mfa_requirements.sql", "utf8");
  expect(sql).toContain("in ('aal1', 'aal2')");
  expect(sql).toContain("hpc_current_profile_has_role(array['admin', 'staff'])");
  expect(sql).toContain("is_anonymous");
  expect(sql).not.toContain("delete from auth");
  expect(sql).not.toContain("disable row level security");
});

for (const role of ["Admin", "Staff", "Psychologist / Counselor"]) {
  test(`${role} has no MFA prompts or enrollment, even with stale enrollment props`, async ({ page }) => {
    await page.goto(`/tests/mfa-policy.html?role=${encodeURIComponent(role)}`);
    await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Multi-factor authentication" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Authenticator|Enable MFA/ })).toHaveCount(0);
    await expect(page.getByText("MFA Code", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Exercise sign-in" }).click();
    await expect(page.getByTestId("auth-result")).toContainText("loadClients");
    await expect(page.getByTestId("auth-result")).toContainText("setShowMfaChallengeScreen:false");
    await expect(page.getByTestId("auth-result")).not.toContainText("MFA API called");
    if (role === "Admin") await page.screenshot({ path: test.info().outputPath("profile-without-mfa.png"), fullPage: true });
  });
}
