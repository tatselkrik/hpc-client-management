import { expect, test } from "@playwright/test";

test.describe("authenticated role workflows", () => {
  test("Admin can administer the clinic and defaults new clients to Clinic Administrator", async ({ page }) => {
    await page.goto("/tests/role-workflows.html?role=admin");

    await expect(page.getByTestId("current-role")).toHaveText("Admin");
    await page.getByRole("button", { name: "Add Client" }).click();
    await expect(page.getByTestId("client-action-status")).toHaveText("Created for Clinic Administrator");

    const inviteHeading = page.getByRole("heading", { name: "Invite care team member" });
    const invitationPanel = inviteHeading.locator("xpath=ancestor::section[1]");
    await expect(inviteHeading).toBeVisible();
    const inviteRoleSelect = invitationPanel.getByLabel("Role");
    await expect(inviteRoleSelect.locator("option", { hasText: "Admin" })).toHaveCount(1);

    await expect(page.getByText("Backup and restore", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Restore this backup" })).toBeVisible();
    await expect(page.getByText("System Activity / Audit Log", { exact: true })).toBeVisible();
  });

  test("Staff assigns new clients to a clinical representative and cannot manage Admin", async ({ page }) => {
    await page.goto("/tests/role-workflows.html?role=staff");

    await expect(page.getByTestId("current-role")).toHaveText("Staff");
    await page.getByRole("button", { name: "Add Client" }).click();
    const assignmentDialog = page.getByRole("dialog", { name: "Assign New Client" });
    await expect(assignmentDialog).toBeVisible();
    await assignmentDialog.getByLabel("HPC Representative").selectOption("Clinic Administrator");
    await assignmentDialog.getByRole("button", { name: "Create Client" }).click();
    await expect(page.getByTestId("client-action-status")).toHaveText("Created for Clinic Administrator");

    const inviteHeading = page.getByRole("heading", { name: "Invite care team member" });
    await expect(inviteHeading).toBeVisible();
    const invitationPanel = inviteHeading.locator("xpath=ancestor::section[1]");
    await expect(invitationPanel.getByLabel("Role").locator("option", { hasText: "Admin" })).toHaveCount(0);

    const adminCard = page
      .getByRole("heading", { name: "Clinic Administrator", exact: true })
      .locator("xpath=ancestor::article[1]");
    await expect(adminCard).toBeVisible();
    await expect(adminCard.getByRole("combobox")).toHaveCount(0);
    await expect(adminCard.getByRole("button", { name: /deactivate/i })).toHaveCount(0);

    await expect(page.getByText("Backup and restore", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Restore this backup" })).toHaveCount(0);
    await expect(page.getByText("Only an Admin can perform a restore.")).toBeVisible();
    await expect(page.getByText("System Activity / Audit Log", { exact: true })).toHaveCount(0);
  });

  test("Psychologist sees assigned clients and only the permitted settings", async ({ page }) => {
    await page.goto("/tests/role-workflows.html?role=psychologist");

    await expect(page.getByTestId("current-role")).toHaveText("Psychologist / Counselor");
    await expect(page.getByText("Assigned Client", { exact: true })).toBeVisible();
    await expect(page.getByText("Clinic Client", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Add Client" }).click();
    await expect(page.getByTestId("client-action-status")).toHaveText(
      "Created for Staging Psych Test"
    );

    await expect(page.getByRole("heading", { name: "Invite care team member" })).toHaveCount(0);
    await expect(page.getByText("Clinic notice banner", { exact: true })).toBeVisible();
    await expect(page.getByText("Client categories", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Backup and restore", { exact: true })).toHaveCount(0);
    await expect(page.getByText("System Activity / Audit Log", { exact: true })).toHaveCount(0);
  });
});
