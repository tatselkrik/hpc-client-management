# HPC Client Management 0.2.2 User Guide

This guide covers the installed Windows application for Admin, Staff, and
Psychologist / Counselor accounts. The screens shown use redacted staging test
records.

## Important use rules

- Use only your own account. Do not share passwords or authenticator codes.
- Complete multi-factor authentication (MFA) whenever the application requests it.
- Sign out when leaving a shared computer. The application also locks after 15
  minutes of inactivity and requires password and MFA verification again.
- Do not enter client names or other identifying details in 4Ps information sent
  for AI narrative generation. The current Gemini data-handling arrangement has
  not been approved for identifying clinical information.
- Upload from Phone is not available in version 0.2.2. Use the desktop Documents
  and Assessments tabs.

## Access by role

| Area | Admin | Staff | Psychologist / Counselor |
| --- | --- | --- | --- |
| Dashboard and client list | All permitted clinic records | All permitted clinic records | Assigned clients only |
| Create clients | Yes; Clinic Administrator is the default representative | Yes; must choose an Admin or Psychologist / Counselor representative | Yes; assigned to their own representative profile |
| Client Overview | Edit | Edit | Edit assigned clients |
| 4Ps, C-SSRS, and progress notes | Edit | Read-only | Edit assigned clients |
| Documents and Assessments | Upload, download, rename, and delete | Upload, download, and rename; no deletion | Upload, download, rename, and delete for assigned clients |
| Analytics and exports | Clinic-wide | Clinic-wide | Assigned clients only |
| Care Team | Full administration | Manage non-Admin accounts only | View directory only |
| Clinic notice banner | Manage | Manage | Manage |
| Clinic information and categories | Manage | Manage | Not available |
| Backup export and review | Yes | Yes | Not available |
| Backup restore | Yes, with fresh MFA | No | No |
| System Activity / Audit Log | Yes | No | No |

Permissions are enforced by both the application and Supabase. If a control is
not available for your role, do not attempt to work around it.

## 1. Sign in and set up MFA

### First sign-in from an invitation

1. Open the invitation email on the Windows computer where the application is
   installed.
2. Select the invitation link and allow it to open HPC Client Management.
3. Create your own password. An administrator should never give you a shared or
   temporary password.
4. Follow the on-screen steps to add an authenticator app.
5. Enter the six-digit code from the authenticator app to enter the workspace.

### Later sign-ins

Enter your email and password, then enter the current six-digit authenticator
code. Password recovery is not currently available from the sign-in screen. If
you cannot sign in, contact the clinic Admin.

![Redacted HPC Client Management sign-in screen](screenshots/login-v0.2.2.jpg)

## 2. Dashboard

Dashboard summarizes the records your role is allowed to access. It shows
caseload totals, recent documentation, the next client to continue, follow-up
priorities, and recent work.

- Select a client in **Needs attention** or **Recent work** to open that record.
- Psychologist / Counselor totals and activity include only assigned clients.
- Staff and Admin see their permitted clinic-wide operational view.

![Redacted HPC Client Management dashboard](screenshots/dashboard-v0.2.2.jpg)

## 3. Clients

Use **Clients** to search, filter, create, and open client records.

### Find a client

Use the search box or filter by status, category, year, or month. Select a client
from the directory to open the record workspace.

### Create a client

1. Select **Add Client**.
2. Enter the required intake information.
3. Confirm the HPC Representative:
   - Admin starts with **Clinic Administrator** and may transfer the client to another active
     clinical representative.
   - Staff must choose an active Admin or Psychologist / Counselor
     representative. Staff cannot assign a client to Staff.
   - Psychologist / Counselor accounts use their own assigned representative.
4. Save the record.

### Client tabs

- **Overview:** intake source, identity and contact details, demographics,
  representative, status, and other client information.
- **4Ps:** biological, psychological, and social predisposing, precipitating,
  perpetuating, and protective factors.
- **Progress Notes:** dated clinical notes.
- **Documents:** scanned or uploaded client paperwork.
- **Assessments:** scanned or uploaded assessment paperwork.

Staff can maintain Overview information and upload, download, or rename
Documents and Assessments. Staff cannot edit clinical 4Ps, C-SSRS, or progress
notes and cannot delete uploaded paperwork.

<details>
<summary><strong>View the redacted client workspace</strong></summary>

![Redacted client workspace](screenshots/clients-v0.2.2.jpg)

</details>

## 4. 4Ps case conceptualization and narrative draft

Complete the four 4Ps rows across the Biological, Psychological, and Social
columns. Save the record before leaving the client.

When the required 4Ps information is complete, an Admin or the assigned
Psychologist / Counselor can generate a narrative draft. Review and edit every
draft before using it clinically. AI output is a drafting aid, not an assessment
or clinical decision.

**Privacy restriction:** Do not place client names, contact details, addresses,
employer or school names, record numbers, or other identifying details in 4Ps
content that will be sent for narrative generation.

<details>
<summary><strong>View the redacted 4Ps workspace</strong></summary>

![Redacted 4Ps case conceptualization workspace](screenshots/case-conceptualization-v0.2.2.jpg)

</details>

