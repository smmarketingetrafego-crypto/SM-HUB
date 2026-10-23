// Who receives a "something was created" notice: the account owner plus every
// founder, never the person who did it, each only once.
export function notificationRecipients(ownerId: string | null, founderIds: string[], actorId: string | null): string[] {
  const all = [ownerId, ...founderIds].filter((id): id is string => !!id);
  return [...new Set(all)].filter((id) => id !== actorId);
}
