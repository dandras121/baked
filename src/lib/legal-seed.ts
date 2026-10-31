// The starting text of the seven legal pages (§4.5 Seed content): the Figma texts (664:4192, 664:4364, 664:4501,
// 664:4624, 666:4476, 666:4599, 666:4845), corrected by Appendix A.1 and §14.1 item 5, with every business value
// as a placeholder (§11.8). Linda revises them in the admin editor before launch (§14.1); each save is a new
// revision. Format: see src/lib/legal.ts.

export type LegalSeed = {
  slug: LegalSlug;
  title: string;
  intro: string;
  body: string;
};

export const LEGAL_SLUGS = [
  "terms",
  "privacy",
  "cookies",
  "delivery-and-collection",
  "cancellations",
  "accessibility",
  "allergens",
] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const LEGAL_SEED: LegalSeed[] = [
  {
    slug: "terms",
    title: "Terms and conditions",
    intro:
      "These terms apply to every cake ordered through this site. Nothing here takes away your rights under the Consumer Rights Act 2015.",
    body: `## Who I am
{trading_name} is the trading name of {legal_name}, a sole trader based in Scotland. The address for service and contact details are in the footer of every page.

## Ordering and confirmation
An order exists only once you have paid and received a confirmation email with an order number. Sending an enquiry, or starting checkout without finishing it, does not reserve a date. I take a limited number of cakes each week and dates are held on a first-paid basis.

## Prices and payment
Cakes are zero-rated for VAT under UK rules, so the price you see is the price you pay and there is no VAT to add. Ready-made designs are paid in full at checkout. Bespoke cakes are quoted individually by email; any deposit or balance we agree is paid through a secure payment link I send you. Card payments are handled by Stripe; your card details never reach this site.

## Changes and cancellation
Every cake is made to your specification and is perishable, so the fourteen-day right to cancel under the Consumer Contracts Regulations 2013 does not apply to these orders. In its place I give you my own terms, which are more generous. The size, message, date and delivery window can be changed online until 23:59 two days before your date. Cancellations made online by then are refunded in full more than seven days before your date, and half from seven days to two days before; after that, cancelling goes through me. None of this affects your statutory rights if a cake turns out to be faulty or not as described.

## Delivery and collection
I deliver across {delivery_area} within an agreed window, and delivery is {delivery_charge}. Someone needs to be in to receive the cake. If nobody is there, I will wait fifteen minutes and then take the cake back to my kitchen; you can collect it from {town} the same day at no charge, or I can try again the next day for {second_attempt_fee}. Collection is free from {town} at a time we agree.

## After the cake is handed over
Once the cake is in your hands, or set up at your venue, responsibility for it passes to you. Cakes are fragile. Keep them level, cool and out of direct sun, and do not put a fresh cake in the fridge unless I have told you to.

## Allergens and dietary requirements
My kitchen handles {kitchen_handles}. I can leave an ingredient out of a recipe, but I cannot guarantee a cake is free from traces, and I cannot describe a cake as free from any allergen. Allergen information for all fourteen regulated allergens is shown on each cake’s page before you order, and again in your confirmation email and on your order page.

## Design and decoration
Handmade work varies slightly from any sketch or photograph, and colours can shift between screen and buttercream. Some decorations contain wires, dowels, supports or non-edible items; these are pointed out on handover and must be removed before serving.

## Photographs
I photograph most cakes and may show them here or on social media. If you would rather I did not, tell me when you order and I will not.

## If something goes wrong
Tell me as soon as you can, ideally within 24 hours, and send a photograph — that helps me put it right, but it is not a deadline. Under the Consumer Rights Act 2015 you are entitled to a repair, replacement or refund where a cake is not as described or not of satisfactory quality, and you do not lose that right by getting in touch later. I aim to resolve complaints within five working days.

## Things outside my control
If illness, a kitchen failure or severe weather makes an order impossible, I will tell you as soon as I know and refund you in full. Beyond that refund my liability is limited to the price paid for the cake — except that nothing in these terms limits my liability for death or personal injury caused by my negligence, for fraud, or for anything else that cannot be limited by law.

## Governing law
These terms are governed by the law of Scotland. If you live elsewhere in the UK you keep the right to bring a claim in the courts where you live, and to rely on the consumer protections that apply there.`,
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    intro:
      "I collect as little as I can, use it only to make your cake happen, and never sell it. {trading_name} is the trading name of {legal_name}, {address}, {postcode} — I am the data controller for everything you send me.",
    body: `## What I collect
Your name, email, phone number, delivery address and the details of your order. Also anything you tell me about allergies or dietary needs — that counts as health information, so I treat it with extra care and use it only to make your cake safely.

## Why I collect it
To make and deliver your cake, to answer your questions, and to keep the records HMRC and food law require me to keep.

## My legal basis
Performing our contract for most of it, and legal obligation for the tax and food-safety records I am required to keep. Allergy and dietary information is health data, so for that I rely on your explicit consent — you give it with the tick box beside the allergy field, and you can withdraw it at any time. Consent also covers anything optional, such as the yearly reminder email.

## Who else sees it
Stripe processes payments and never passes me your full card number. My email provider stores our correspondence. [Analytics provider — to be confirmed before launch] counts page visits, but only if you agree to it. Some of these companies are based outside the UK, so your information may be transferred there, always under the safeguards UK data protection law requires. Nobody else sees it, and never an advertiser.

## How long I keep it
Order records for six years, because tax law requires it. Enquiries that go nowhere are deleted after twelve months. Marketing consent lasts until you withdraw it.

## Your rights
You can ask for a copy of what I hold, ask me to correct it or delete it, ask me to restrict how I use it, object to how I use it, or ask for it in a portable file. Where I rely on your consent you can take it back at any time, which stops any further use without undoing what was already done. Email me and I will answer within a month, free of charge.

## Complaining
If you are unhappy with how I handle your data, tell me first. If that does not settle it, the Information Commissioner’s Office can look into it — [ico.org.uk](https://ico.org.uk), or [0303 123 1113](tel:+443031231113).`,
  },
  {
    slug: "cookies",
    title: "Cookie policy",
    intro:
      "Two kinds: the ones that make the checkout work, and one that tells me which designs get looked at.",
    body: `## What a cookie is
A small file a site leaves on your device so it can remember something between pages — for instance, what is in your basket.

## Essential cookies
These keep the site working, so they do not need your consent:
- **bbl_session** keeps your order together through checkout. It lasts seven days and is renewed on each visit; the order draft itself is deleted after 24 hours without activity.
- **bbl_csrf** protects the forms against automated abuse and lasts 24 hours.
- **bbl_consent** remembers your cookie choice for twelve months.
- A cookie that lets you check your order’s status after confirming your email, for 24 hours, and one that remembers your most recent order on this device, for 24 hours.
- Stripe’s fraud-prevention cookies, on the payment pages only.

## Analytics
One cookie, set only if you agree, and it lasts twelve months. It tells me which designs people spend time on, so I know what to bake more of. It does not follow you to other sites and it is never shared with advertisers. Provider: [to be confirmed before launch].

## Marketing
None at all. I do not run ads and share nothing with advertisers, so there is no marketing category to switch off.

## Changing your mind {#changing-your-mind}
Use the [cookie preferences](#cookie-preferences) link in the footer of any page. Your choice is remembered for twelve months, and I will ask again after that. You can also clear cookies in your browser settings at any time.`,
  },
  {
    slug: "delivery-and-collection",
    title: "Delivery & collection",
    intro: "Across {delivery_area}, in a window we agree beforehand.",
    body: `## Where I deliver
{delivery_area}. Anything beyond that is collection only, or a courier for boxed single tiers.

## What it costs
Delivery is {delivery_charge} anywhere I deliver — {delivery_area} — including Sundays and public holidays. Beyond that area it is collection, or a courier for boxed single tiers.

## Windows
Morning between nine and twelve, afternoon between twelve and four, or evening between four and seven. You pick the window when you order and I text you on the morning itself with a tighter window.

## Who has to be there
Someone needs to be in. Cakes are perishable and fragile, so I will not leave one with a neighbour or on a doorstep.

## If nobody is in
I wait fifteen minutes, then bring the cake back to my kitchen. You can collect it from {town} the same day at no charge, or I can try again the next day for {second_attempt_fee} — though a cake is always best on the day it was made.

## Collection
Free, from {town}, at a time we agree. Bring a flat boot space and drive gently.

## Venue set-up
For tiered wedding cakes I set up on site. Tell me the access arrangements when you book — stairs, lifts and kitchen access all matter.`,
  },
  {
    slug: "cancellations",
    title: "Cancellations & refunds",
    intro:
      "Everything here sits alongside your statutory rights — it does not replace them.",
    body: `## The fourteen-day rule
Cakes are made to your specification and are perishable, so the fourteen-day right to cancel under the Consumer Contracts Regulations 2013 does not apply to these orders. Everything below is my own policy, and it sits alongside your statutory rights rather than replacing them.

## Changing the details
The size, message, date and delivery window can be changed online until 23:59 two days before your date. Changing the size changes the price; anything else is free.

## Cancelling
You can cancel online until the same time: more than seven days before your date, a full refund; from seven days to two days before, half. After that, cancelling goes through me. If your date moves, the refund counts from the earliest date your order has had — and if I move your date later without you asking, that never counts against you.

## If the cake is faulty
Under the Consumer Rights Act 2015 you are entitled to a repair, replacement or refund if a cake is not as described or not of satisfactory quality.

## How to claim
Tell me as soon as you can — ideally within 24 hours — and send a photograph. That is a request, not a deadline: your rights under the Consumer Rights Act 2015 do not depend on how quickly you get in touch. I aim to settle it within five working days, and refunds go back to the card you paid with.`,
  },
  {
    slug: "accessibility",
    title: "Accessibility statement",
    intro:
      "I want everyone to be able to order a cake, whatever they are using to browse.",
    body: `## What I am aiming for
WCAG 2.2 level AA. That covers colour contrast, keyboard navigation, text size and screen reader labelling.

## What works today
Text scales to 200 per cent without breaking the layout. Form fields carry proper labels, and every error message is tied to the field it belongs to. Most of the site can be used with a keyboard alone.

## Known problems
The date picker is the weak point. It works with a keyboard, but a screen reader does not always announce which dates are free, and I am fixing that. Until it is fixed, email or phone me and I will take the whole order that way at the same price. The small print in the footer is also smaller and fainter than it should be.

## Alternative formats
I can send the terms or allergen information in large print or plain text on request.

## Telling me about a problem
Email [{email}](mailto:{email}) and describe what happened, or phone [{phone}](tel:{phone}). I will reply within five working days. This statement was reviewed using keyboard-only testing, a screen reader and an automated contrast check.`,
  },
  {
    slug: "allergens",
    title: "Allergen information",
    intro:
      "I will always be straight with you about what is safe and what I cannot promise.",
    body: `## The fourteen allergens
Cereals containing gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, nuts, celery, mustard, sesame, sulphur dioxide, lupin and molluscs. Each cake’s page shows which of these it contains before you order, and they are in your confirmation email and on your order page too.

## What my kitchen handles
{kitchen_handles} are all in regular use. I work in one kitchen, so I cannot guarantee any cake is free from traces.

## What I can do
I can leave an ingredient out of a recipe, clean down thoroughly and use separate equipment. What I cannot do is call a cake gluten-free, nut-free or free from anything else — those words have a legal meaning I cannot stand behind in a kitchen that handles wheat and nuts every week. I will tell you honestly how much risk is left, so you can decide.

## Telling me
Put it in the allergy box when you order, or email before ordering if you would rather talk it through first.

## Your cake’s allergens
The allergens of the cake you order are shown before you pay, in your confirmation email, and on your order page, which every email links to.`,
  },
];
