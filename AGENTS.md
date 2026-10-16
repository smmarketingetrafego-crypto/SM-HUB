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
- All app data lives in one Cloud `workspace_data` row read/written via `src/lib/db-drive.ts` (server-only); why: original code used a server JSON file, which cannot persist on edge hosting.
- Server functions live in `src/lib/api-*.functions.ts`; only explicitly public flows (portal, proposal, briefing, payment webhook) pass `publicAccess: true`; why: everything else requires a signed-in team member.
