import { useEffect, useState, type FormEvent } from "react";
import { Check, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { authErrorMessage } from "@shared/auth-email";
import { formatPhoneDisplay, isOtp, normalizeOtp, phoneReady } from "@shared/phone-auth";
import { isEmail } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { PhoneField } from "@/components/forms/PhoneField";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { PHONE_RECAPTCHA_ID, resetPhoneLogin } from "@/lib/phone-auth";

export function AccountContacts({ compact }: { compact?: boolean }) {
  const {
    user,
    sendVerificationEmail,
    sendAccountPhoneCode,
    confirmAccountPhoneCode,
    removePhoneNumber,
    updateEmailAddress,
    removeEmailAddress,
  } = useAuth();
  const [phoneEdit, setPhoneEdit] = useState(false);
  const [emailEdit, setEmailEdit] = useState(false);
  const [confirmRemovePhone, setConfirmRemovePhone] = useState(false);
  const [confirmRemoveEmail, setConfirmRemoveEmail] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeStep, setCodeStep] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => resetPhoneLogin();
  }, []);

  if (!user) return null;

  const phoneOk = phoneReady(phone);
  const codeOk = isOtp(code);
  const emailOk = isEmail(email);

  async function sendCode() {
    if (!phoneOk) {
      toast.error("Need a real mobile number with country code");
      return;
    }
    setBusy(true);
    try {
      await sendAccountPhoneCode(phone);
      setCodeStep(true);
      toast.success("Code sent");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not send the code"));
      resetPhoneLogin();
    } finally {
      setBusy(false);
    }
  }

  async function savePhone(e: FormEvent) {
    e.preventDefault();
    if (!codeStep) {
      await sendCode();
      return;
    }
    if (!codeOk) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      await confirmAccountPhoneCode(normalizeOtp(code));
      toast.success("Mobile number saved");
      setPhoneEdit(false);
      setCodeStep(false);
      setPhone("");
      setCode("");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not save the mobile number"));
    } finally {
      setBusy(false);
    }
  }

  async function saveEmail(e: FormEvent) {
    e.preventDefault();
    if (!emailOk) {
      toast.error("Need a real email");
      return;
    }
    setBusy(true);
    try {
      await updateEmailAddress(email.trim());
      toast.success("Check that inbox to confirm the address");
      setEmailEdit(false);
      setEmail("");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not save the email"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={compact ? "space-y-3" : "mt-6 space-y-3"}>
      {!compact && <h2 className="font-display text-lg font-bold text-ink">Linked Email &amp; Mobile</h2>}
      <div className="space-y-3">
        {/* Mobile Number Row */}
        <div className="rounded-2xl bg-paper/70 px-4 py-3.5 ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent">
                <Smartphone size={18} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Mobile number</p>
                  {user.phoneVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      <Check size={10} /> Confirmed
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm text-ink mt-0.5 truncate">
                  {user.phone ? formatPhoneDisplay(user.phone) : "Not added yet"}
                </p>
              </div>
            </div>

            {!phoneEdit && (
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-card px-3.5 text-xs font-bold text-accent ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer"
                  onClick={() => {
                    setPhoneEdit(true);
                    setConfirmRemovePhone(false);
                    setCodeStep(false);
                    setPhone(user.phone || "");
                  }}
                >
                  {user.phone ? "Change" : "Add Mobile"}
                </button>
                {user.phone &&
                  (confirmRemovePhone ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-rose-600 px-3.5 text-xs font-bold text-white hover:bg-rose-700 active:scale-95 transition cursor-pointer"
                        onClick={() => {
                          setBusy(true);
                          void removePhoneNumber()
                            .then(() => {
                              toast.success("Mobile number removed");
                              setConfirmRemovePhone(false);
                            })
                            .catch((err) => toast.error(authErrorMessage(err, "Could not remove")))
                            .finally(() => setBusy(false));
                        }}
                      >
                        Confirm remove
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-card px-3 text-xs font-semibold text-mute ring-1 ring-line hover:text-ink cursor-pointer"
                        onClick={() => setConfirmRemovePhone(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-card px-3 text-xs font-semibold text-mute ring-1 ring-line hover:text-rose-600 active:scale-95 transition cursor-pointer"
                      onClick={() => setConfirmRemovePhone(true)}
                    >
                      Remove
                    </button>
                  ))}
              </div>
            )}
          </div>

          {phoneEdit && (
            <form className="mt-3.5 pt-3 border-t border-line/60 space-y-2.5" onSubmit={(e) => void savePhone(e)}>
              {!codeStep ? (
                <PhoneField value={phone} onChange={setPhone} required />
              ) : (
                <ValidField label="6-digit code" ok={codeOk}>
                  <input
                    value={code}
                    onChange={(e) => setCode(normalizeOtp(e.target.value))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className={fieldInput}
                  />
                </ValidField>
              )}
              <div
                id={PHONE_RECAPTCHA_ID}
                className="flex min-h-[78px] justify-center overflow-hidden rounded-2xl bg-card p-2 ring-1 ring-line"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={busy}
                  loading={busy}
                  className="min-h-[44px] rounded-full px-4"
                >
                  {busy ? "Please wait…" : codeStep ? "Save mobile" : "Send code"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-[44px] rounded-full px-4"
                  onClick={() => {
                    setPhoneEdit(false);
                    setCodeStep(false);
                    resetPhoneLogin();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Email Row */}
        <div className="rounded-2xl bg-paper/70 px-4 py-3.5 ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
                <Mail size={18} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Email address</p>
                  {user.email && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        user.emailVerified
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {user.emailVerified ? (
                        <>
                          <Check size={10} /> Confirmed
                        </>
                      ) : (
                        "Unverified"
                      )}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm text-ink mt-0.5 break-all">{user.email || "Not added yet"}</p>
              </div>
            </div>

            {!emailEdit && (
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-card px-3.5 text-xs font-bold text-accent ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer"
                  onClick={() => {
                    setEmailEdit(true);
                    setConfirmRemoveEmail(false);
                    setEmail(user.email || "");
                  }}
                >
                  {user.email ? "Change" : "Add Email"}
                </button>
                {user.email && !user.emailVerified && (
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand/10 px-3.5 text-xs font-bold text-accent hover:bg-brand/20 active:scale-95 transition cursor-pointer"
                    onClick={() => {
                      setBusy(true);
                      void sendVerificationEmail()
                        .then(() => toast.success("Verification email sent"))
                        .catch((err) => toast.error(authErrorMessage(err, "Could not send")))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Resend confirm
                  </button>
                )}
                {user.email &&
                  user.phone &&
                  (confirmRemoveEmail ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-rose-600 px-3.5 text-xs font-bold text-white hover:bg-rose-700 active:scale-95 transition cursor-pointer"
                        onClick={() => {
                          setBusy(true);
                          void removeEmailAddress()
                            .then(() => {
                              toast.success("Email removed");
                              setConfirmRemoveEmail(false);
                            })
                            .catch((err) => toast.error(authErrorMessage(err, "Could not remove")))
                            .finally(() => setBusy(false));
                        }}
                      >
                        Confirm remove
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-card px-3 text-xs font-semibold text-mute ring-1 ring-line hover:text-ink cursor-pointer"
                        onClick={() => setConfirmRemoveEmail(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-card px-3 text-xs font-semibold text-mute ring-1 ring-line hover:text-rose-600 active:scale-95 transition cursor-pointer"
                      onClick={() => setConfirmRemoveEmail(true)}
                    >
                      Remove
                    </button>
                  ))}
              </div>
            )}
          </div>

          {emailEdit && (
            <form className="mt-3.5 pt-3 border-t border-line/60 space-y-2.5" onSubmit={(e) => void saveEmail(e)}>
              <ValidField label="Email" ok={emailOk} error={email && !emailOk ? "Need a real email" : null}>
                <input
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={fieldInput}
                />
              </ValidField>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={busy || !emailOk}
                  loading={busy}
                  className="min-h-[44px] rounded-full px-4"
                >
                  {busy ? "Please wait…" : "Save email"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-[44px] rounded-full px-4"
                  onClick={() => setEmailEdit(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
