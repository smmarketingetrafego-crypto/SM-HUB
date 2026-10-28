import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { canReviewStep, canSubmitStep, forTrack, journeyProgress, quizScore, trackFromRole, TRACKS } from "./onboarding-rules";

type Ctx = { supabase: any; userId: string; claims: any };

/** Account the caller manages: own account, or any account for founders via x-sm-account. */
async function managedAccount(context: Ctx) {
  const { getRequest } = await import("@tanstack/react-start/server");
  const requested = getRequest()?.headers.get("x-sm-account") || "";
  const { data: founder } = await context.supabase.from("platform_admins").select("user_id").eq("user_id", context.userId).maybeSingle();
  if (founder && requested) return requested;
  const { data: acc } = await context.supabase.from("accounts").select("id").eq("owner_id", context.userId).maybeSingle();
  if (!acc) throw new Error("Somente o responsável pela conta pode gerenciar a integração.");
  return acc.id as string;
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function loadContent(db: any, accountId: string, track?: string) {
  const { ensureOnboardingContent } = await import("./onboarding.server");
  await ensureOnboardingContent(db, accountId);
  const { data, error } = await db.from("onboarding_content").select("kind,sort,data").eq("account_id", accountId).order("sort");
  if (error) throw new Error(error.message);
  const by = (k: string) => { const all = (data ?? []).filter((r: any) => r.kind === k).map((r: any) => r.data); return track === undefined ? all : forTrack(all, track); };
  return { steps: by("step"), lessons: by("lesson"), documents: by("document"), checklists: by("checklist"), quiz: by("quiz"), bulletins: by("bulletin") };
}

async function refreshStatus(db: any, journeyId: string, accountId: string) {
  const { data: j } = await db.from("onboarding_journeys").select("track").eq("id", journeyId).maybeSingle();
  const { data: rows } = await db.from("onboarding_content").select("data").eq("account_id", accountId).eq("kind", "step");
  const steps = forTrack((rows ?? []).map((r: any) => r.data), j?.track ?? "").map((data: any) => ({ data }));
  const { data: progress } = await db.from("onboarding_progress").select("item_id,status").eq("journey_id", journeyId);
  const pct = journeyProgress((steps ?? []).map((s: any) => s.data.id), progress ?? []);
  await db.from("onboarding_journeys").update(pct === 100 ? { status: "completed", completed_at: new Date().toISOString() } : { status: "in_progress", completed_at: null }).eq("id", journeyId);
}

// ---------- Manager ----------

export const listJourneys = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const accountId = await managedAccount(context);
  const db = await admin();
  const content = await loadContent(db, accountId);
  const { data: journeys, error } = await db.from("onboarding_journeys").select("*").eq("account_id", accountId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const ids = (journeys ?? []).map((j: any) => j.id);
  const { data: progress } = ids.length ? await db.from("onboarding_progress").select("*").in("journey_id", ids) : { data: [] };
  return {
    tracks: TRACKS.map(({ id, label }) => ({ id, label })),
    journeys: (journeys ?? []).map((j: any) => {
      const p = (progress ?? []).filter((x: any) => x.journey_id === j.id);
      const steps = forTrack(content.steps, j.track ?? "");
      return { ...j, steps, percent: journeyProgress(steps.map((s: any) => s.id), p), pendingReviews: p.filter((x: any) => x.status === "under_review").length, progress: p };
    }),
  };
});

export const inviteToOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) => z.object({ email: z.string().trim().email().max(255), name: z.string().trim().max(120), role: z.string().trim().max(120), collaboratorRef: z.string().max(80).optional(), track: z.string().max(40).optional() }).parse(p))
  .handler(async ({ data, context }) => {
    const accountId = await managedAccount(context);
    const { startJourney, requestOrigin } = await import("./onboarding.server");
    const track = TRACKS.some((t) => t.id === data.track) ? data.track! : trackFromRole(data.role);
    return startJourney(await admin(), { ...data, track, accountId, origin: await requestOrigin() });
  });

