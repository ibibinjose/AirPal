const KEY = "airpal.signup.draft";

export type SignupDraft = { name: string; handle: string };

function storage(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/** Chosen name and @handle, kept until onboarding creates the profile. */
export function saveSignupDraft(draft: SignupDraft): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify({ name: draft.name.trim(), handle: draft.handle.trim() }));
  } catch {
    /* private mode */
  }
}

export function readSignupDraft(): SignupDraft | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SignupDraft>;
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    const handle = typeof parsed.handle === "string" ? parsed.handle.trim() : "";
    if (!name && !handle) return null;
    return { name, handle };
  } catch {
    return null;
  }
}

export function clearSignupDraft(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Onboarding URL that carries the signup name and handle past a slow profile write. */
export function onboardingPath(dest: string, draft: { name?: string; handle?: string } | null): string {
  const next = dest.startsWith("/") && !dest.startsWith("//") ? dest : "/";
  const params = new URLSearchParams();
  params.set("next", next);
  const handle = draft?.handle?.trim();
  const name = draft?.name?.trim();
  if (handle) params.set("handle", handle);
  if (name) params.set("name", name);
  return `/onboarding?${params.toString()}`;
}
