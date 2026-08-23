import { expect, test } from "@playwright/test";

test.describe("appointment calendar workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/calendar-preview.html");
  });

  test("shows the week schedule and first-timer intake handoff", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Appointment Calendar" })).toBeVisible();
    await expect(page.getByText("Ana Dela Cruz", { exact: true })).toBeVisible();
    await expect(page.getByText("Miguel Flores", { exact: true })).toBeVisible();
    await expect(page.getByText("First-timer", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Begin Intake" })).toBeVisible();
    await expect(page.getByText("Philippine time", { exact: true })).toBeVisible();
  });

  test("shows a daily status board with explicit actions and a timestamp timeline", async ({ page }) => {
    await page.getByRole("button", { name: "Status board" }).click();
    await page.getByRole("button", { name: "Previous date range" }).click();

    const arrivedColumn = page.locator(".calendar-board-column.status-arrived");
    await expect(arrivedColumn.getByText("Miguel Flores", { exact: true })).toBeVisible();
    await expect(arrivedColumn.getByRole("button", { name: "Begin Intake" })).toBeVisible();
    await arrivedColumn.getByRole("button", { name: "View timeline" }).click();

    const historyDialog = page.getByRole("dialog", { name: "Miguel Flores" });
    await expect(historyDialog.getByText("Arrived", { exact: true })).toBeVisible();
    await expect(historyDialog.getByText("Clinic Staff", { exact: true }).last()).toBeVisible();
  });

  test("opens a staff booking dialog without creating a client record", async ({ page }) => {
    await page.getByRole("button", { name: "Book appointment" }).click();
    const dialog = page.getByRole("dialog", { name: "Book appointment" });

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "Existing client" })).toBeChecked();
    await expect(dialog.getByRole("searchbox", { name: "Search active clients" })).toBeVisible();
    await expect(dialog.locator(".calendar-client-results").getByRole("option")).toHaveCount(12);
    await expect(dialog.getByText(/first 12 of 500 matches/i)).toBeVisible();
    await dialog.getByRole("radio", { name: "New / first-timer" }).check();
    await expect(dialog.getByText(/creates only a provisional appointment/i)).toBeVisible();
    await expect(dialog.getByPlaceholder("Name used for scheduling")).toBeVisible();
    await expect(
      dialog.getByPlaceholder(/do not enter clinical notes or diagnoses/i)
    ).toBeVisible();
  });

  test("keeps booking errors in the modal and confirms success after it closes", async ({ page }) => {
    await page.getByRole("button", { name: "Book appointment" }).click();
    const dialog = page.getByRole("dialog", { name: "Book appointment" });

    await dialog.getByRole("button", { name: "Book appointment" }).click();
    await expect(dialog.getByRole("status")).toContainText("Choose an existing client");
    await expect(page.locator(".calendar-feedback-toast")).toHaveCount(0);

    await dialog.getByRole("searchbox", { name: "Search active clients" }).fill("Lea Villanueva");
    await dialog.getByRole("option", { name: /Lea Villanueva/ }).click();
    await dialog.getByRole("button", { name: "Book appointment" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".calendar-feedback-toast")).toContainText("Appointment saved.");
  });

  test("uses a recoverable appointment-specific removal confirmation", async ({ page }) => {
    const appointmentCard = page.locator(".calendar-appointment-card").filter({ hasText: "Ana Dela Cruz" });
    await appointmentCard.getByRole("button", { name: "Remove" }).click();

    const dialog = page.getByRole("dialog", { name: "Remove appointment?" });
    await expect(dialog.getByText("Ana Dela Cruz", { exact: true })).toBeVisible();
    await expect(dialog.getByText(/recoverable record and audit history are kept/i)).toBeVisible();
    await dialog.getByRole("button", { name: "Remove appointment" }).click();
    await expect(dialog.getByRole("status")).toContainText("Enter a reason");

    await dialog.getByPlaceholder(/why should this appointment be removed/i).fill("Duplicate test appointment");
    await dialog.getByRole("button", { name: "Remove appointment" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".calendar-feedback-toast")).toContainText(
      "Appointment removed from the calendar."
    );
  });

  test("exposes clinic hours and service lengths only in clinic setup", async ({ page }) => {
    await page.getByRole("button", { name: "Clinic setup" }).click();
    await expect(page.getByRole("heading", { name: "Clinic hours" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Services and appointment lengths" })
    ).toBeVisible();
    await expect(page.getByLabel("Monday opening time")).toHaveValue("08:00");
    await expect(page.getByLabel("Duration in minutes").first()).toHaveValue("60");
  });

  test("Admin clinician sees dated personal and team availability", async ({ page }) => {
    await page.getByRole("button", { name: "My availability" }).click();
    await expect(page.getByRole("heading", { name: "My availability" })).toBeVisible();
    await expect(page.getByText("Clinic meeting", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /set time/i }).first()).toBeVisible();

    await page.getByRole("button", { name: "Team availability" }).click();
    await expect(page.getByRole("heading", { name: "Team availability" })).toBeVisible();
    await expect(page.getByLabel("Clinician")).toBeVisible();
    await page.getByRole("button", { name: /Counselor Paolo Reyes.*09:00–12:00.*Open availability details/i }).click();
    await expect(page.getByRole("dialog", { name: /Friday, August 28, 2026/i })).toBeVisible();
    await expect(page.getByText("Morning coverage", { exact: true })).toBeVisible();
  });

  test("disallows a dated block that conflicts with available or unavailable time", async ({ page }) => {
    await page.getByRole("button", { name: "My availability" }).click();
    await page.getByRole("button", { name: "Wed Aug 26 Set time" }).click();

    await expect(page.getByText(/overlaps an existing available or unavailable block/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Add dated block" })).toBeDisabled();
  });

  test("Staff receives Schedule and Team availability but not clinician controls", async ({ page }) => {
    await page.goto("/tests/calendar-preview.html?role=staff");

    await expect(page.getByRole("button", { name: "Schedule" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Team availability" })).toBeVisible();
    await expect(page.getByRole("button", { name: "My availability" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clinic setup" })).toHaveCount(0);
  });

  test("Psychologist receives Schedule and dated My availability", async ({ page }) => {
    await page.goto("/tests/calendar-preview.html?role=psychologist");

    await expect(page.getByRole("button", { name: "Schedule" })).toBeVisible();
    await expect(page.getByRole("button", { name: "My availability" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Team availability" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clinic setup" })).toHaveCount(0);
  });
});
