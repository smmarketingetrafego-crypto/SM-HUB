import { describe, expect, it } from "vitest";
import { canReviewStep, canSubmitStep, journeyProgress, quizScore } from "./onboarding-rules";

describe("onboarding rules", () => {
  it("counts only manager-approved steps in progress", () => {
    expect(journeyProgress(["a", "b", "c", "d"], [
      { item_id: "step:a", status: "approved" },
      { item_id: "step:b", status: "under_review" },
    ])).toBe(25);
  });
  it("blocks resubmitting a step waiting for approval or already approved", () => {
    expect(canSubmitStep("under_review")).toBe(false);
    expect(canSubmitStep("approved")).toBe(false);
    expect(canSubmitStep("needs_changes")).toBe(true);
  });
  it("only lets managers decide submitted steps", () => {
    expect(canReviewStep("pending")).toBe(false);
    expect(canReviewStep("under_review")).toBe(true);
  });
  it("scores the quiz", () => {
    expect(quizScore([1, 2, 0], [1, 0, 0])).toBe(2);
  });
});

import { forTrack, trackFromRole } from "./onboarding-rules";
describe("trilhas por função", () => {
  it("shows common items plus only the collaborator's track", () => {
    const items = [{ id: "a" }, { id: "b", tracks: ["designer"] }, { id: "c", tracks: ["filmmaker"] }];
    expect(forTrack(items, "designer").map((i) => i.id)).toEqual(["a", "b"]);
  });
  it("infers the track from the role text", () => {
    expect(trackFromRole("Designer & Direção de Arte")).toBe("designer");
    expect(trackFromRole("Gestor de Tráfego & Performance")).toBe("gestor_trafego");
    expect(trackFromRole("Diretor Geral")).toBe("");
  });
});
