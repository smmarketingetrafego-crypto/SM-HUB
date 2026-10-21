// Browser-only persistence for hidden tutorial banners. Call only from effects/handlers.
const HIDDEN_KEY = "smhub-hidden-tutorials";
const ALL_KEY = "smhub-hide-all-tutorials";
export const TUTORIAL_VISIBILITY_EVENT = "smhub-tutorial-visibility";

function notify() {
  window.dispatchEvent(new Event(TUTORIAL_VISIBILITY_EVENT));
}

export function getHiddenTutorials(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isAllTutorialsHidden(): boolean {
  return localStorage.getItem(ALL_KEY) === "1";
}

export function hideTutorial(id: string) {
  const list = getHiddenTutorials();
  if (!list.includes(id)) localStorage.setItem(HIDDEN_KEY, JSON.stringify([...list, id]));
  notify();
}

export function hideAllTutorials() {
  localStorage.setItem(ALL_KEY, "1");
  notify();
}

export function resetTutorialVisibility() {
  localStorage.removeItem(HIDDEN_KEY);
  localStorage.removeItem(ALL_KEY);
  notify();
}
