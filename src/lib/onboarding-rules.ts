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
