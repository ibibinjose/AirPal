import { useState } from "react";
import { ClaimShell } from "@/components/claim/ClaimShell";
import { ClaimVenueForm } from "@/components/claim/ClaimVenueForm";

const STEPS = ["Find venue", "Confirm & request", "Done"];

export function ClaimVenuePage() {
  const [step, setStep] = useState(0);
  return (
    <ClaimShell
      eyebrow="Venue Claims"
      title="Claim your venue"
      lede="Find your Google listing, prove the link, and take ownership. Approval mints your draft venue page — nothing goes public until you publish it."
      steps={STEPS}
      activeStep={step}
      backTo="/business"
      backLabel="Business"
    >
      <ClaimVenueForm onStep={setStep} onDone={() => setStep(2)} />
    </ClaimShell>
  );
}
