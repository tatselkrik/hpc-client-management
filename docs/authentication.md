# Authentication in version 0.3.6

Version 0.3.6 supports a coordinated transition to email-and-password sign-in.
Earlier versioned guides describe their original MFA-dependent behavior.

- The transition app verifies existing authenticators while connected to the
  legacy MFA-required backend. It offers no new enrollment or factor management.
- After the approved backend rollout, all roles use email and password without
  an MFA prompt. The authenticated capability `hpc_authentication_policy` signals
  readiness. Its absence retains legacy verification; other failures stop login.
- An account without an existing factor cannot access the legacy backend's
  protected records. The app explains that the backend update is pending.
- Previously enrolled authenticators must be removed during the approved rollout.
  Re-enabling MFA in a later release requires fresh enrollment.
- Profile email/password changes retain current-password confirmation. Email
  changes still use the configured inbox confirmation process.
- Care-team administration and backup restore require a password sign-in within
  the last five minutes. If prompted, sign out, sign in again, and retry.
- Active-account checks, role/clinician restrictions, private file access,
  idle locking, and audit logging remain in place. Removing MFA reduces protection
  against stolen passwords; use strong unique passwords and protect workstations.

## Deployment order

1. Take and verify a private backup of the target backend. Obtain separate
   production approval before applying authentication changes.
2. Distribute and verify the 0.3.6 installer before retiring MFA. An idle computer
   may be updated manually later, but must not use its old app after cutover.
3. Apply the MFA-retirement and calendar-fix migrations and deploy the matching
   Edge Functions, retaining active-account and role checks.
4. Disable enrollment and verification for configured MFA methods in Auth and
   remove existing factors through the administrative Auth API. Do not delete
   user accounts or copy factor secrets into backups.
5. Apply the authentication-transition capability migration LAST. Verify that
   authenticated callers receive the password-only policy and anonymous callers
   cannot invoke it.
6. Have users sign out and back in, then test records, calendar access, protected
   administration, and private updates for the permitted roles.

Older MFA-dependent apps must not be used after cutover. The backend update is
not installed by the desktop updater. An in-progress sign-in may require a retry;
zero interruption is not guaranteed.

The same update revalidates availability when reinstating cancelled/no-show
appointments, paginates calendar data, and limits appointment analytics to
non-removed visits scheduled to start in the preceding 30 days, excluding future
appointments.
