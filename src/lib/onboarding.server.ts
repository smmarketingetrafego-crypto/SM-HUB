import seed from "@/data/onboarding-seed.json";

type Admin = any;

/** Copies the default onboarding content into an account the first time it is needed. */
export async function ensureOnboardingContent(admin: Admin, accountId: string) {
  const { count, error } = await admin.from("onboarding_content").select("id", { count: "exact", head: true }).eq("account_id", accountId);
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;
  const rows = (seed as any[]).map((s) => ({ account_id: accountId, kind: s.kind, sort: s.sort, data: s.data }));
  const { error: insertError } = await admin.from("onboarding_content").insert(rows);
  if (insertError) throw new Error(insertError.message);
}

/** Creates (or reuses) a journey for a collaborator and sends the invitation e-mail. */
export async function startJourney(
  admin: Admin,
  input: { accountId: string; email: string; name: string; role: string; collaboratorRef?: string; origin: string },
) {
  const email = input.email.trim().toLowerCase();
  await ensureOnboardingContent(admin, input.accountId);
  const { data: existing } = await admin.from("onboarding_journeys").select("id").eq("account_id", input.accountId).ilike("email", email).maybeSingle();
  let journeyId = existing?.id as string | undefined;
  if (!journeyId) {
    const { data, error } = await admin.from("onboarding_journeys").insert({
      account_id: input.accountId, email, name: input.name, role: input.role, collaborator_ref: input.collaboratorRef ?? "",
    }).select("id").single();
    if (error) throw new Error(error.message);
    journeyId = data.id;
  }
  // New people receive an invite to create their password; existing users just sign in with this e-mail.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${input.origin}/integracao`,
    data: { full_name: input.name },
  });
  const alreadyUser = !!inviteError && /already|registered|exists/i.test(inviteError.message);
  if (inviteError && !alreadyUser) throw new Error(`Jornada criada, mas o convite não foi enviado: ${inviteError.message}`);
  await admin.from("onboarding_journeys").update({ invited_at: new Date().toISOString() }).eq("id", journeyId);
  return { journeyId, invited: !inviteError, alreadyUser };
}

export async function requestOrigin() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  return req?.headers.get("origin") || new URL(req.url).origin;
}
