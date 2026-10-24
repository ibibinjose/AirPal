/**
 * Null-safe display-text helpers for profile render paths. Profile docs can
 * arrive partial (loading states, legacy rows), and a single `undefined`
 * field must never crash a page through `String.prototype` calls in render.
 */

/** `@Bibin` → `bibin`; missing input → `""` (never throws). */
export function cleanHandle(handle: string | null | undefined): string {
  return (handle ?? "").trim().replace(/^@+/, "").toLowerCase();
}

/** `"Bibin Jose"` → `"Bibin"`; missing input → `""` (never throws). */
export function firstNameOf(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/).filter(Boolean)[0] ?? "";
}

/** `"Bibin Jose"` → `"BJ"`, `"Madonna"` → `"MA"`; missing input → `"AP"`. */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AP";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
