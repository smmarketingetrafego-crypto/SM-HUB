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
