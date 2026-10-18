import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebase";
import { friendlyFunctionError } from "./functions";

async function callBirthday<Req, Res>(name: string, data: Req): Promise<Res> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const callable = httpsCallable<Req, Res>(functions, name);
  const result = await callable(data);
  return result.data;
}

export function friendlyBirthdayError(err: unknown): string {
  return friendlyFunctionError(err);
}

export function setBirthdayAlertPrefsRemote(data: { birthdayAlertsEnabled?: boolean; birthdayAlertsRegion?: string }) {
  return callBirthday<{ birthdayAlertsEnabled?: boolean; birthdayAlertsRegion?: string }, { ok: boolean }>(
    "setBirthdayAlertPrefs",
    data,
  );
}
