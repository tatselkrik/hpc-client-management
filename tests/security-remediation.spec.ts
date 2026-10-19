import { expect, test } from "@playwright/test";
import PptxGenJS from "pptxgenjs";
import { encryptBackup, decryptBackup } from "../src/lib/backupEncryption";
import { buildProtectedAnalyticsCsv } from "../src/lib/protectedAnalyticsCsv";
import { allowInteractiveSession, assertClinicalSession, getClinicalSessionGeneration, isClinicalSessionLocked, lockClinicalSession, observeClinicalIdentity, subscribeClinicalSession } from "../src/lib/clinicalSession";
import { readBoundedJson, RequestBodyTooLargeError } from "../supabase/functions/_shared/readBoundedJson";

test.describe.configure({ mode: "serial" });

test("local locking invalidates pending work synchronously and rejects silent unlocks", () => {
  allowInteractiveSession("fictional-user-a");
  const generation = getClinicalSessionGeneration(); let notifications = 0;
  const unsubscribe = subscribeClinicalSession(() => { notifications += 1; });
  lockClinicalSession();
  expect(isClinicalSessionLocked()).toBe(true);
  expect(notifications).toBe(1);
  expect(() => assertClinicalSession(generation)).toThrow(/session changed/);
  expect(observeClinicalIdentity("fictional-user-b")).toBe(false);
  expect(isClinicalSessionLocked()).toBe(true);
  lockClinicalSession(); expect(notifications).toBe(1);
  allowInteractiveSession("fictional-user-b"); expect(isClinicalSessionLocked()).toBe(false);
  const signedIn = getClinicalSessionGeneration();
  expect(observeClinicalIdentity("fictional-user-c")).toBe(false);
  expect(getClinicalSessionGeneration()).toBeGreaterThan(signedIn);
  unsubscribe();
});

test("backup encryption round-trips without plaintext and uses fresh random parameters", async () => {
  const value = JSON.stringify({ format_version: 2, tables: { clients: [{ client_name: "Fictional sample" }] } });
  const first = await encryptBackup(value, "fictional backup passphrase");
  const second = await encryptBackup(value, "fictional backup passphrase");
  expect(first).not.toContain("Fictional sample"); expect(first).not.toBe(second);
  expect(await decryptBackup(JSON.parse(first), "fictional backup passphrase")).toBe(value);
  await expect(decryptBackup(JSON.parse(first), "wrong passphrase")).rejects.toThrow(/incorrect|altered/);
  const changed = JSON.parse(first); changed.ciphertext = (changed.ciphertext[0] === "A" ? "B" : "A") + changed.ciphertext.slice(1);
  await expect(decryptBackup(changed, "fictional backup passphrase")).rejects.toThrow(/incorrect|altered/);
  changed.iterations = 9_999_999;
  await expect(decryptBackup(changed, "fictional backup passphrase")).rejects.toThrow(/Unsupported/);
  await expect(encryptBackup(value, "short")).rejects.toThrow(/12 characters/);
});

test("restore body limit uses actual bytes even without a trustworthy Content-Length", async () => {
  const value = JSON.stringify({ sample: "fictional data" });
  const make = (headers: Record<string, string> = {}) => new Request("https://example.invalid/restore", { method: "POST", headers, body: value });
  await expect(readBoundedJson(make(), 8)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  await expect(readBoundedJson(make({ "Content-Length": "1" }), 8)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  expect(await readBoundedJson(make(), new TextEncoder().encode(value).length)).toEqual({ sample: "fictional data" });
});

test("CSV output excludes row identities and suppresses small and complementary groups", () => {
  const headers = ["export_generated_at", "age", "occupation", "client_status", "age_band", "sex", "export_client_id"];
  const row = ["2026-10-18", 37, "Fictional identifying occupation", "Active", "30–39", "Female", "CLIENT-001"];
  const escape = (value: string | number) => JSON.stringify(value);
  const small = buildProtectedAnalyticsCsv(headers, [row, row], escape);
  expect(small).toContain("Suppressed"); expect(small).not.toContain("CLIENT-001");
  expect(small).not.toContain("Fictional identifying occupation"); expect(small).not.toContain("37");
  const five = buildProtectedAnalyticsCsv(headers, Array.from({ length: 5 }, () => row), escape);
  expect(five).toContain('"Active",5');
  const mixed = [...Array.from({ length: 6 }, () => row), ...Array.from({ length: 4 }, () => [...row.slice(0, 3), "Terminated", ...row.slice(4)])];
  const suppressed = buildProtectedAnalyticsCsv(headers, mixed, escape);
  const status = suppressed.split("\n").filter((line) => line.includes('"client_status"'));
  expect(status).toHaveLength(1); expect(status[0]).toContain("Suppressed"); expect(status[0]).not.toContain('"Active"');
});

test("PowerPoint generation remains functional with the patched image-size dependency", async () => {
  const deck = new PptxGenJS(); deck.layout = "LAYOUT_WIDE";
  deck.addSlide().addText("Fictional analytics verification", { x: 1, y: 1, w: 8, h: 1 });
  const bytes = await deck.write({ outputType: "arraybuffer" });
  const buffer = new Uint8Array(bytes as ArrayBuffer);
  expect(buffer.length).toBeGreaterThan(1000);
  expect([...buffer.subarray(0, 4)]).toEqual([80, 75, 3, 4]);
});