## 5. Documents and Assessments

1. Open the client and select **Documents** or **Assessments**.
2. Choose the appropriate desktop upload control.
3. Select the file and enter a clear display name.
4. Wait for the application to confirm that the upload and validation finished.

All three approved roles can upload, download, and rename paperwork for clients
they can access. Staff cannot delete uploads. Admin and the assigned
Psychologist / Counselor should delete only after confirming that the correct
record and file have been selected.

## 6. Analytics and exports

Use **Analytics** to review caseload, documentation coverage, demographics,
presenting concerns, C-SSRS follow-up, 4Ps completion, and records activity.

1. Set the date range and any status, category, representative, age-group, or
   sex filters.
2. Review the selected-view strip and charts.
3. Select **Export CSV** for data or **Export Presentation** for a branded
   PowerPoint summary.

Exports follow the same access rules as the screen. A Psychologist / Counselor
export contains only assigned-client data.

<details>
<summary><strong>View the redacted analytics workspace</strong></summary>

![Redacted analytics workspace](screenshots/analytics-v0.2.2.jpg)

</details>

## 7. Care Team

### Admin

Admin can invite approved roles, assign representative names, change roles, and
deactivate accounts. Admin accounts are protected from Staff changes.

### Staff

Staff can invite and manage non-Admin members. The Admin role is not available
when Staff sends an invitation. Staff cannot change, deactivate, or otherwise
affect any Admin account.

### Psychologist / Counselor

Psychologist / Counselor can view the directory but cannot invite members or
change account roles.

New members receive an email invitation, create their own password, and enroll
in MFA. Use **Deactivate** instead of deleting an account so its history remains
available. A deactivated account cannot enter the workspace.

<details>
<summary><strong>View the redacted Care Team workspace</strong></summary>

![Redacted Care Team workspace](screenshots/care-team-v0.2.2.jpg)

</details>

## 8. Settings

The modules shown in Settings depend on the signed-in role.

- **Contact details:** Admin and Staff can update clinic mobile, landline, email,
  and location information.
- **Appearance:** choose Light, Dark, HPC, or HPC Dark. The preference is saved
  on the current device.
- **Clinic notice banner:** all active roles can publish or disable a shared
  Dashboard notice.
- **Client categories:** Admin and Staff can add, rename, or remove list choices.
  Existing client records retain their saved category value.
- **Backup and restore:** Admin and Staff can export and inspect a JSON package.
  Only Admin can perform a merge restore after fresh MFA verification.
- **System Activity / Audit Log:** Admin only.

### Backup and restore boundary

Before a major administrative or data change, export a new backup and store it
in an approved private location. Restore works only with a package created by
the same Supabase project. It updates matching application records and adds
missing records; it does not delete current records absent from the package.

The in-app package does not recreate Supabase Auth accounts and does not restore
deleted Storage file contents. A full disaster-recovery process requires
separate database and Storage backups.

<details>
<summary><strong>View the redacted Settings workspace</strong></summary>

![Redacted Settings workspace](screenshots/settings-v0.2.2.jpg)

</details>

## 9. Profile and account security

Select your name or profile card in the lower-left sidebar to open **Profile**.
From this screen you can:

- upload or remove your profile picture;
- update your display name;
- request an email-address change using your current password and MFA code;
- change your password using your current password and MFA code; and
- add or remove an authenticator app.

Use one authenticator device per staff account whenever possible. Removing the
only working authenticator may prevent the account from completing MFA.

<details>
<summary><strong>View the redacted Profile workspace</strong></summary>

![Redacted Profile and MFA workspace](screenshots/profile-v0.2.2.jpg)

</details>

## 10. Check for and install updates

1. Open **About**.
2. Select **Check for Updates**.
3. If a newer version is offered, review its version and release notes.
4. Confirm installation. The application privately downloads the signed
   installer, verifies its signature, installs it, and restarts.
5. Return to About and confirm the installed version.

An active account with completed MFA is required. The update comes from the
private application release channel; pushing source code to Git does not update
the clinic application automatically.

![Redacted About and signed updater screen](screenshots/about-v0.2.2.jpg)

## 11. Common messages

| Message or situation | What to do |
| --- | --- |
| **Session locked after inactivity** | Sign in again with password and MFA. Unsaved work may need to be re-entered. |
| **Please sign in again and complete MFA** | Reauthenticate, complete MFA, then repeat the protected action. |
| **Your account has been deactivated** | Contact the clinic Admin. The account cannot enter the workspace while inactive. |
| **Your account profile was not found** | Contact the clinic Admin so the invitation and profile can be checked. |
| Invitation email rate limit | Wait for the Supabase mail limit to clear before sending another invitation. Avoid repeated retries. |
| Narrative generation failed | Confirm the required 4Ps rows are complete, save the record, and try again without identifying details. |
| Update cannot be installed | Confirm internet access, sign in with MFA again, and retry from About. Do not install an unsigned file from another source. |

## 12. End-of-session checklist

- Save the current client record.
- Confirm uploads finished and appear in the correct client tab.
- Close any exported files that contain clinic information.
- Store exports and backups only in approved private locations.
- Sign out of HPC Client Management.

