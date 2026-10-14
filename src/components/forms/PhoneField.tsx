import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  HOST_COUNTRIES,
  composePhone,
  countryByCode,
  countryFlag,
  countryFromPhone,
  isValidPhone,
  nationalDigits,
  splitPhone,
} from "@shared/geo-address";
import { ensureElementInView } from "@/lib/keyboard";
import { cn } from "@/lib/cn";

export function PhoneField({
  value,
  onChange,
  required,
  label = "Mobile Number",
  stacked: _stacked = false,
  onFocus,
  error: customError,
  hint: customHint,
}: {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  label?: string | null;
  stacked?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string | null;
  hint?: string | null;
}) {
  const initialCountry = countryFromPhone(value)?.code || "AU";
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry);
  const [national, setNational] = useState<string>(() => splitPhone(value).national);

  // Synchronize when external value changes
  useEffect(() => {
    if (!value) {
      if (national !== "0" && national !== "") {
        setNational("");
      }
      return;
    }
    const detected = countryFromPhone(value);
    if (detected) {
      setSelectedCountry(detected.code);
    }
    const parsed = splitPhone(value);
    const userDigits = nationalDigits(national).replace(/^0+/, "");
    const valueDigits = nationalDigits(parsed.national);
    if (userDigits !== valueDigits) {
      setNational(parsed.national);
    }
  }, [value]);

  const activeCountry = countryByCode(selectedCountry) || HOST_COUNTRIES[0];
  const ok = isValidPhone(value);
  const hasError = Boolean(value && !ok);
  const displayError = customError || (hasError ? "Enter a valid mobile number (8–15 digits)" : null);
  const displayHint = customHint || (!value && required ? "Enter local mobile number" : null);

  function handleCountryChange(newCode: string) {
    setSelectedCountry(newCode);
    const country = countryByCode(newCode) || HOST_COUNTRIES[0];
    if (national.trim()) {
      onChange(composePhone(country.dial, national));
    }
  }

  function handleNumberChange(raw: string) {
    // If user pastes an international number starting with + or 00
    if (raw.trim().startsWith("+") || raw.trim().startsWith("00")) {
      const detected = countryFromPhone(raw);
      if (detected) {
        setSelectedCountry(detected.code);
        const parsed = splitPhone(raw);
        setNational(parsed.national);
        onChange(composePhone(detected.dial, parsed.national));
        return;
      }
    }

    setNational(raw);
    onChange(composePhone(activeCountry.dial, raw));
  }

  const placeholder =
    selectedCountry === "AU"
      ? "412 345 678"
      : selectedCountry === "IN"
        ? "98765 43210"
        : selectedCountry === "US" || selectedCountry === "CA"
          ? "555 123 4567"
          : selectedCountry === "GB"
            ? "7911 123456"
            : selectedCountry === "NZ"
              ? "21 123 4567"
              : selectedCountry === "SG"
                ? "9123 4567"
                : "Mobile number";

  return (
    <div className="w-full">
      {/* Country Name Separately on the Top + Label */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        {label ? <span className="text-[12px] font-semibold text-ink/80">{label}</span> : <span />}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-semibold text-ink/80 border border-line shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
          <span>{activeCountry.name}</span>
        </span>
      </div>

      {/* Clean Single Container Phone Field */}
      <div
        className={cn(
          "relative flex h-12 w-full rounded-2xl border bg-card shadow-2xs transition-all",
          displayError
            ? "border-red-500/80 focus-within:ring-2 focus-within:ring-red-500/20"
            : "border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
        )}
      >
        {/* Chooser: Only Flag & Country Code */}
        <div className="relative flex items-center shrink-0 border-r border-line/70 bg-paper/40 px-3 hover:bg-paper/80 transition rounded-l-2xl group cursor-pointer">
          <div className="flex items-center gap-1.5 pointer-events-none select-none">
            <span className="text-base leading-none" aria-hidden="true">
              {countryFlag(activeCountry.code)}
            </span>
            <span className="text-xs font-bold text-ink tracking-tight">{activeCountry.dial}</span>
            <span className="text-[8px] text-mute group-hover:text-ink transition ml-0.5">▼</span>
          </div>
          <select
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer text-xs"
            aria-label="Country Code"
          >
            {HOST_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.name} ({c.dial})
              </option>
            ))}
          </select>
        </div>

        {/* National Number Input */}
        <input
          value={national}
          onChange={(e) => handleNumberChange(e.target.value)}
          inputMode="tel"
          autoComplete="tel-national"
          enterKeyHint="next"
          placeholder={placeholder}
          className="h-full flex-1 bg-transparent px-3.5 pr-10 text-[16px] sm:text-sm text-ink outline-none placeholder:text-mute/60 font-medium"
          aria-label="Mobile Number"
          onFocus={(e) => {
            onFocus?.(e);
            ensureElementInView(e.currentTarget, {
              block: "center",
              topClearance: 70,
              bottomClearance: 24,
              behavior: "smooth",
            });
          }}
        />

        {/* Validation checkmark */}
        {ok && !displayError && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
            aria-hidden="true"
          >
            <Check size={18} strokeWidth={2.6} />
          </span>
        )}
      </div>

      {/* Error or Hint message */}
      {(displayError || displayHint) && (
        <span className={cn("mt-1 block text-[12px] px-0.5", displayError ? "text-red-600 font-medium" : "text-mute")}>
          {displayError || displayHint}
        </span>
      )}
    </div>
  );
}
