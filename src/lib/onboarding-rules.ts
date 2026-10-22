export type ProgressStatus = "pending" | "under_review" | "approved" | "needs_changes";

/** Percent of journey steps approved by the manager. */
export function journeyProgress(stepIds: string[], progress: { item_id: string; status: string }[]) {
  if (!stepIds.length) return 0;
  const approved = stepIds.filter((id) => progress.some((p) => p.item_id === `step:${id}` && p.status === "approved")).length;
  return Math.round((approved / stepIds.length) * 100);
}

/** A collaborator may only submit a step that is not already waiting or approved. */
export function canSubmitStep(current: string | undefined) {
  return current !== "under_review" && current !== "approved";
}

/** Managers may only decide on steps that were submitted. */
export function canReviewStep(current: string | undefined) {
  return current === "under_review";
}

export function quizScore(correct: number[], answers: number[]) {
  return correct.reduce((n, c, i) => n + (answers[i] === c ? 1 : 0), 0);
}

export const TRACKS = [
  { id: "filmmaker", label: "Filmmaker", keys: ["film", "cinegraf", "câmera", "camera", "video maker", "videomaker"] },
  { id: "editor_video", label: "Editor de Vídeo", keys: ["editor", "edição", "edicao", "motion"] },
  { id: "fotografo", label: "Fotógrafo", keys: ["fot"] },
  { id: "social_media", label: "Social Media", keys: ["social"] },
  { id: "copywriter", label: "Copywriter", keys: ["copy", "roteir", "redat", "conteúdo"] },
  { id: "storymaker", label: "Storymaker", keys: ["story"] },
  { id: "designer", label: "Designer", keys: ["design", "arte"] },
  { id: "gestor_trafego", label: "Gestor de Tráfego", keys: ["tráfego", "trafego", "ads", "performance"] },
  { id: "atendimento", label: "Atendimento", keys: ["atendimento", "suporte", "comercial"] },
  { id: "financeiro", label: "Financeiro", keys: ["financ"] },
] as const;

/** Guesses the track from a free-text role; "" means common steps only. */
export function trackFromRole(role: string) {
  const r = (role || "").toLowerCase();
  return TRACKS.find((t) => t.keys.some((k) => r.includes(k)))?.id ?? "";
}

/** Items without tracks are for everyone; tagged items only for their tracks. */
export function forTrack<T extends { tracks?: string[] }>(items: T[], track: string) {
  return items.filter((i) => !i.tracks?.length || i.tracks.includes(track));
}
