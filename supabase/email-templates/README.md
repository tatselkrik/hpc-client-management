# Supabase Auth email templates

These templates use one restrained Clinic design for authentication and
security messages. They intentionally contain no client information, marketing
copy, remote images, tracking pixels, or unrelated links.

Hosted Supabase projects apply these files through **Authentication → Emails →
Email Templates**. Projects created on the free tier after June 3, 2026 must
configure custom SMTP before Supabase allows customized templates.

Activation is currently deferred pending access to a clinic-controlled Gmail account.
The template files should remain unchanged and Supabase SMTP settings should remain as
they are until that sender account can be configured and tested.

## Authentication templates

| Supabase template | Subject | File |
| --- | --- | --- |
| Invite user | You’re invited to HPC Client Management | `invite.html` |
| Confirm sign up | Confirm your HPC Client Management account | `confirmation.html` |
| Reset password | Reset your HPC Client Management password | `recovery.html` |
| Magic link | Your HPC Client Management sign-in link | `magic_link.html` |
| Change email address | Confirm your new email address | `email_change.html` |
| Reauthentication | Your HPC verification code | `reauthentication.html` |

## Security notifications

Enable the corresponding security notification in Supabase before expecting it
to send.

| Supabase notification | Subject | File |
| --- | --- | --- |
| Password changed | Your HPC password was changed | `password_changed_notification.html` |
| Email changed | Your HPC email address was changed | `email_changed_notification.html` |
| Phone changed | Your HPC phone number was changed | `phone_changed_notification.html` |
| Sign-in method linked | A sign-in method was linked to your HPC account | `identity_linked_notification.html` |
| Sign-in method removed | A sign-in method was removed from your HPC account | `identity_unlinked_notification.html` |
| Verification method added | A verification method was added to your HPC account | `mfa_added_notification.html` |
| Verification method removed | A verification method was removed from your HPC account | `mfa_removed_notification.html` |

After activation, send one test of every enabled flow and check the Supabase Auth
logs for template parsing errors. Disable link tracking in the SMTP provider so
confirmation links are not rewritten.
