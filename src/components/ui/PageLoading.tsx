import { BrandLoader } from "@/components/ui/BrandLoader";

export function PageLoading({ label, message }: { label?: string; message?: string }) {
  return <BrandLoader size="sm" label={message || label || "Loading"} className="min-h-[50vh] p-8" />;
}
