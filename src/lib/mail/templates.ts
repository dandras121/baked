// The e-mail templates by name (§8.1). Each turns its data into subject, preheader and blocks; layout.ts frames it.
// Slice 5.1 has the layout sample only; the e-mails themselves arrive with 5.2–5.4.
import type { Email } from "./layout";

type Template = (data: Record<string, unknown>) => Email;

/** Every block of the frame, with the drawn e-mail 2 sample text (1128:9160), to check the layout against Figma. */
const sample: Template = () => ({
  subject: "Your cake is being made this week",
  preheader: "Last chance to change anything — Thursday",
  blocks: [
    { kind: "heading", text: "Your cake is next" },
    {
      kind: "para",
      text: "I start on your cake later this week. The time slot is confirmed — if anything has changed at your end, tell me by Thursday.",
    },
    {
      kind: "rows",
      rows: [
        ["Date", "Saturday 12 September"],
        ["Delivery", "9am – 12pm"],
        ["To", "48 Preston Road, EH49 6HH"],
        ["Allergies noted", "No nuts"],
      ],
    },
    {
      kind: "steps",
      steps: [
        { label: "Booked", date: "31 August", done: true },
        { label: "In the kitchen", date: "11 September", done: true },
        { label: "With you", date: "12 September, 9am – 12pm", done: false },
        { label: "Delivered", done: false },
      ],
    },
    {
      kind: "notice",
      icon: "clock",
      title: "What happens now",
      text: "I bake and decorate over the next few days. After Thursday the design is fixed.",
    },
    {
      kind: "button",
      label: "Change something",
      href: "https://bakedbylinda.co.uk/my-order/sample",
    },
  ],
});

export const TEMPLATES: Record<string, Template> = { sample };