export const reviewStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) => z.object({ journeyId: z.string().uuid(), stepId: z.string().max(80), decision: z.enum(["approved", "needs_changes"]), feedback: z.string().trim().max(2000) }).parse(p))
  .handler(async ({ data, context }) => {
    const accountId = await managedAccount(context);
    const db = await admin();
    const { data: journey } = await db.from("onboarding_journeys").select("id,account_id").eq("id", data.journeyId).maybeSingle();
    if (!journey || journey.account_id !== accountId) throw new Error("Jornada não encontrada.");
    const itemId = `step:${data.stepId}`;
    const { data: cur } = await db.from("onboarding_progress").select("status").eq("journey_id", data.journeyId).eq("item_id", itemId).maybeSingle();
    if (!canReviewStep(cur?.status)) throw new Error("Esta etapa não está aguardando avaliação.");
    const { error } = await db.from("onboarding_progress").update({ status: data.decision, feedback: data.feedback, updated_at: new Date().toISOString() }).eq("journey_id", data.journeyId).eq("item_id", itemId);
    if (error) throw new Error(error.message);
    await refreshStatus(db, data.journeyId, accountId);
    return { success: true };
  });

export const removeJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) => z.string().uuid().parse(p))
  .handler(async ({ data, context }) => {
    const accountId = await managedAccount(context);
    const { error } = await (await admin()).from("onboarding_journeys").delete().eq("id", data).eq("account_id", accountId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ---------- Collaborator ----------

async function myJourney(context: Ctx) {
  const db = await admin();
  const { data: own } = await db.from("onboarding_journeys").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (own) return { db, journey: own };
  // First visit after accepting the invitation: link by the verified sign-in e-mail.
  const { data: user } = await db.auth.admin.getUserById(context.userId);
  const email = user?.user?.email?.toLowerCase();
  if (!email || !user?.user?.email_confirmed_at) return { db, journey: null };
  const { data: pending } = await db.from("onboarding_journeys").select("*").is("user_id", null).ilike("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!pending) return { db, journey: null };
  const { data: linked, error } = await db.from("onboarding_journeys").update({ user_id: context.userId, status: pending.status === "invited" ? "in_progress" : pending.status }).eq("id", pending.id).select().single();
  if (error) throw new Error(error.message);
  return { db, journey: linked };
}

export const getMyJourney = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { db, journey } = await myJourney(context);
  if (!journey) return { journey: null };
  const content = await loadContent(db, journey.account_id, journey.track ?? "");
  const { data: progress } = await db.from("onboarding_progress").select("*").eq("journey_id", journey.id);
  const { data: account } = await db.from("accounts").select("name").eq("id", journey.account_id).maybeSingle();
  const quiz = content.quiz.map(({ correct, explanation, ...q }: any) => q);
  return {
    journey,
    accountName: account?.name || "sua equipe",
    content: { ...content, quiz },
    progress: progress ?? [],
    percent: journeyProgress(content.steps.map((s: any) => s.id), progress ?? []),
  };
});

export const submitStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) => z.object({ stepId: z.string().max(80), submission: z.string().trim().min(3).max(4000) }).parse(p))
  .handler(async ({ data, context }) => {
    const { db, journey } = await myJourney(context);
    if (!journey) throw new Error("Nenhuma integração encontrada para você.");
    const { data: step } = await db.from("onboarding_content").select("id,data").eq("account_id", journey.account_id).eq("kind", "step").eq("data->>id", data.stepId).maybeSingle();
    if (!step || !forTrack([(step.data ?? {}) as { tracks?: string[] }], journey.track ?? "").length) throw new Error("Etapa não encontrada.");
    const itemId = `step:${data.stepId}`;
    const { data: cur } = await db.from("onboarding_progress").select("status").eq("journey_id", journey.id).eq("item_id", itemId).maybeSingle();
    if (!canSubmitStep(cur?.status)) throw new Error("Esta etapa já foi enviada ou aprovada.");
    const { error } = await db.from("onboarding_progress").upsert({ journey_id: journey.id, item_id: itemId, status: "under_review", submission: data.submission, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) => z.object({ answers: z.array(z.number().int().min(-1).max(20)).max(50) }).parse(p))
  .handler(async ({ data, context }) => {
    const { db, journey } = await myJourney(context);
    if (!journey) throw new Error("Nenhuma integração encontrada para você.");
    const { data: rows } = await db.from("onboarding_content").select("data").eq("account_id", journey.account_id).eq("kind", "quiz").order("sort");
    const quiz = forTrack((rows ?? []).map((r: any) => r.data), journey.track ?? "");
    const score = quizScore(quiz.map((q: any) => q.correct), data.answers);
    const { error } = await db.from("onboarding_progress").upsert({ journey_id: journey.id, item_id: "quiz", status: "approved", submission: JSON.stringify({ score, total: quiz.length, answers: data.answers }), updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { score, total: quiz.length, review: quiz.map((q: any, i: number) => ({ correct: q.correct, chosen: data.answers[i], explanation: q.explanation })) };
  });
