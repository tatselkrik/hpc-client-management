// Every authenticated workspace belongs to one verified identity. Advancing the
// generation unmounts the entire workspace, including caches and pending views.
let generation = 0;
let identity: string | null = null;
let locallyLocked = false;
const listeners = new Set<() => void>();

export const getClinicalSessionGeneration = () => generation;
export const isClinicalSessionLocked = () => locallyLocked;
export function assertClinicalSession(expectedGeneration: number) {
  if (locallyLocked || generation !== expectedGeneration) throw new Error("Your session changed. Sign in and start this action again.");
}
export const subscribeClinicalSession = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

const invalidateWorkspace = () => {
  generation += 1;
  listeners.forEach((listener) => listener());
};

export function lockClinicalSession() {
  identity = null;
  if (locallyLocked) return;
  locallyLocked = true;
  invalidateWorkspace();
}

// Only an explicit password sign-in or a confirmed invitation may unlock a
// locally locked session. A late bootstrap/token refresh cannot unlock it.
export function allowInteractiveSession(userId: string) {
  locallyLocked = false;
  const changed = identity !== null && identity !== userId;
  identity = userId;
  if (changed) invalidateWorkspace();
}

export function acceptConfirmedInvitation(userId: string) {
  locallyLocked = false;
  identity = userId;
  invalidateWorkspace();
}

export function observeClinicalIdentity(userId: string) {
  if (locallyLocked) return false;
  const changed = identity !== null && identity !== userId;
  identity = userId;
  if (changed) invalidateWorkspace();
  return !changed;
}
