import {
  accountVerificationEmail as brandAccountVerificationEmail,
  passwordResetEmail as brandPasswordResetEmail,
  emailChangeEmail as brandEmailChangeEmail,
  mfaEnrolledEmail as brandMfaEnrolledEmail,
  firebaseConsoleTemplate as brandFirebaseConsoleTemplate,
  EMAIL_BRAND,
} from "./email-templates";

export { EMAIL_BRAND };

/** Path Firebase Auth emails should open (set as the console action URL). */
export const AUTH_ACTION_PATH = "/auth/action";

export type AuthActionMode = "verifyEmail" | "resetPassword" | "recoverEmail" | "signIn" | "unknown";

export type AuthActionQuery = {
  mode: AuthActionMode;
  oobCode: string;
  continueUrl: string | null;
  lang: string | null;
};

const MODES = new Set<AuthActionMode>(["verifyEmail", "resetPassword", "recoverEmail", "signIn"]);

export function parseAuthActionSearch(search: string): AuthActionQuery {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const modeRaw = params.get("mode") || "";
  const mode: AuthActionMode = MODES.has(modeRaw as AuthActionMode) ? (modeRaw as AuthActionMode) : "unknown";
  return {
    mode,
    oobCode: (params.get("oobCode") || "").trim(),
    continueUrl: params.get("continueUrl"),
    lang: params.get("lang"),
  };
}

export function authActionContinueUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/start?tab=signin`;
}

export function authActionHandlerUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}${AUTH_ACTION_PATH}`;
}

/** Same-origin continue URLs only — email links can be rewritten. */
export function safeContinuePath(raw: string | null | undefined, origin: string) {
  const fallback = "/start?tab=signin";
  if (!raw) return fallback;
  try {
    const base = origin.replace(/\/$/, "");
    const url = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : new URL(raw, `${base}/`);
    if (url.origin !== new URL(base).origin) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("/") ? path : fallback;
  } catch {
    return fallback;
  }
}

export function authErrorCode(err: unknown): string {
  if (typeof err === "object" && err && "code" in err) {
    const code = String((err as { code: unknown }).code || "");
    if (code.startsWith("auth/")) return code;
  }
  const message = err instanceof Error ? err.message : String(err || "");
  const match = message.match(/auth\/[a-z0-9-]+/i);
  return match ? match[0].toLowerCase() : "";
}

export function authErrorMessage(err: unknown, fallback = "Failed"): string {
  switch (authErrorCode(err)) {
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Need a real email";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password does not match";
    case "auth/email-already-in-use":
      return "That email already has an account. Sign in with email, or use another address.";
    case "auth/requires-recent-login":
      return "Confirm your mobile number again, then save.";
    case "auth/weak-password":
      return "At least 8 characters";
    case "auth/too-many-requests":
      return "Too many tries. Wait a minute.";
    case "auth/expired-action-code":
      return "This link has expired. Request a new one.";
    case "auth/invalid-action-code":
    case "auth/missing-oob-code":
      return "This link is invalid or already used. Request a new one.";
    case "auth/user-disabled":
      return "This account is disabled.";
    case "auth/network-request-failed":
      return "Network failed. Try again.";
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Need a real mobile number with country code";
    case "auth/invalid-verification-code":
    case "auth/missing-verification-code":
      return "That code is not right";
    case "auth/code-expired":
    case "auth/session-expired":
      return "That code expired. Request a new one.";
    case "auth/captcha-check-failed":
      return "Could not verify you are human. Refresh and try again.";
    case "auth/quota-exceeded":
      return "SMS is paused for this number. Try again later.";
    case "auth/billing-not-enabled":
      return "This Firebase project must be on the Blaze plan to send SMS.";
    case "auth/invalid-app-credential":
    case "auth/missing-client-identifier":
      return "Phone verification failed the security check. Refresh and try again.";
    case "auth/credential-already-in-use":
      return "That mobile number is already on another account.";
    case "auth/provider-already-linked":
      return "This account already has a mobile number. Change it, or remove it first.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/account-exists-with-different-credential":
      return "That email already has an account. Sign in with email or the method you used first.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled yet. Try email or mobile, or try again shortly.";
    default:
      if (err instanceof Error && err.message && !err.message.startsWith("Firebase:")) return err.message;
      return fallback;
  }
}

export type AuthEmailKind = "verify" | "reset" | "emailChange" | "mfaEnrolled";

export type AuthEmailInput = {
  name?: string;
  email?: string;
  newEmail?: string;
  phoneNumber?: string;
  link?: string;
  site?: string;
  fromEmail?: string;
};

export type AuthEmail = {
  kind: AuthEmailKind;
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

export function accountVerificationEmail(input: AuthEmailInput): AuthEmail {
  const rendered = brandAccountVerificationEmail({
    name: input.name,
    email: input.email,
    link: input.link || "%LINK%",
    site: input.site,
  });
  return {
    kind: "verify",
    ...rendered,
  };
}

export function passwordResetEmail(input: AuthEmailInput): AuthEmail {
  const rendered = brandPasswordResetEmail({
    name: input.name,
    email: input.email,
    link: input.link || "%LINK%",
    site: input.site,
  });
  return {
    kind: "reset",
    ...rendered,
  };
}

export function emailChangeEmail(input: AuthEmailInput & { newEmail: string }): AuthEmail {
  const rendered = brandEmailChangeEmail({
    name: input.name,
    email: input.email,
    newEmail: input.newEmail,
    link: input.link || "%LINK%",
    site: input.site,
  });
  return {
    kind: "emailChange",
    ...rendered,
  };
}

export function mfaEnrolledEmail(input: AuthEmailInput & { email: string }): AuthEmail {
  const rendered = brandMfaEnrolledEmail({
    name: input.name,
    email: input.email,
    phoneNumber: input.phoneNumber,
    site: input.site,
  });
  return {
    kind: "mfaEnrolled",
    ...rendered,
  };
}

/** Inner HTML for Firebase Console Authentication → Templates (%LINK%, %DISPLAY_NAME%, %EMAIL%, %NEW_EMAIL%, %PHONE_NUMBER%). */
export function firebaseConsoleTemplate(
  kind: AuthEmailKind,
  site?: string,
): { subject: string; html: string; text: string } {
  return brandFirebaseConsoleTemplate(kind, site);
}
