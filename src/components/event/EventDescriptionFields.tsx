import { toast } from "sonner";

const STARTER_CHIPS = [
  {
    label: "+ Agenda",
    snippet:
      "\n\n### 🗓️ Agenda & Schedule\n• 6:00 PM – Doors open & arrivals\n• 6:45 PM – Main session & announcements\n• 7:30 PM – Networking & refreshments\n",
  },
  {
    label: "+ What to Bring",
    snippet: "\n\n### 🎒 What to Bring\n• Valid photo ID\n• Digital ticket pass on your phone\n• Good vibes!\n",
  },
  {
    label: "+ Food & Drinks",
    snippet:
      "\n\n### 🍸 Food & Refreshments\n• Curated drinks & canapés available\n• Vegetarian & gluten-free options provided\n",
  },
  {
    label: "+ Getting There",
    snippet:
      "\n\n### 🚗 Getting There & Parking\n• Short 3-minute walk from the station\n• Street and venue parking bays available\n",
  },
  {
    label: "+ Dress Code",
    snippet: "\n\n### 👗 Dress Code\n• Smart casual / festive\n",
  },
];

export function EventDescriptionFields({
  description,
  placeholder,
  onDescription,
}: {
  description: string;
  placeholder: string;
  onDescription: (v: string) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-medium text-mute mr-1">Insert Starter:</span>
        {STARTER_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => {
              onDescription(description ? `${description.trim()}${chip.snippet}` : chip.snippet.trim());
              toast.success(`Appended ${chip.label.replace("+ ", "")} section`);
            }}
            className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink border border-line hover:border-brand hover:text-accent transition active:scale-95 shadow-2xs cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <textarea
        value={description}
        maxLength={1000}
        rows={4}
        onChange={(e) => onDescription(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-line bg-paper p-3.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand focus:border-brand placeholder:text-mute/60 resize-none leading-relaxed"
      />
    </>
  );
}
