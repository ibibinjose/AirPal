/**
 * Quick-start templates for the Add to Personal Schedule form.
 * One tap prefills a sensible title, start time, duration, and venue hint —
 * the user still edits anything before saving. UI-free so both the /me
 * Today flow and /calendar share the same presets.
 */

export interface ScheduleTemplate {
  id: "coffee" | "dinner" | "workout" | "meeting" | "nightout";
  label: string;
  title: string;
  /** Default start time (HH:MM, 24h). */
  time: string;
  durationMinutes: number;
  venueHint: string;
}

export const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    id: "coffee",
    label: "Coffee",
    title: "Coffee catch-up",
    time: "10:00",
    durationMinutes: 45,
    venueHint: "Local café",
  },
  {
    id: "dinner",
    label: "Dinner",
    title: "Dinner",
    time: "19:00",
    durationMinutes: 90,
    venueHint: "Restaurant",
  },
  {
    id: "workout",
    label: "Workout",
    title: "Workout",
    time: "07:00",
    durationMinutes: 60,
    venueHint: "Gym or park",
  },
  {
    id: "meeting",
    label: "Meeting",
    title: "Meeting",
    time: "14:00",
    durationMinutes: 30,
    venueHint: "Office or video link",
  },
  {
    id: "nightout",
    label: "Night out",
    title: "Night out",
    time: "20:00",
    durationMinutes: 180,
    venueHint: "Venue",
  },
];

export function getScheduleTemplate(id: string): ScheduleTemplate | undefined {
  return SCHEDULE_TEMPLATES.find((t) => t.id === id);
}
