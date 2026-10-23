<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## SM Hub
- Each account's app data lives in its own `workspace_data` row (keyed by account id) via `src/lib/db-drive.ts`; founders (platform_admins) may target any account with the `x-sm-account` header; public flows locate the owning account by entity id; why: per-account isolation on edge hosting.
- Plan billing goes through Asaas (`src/lib/asaas.server.ts`) and the token-verified webhook at /api/public/webhook/payment; why: platform revenue only — agency proposals use the agency's own Pix key.
- Server functions live in `src/lib/api-*.functions.ts`; only explicitly public flows (portal, proposal, briefing, payment webhook) pass `publicAccess: true`; why: everything else requires a signed-in team member.
- Platform administration uses authenticated functions with founder membership checked through the caller's RLS client before privileged writes; why: sidebar visibility and account context are not authorization.
- Founder account settings accept an explicit allowlist and access listings use account-scoped membership rows; why: editing account identity must never grant privileges or alter unrelated accounts.
- Support uses persisted tickets and ordered messages with dedicated ticket URLs; initial AI is a one-shot guidance response, not an autonomous agent; why: human escalation and reload history must stay attached to the ticket.
- New subscription inserts require a confirmed billing catalog in both the server action and a database trigger; why: old published clients must also fail closed on unapproved prices.
- Drive configuration and file records are server-only and keyed by account; central Drive calls use the linked App connector and files are downloaded only after account-scoped lookup; why: no shared credentials or unrestricted folder access reach account users.
- Collaborator onboarding uses onboarding_* tables written only by server functions (`src/lib/api-onboarding.functions.ts`); a journey links to a user on first visit by verified e-mail; why: invites happen before the collaborator has an account.
- Creation notices go through `notifyAccount` (`src/lib/notifications.server.ts`) into the `notifications` table (owner + founders, never the actor); new accounts notify founders via a DB trigger; why: one recipient rule for every event and a realtime in-app bell.
