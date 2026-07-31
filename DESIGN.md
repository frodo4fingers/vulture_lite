# Vulture Lite design system

## Visual world

Vulture Lite feels like a quiet observatory for the workday: warm paper,
forest ink, one precise instrument, and small signal colors that change only
when attention is useful. It is neither clinical wellness software nor a
productivity game.

The signature composition is a large circular time instrument paired with a
compact vertical flight plan. The vulture mark is abstract and watchful rather
than literal or ominous.

## Voice

- Calm, concise, and permissive.
- Prefer “A small reset is due” over “You have been sitting too long.”
- Prefer “Drink if you would like” over intake targets.
- Prefer “Done for now” over gamified completion language.
- State browser limitations plainly and close to notification controls.

## Color

Light:

- Canvas: `#f2f0e8`
- Surface: `#fbfaf5`
- Raised surface: `#ffffff`
- Ink: `#1d2924`
- Muted ink: `#647169`
- Line: `#d8ddd5`
- Forest: `#285848`
- Forest strong: `#173c31`
- Near: `#c4872f`
- Due: `#c85d49`
- Eye: `#527b91`
- Paused: `#7c827d`

Dark mode keeps the same semantic hierarchy with deep green-charcoal surfaces,
warm off-white text, and desaturated signal colors.

Color never carries status alone; every signal has text and an icon or shape.

## Typography

Use local system fonts only. Headings use a soft editorial serif stack to make
the product feel considered; controls and data use a highly legible UI sans
stack. The countdown uses tabular numerals.

- Display: `Iowan Old Style`, `Palatino Linotype`, `Book Antiqua`, Georgia
- UI: `Inter`, `Avenir Next`, `Segoe UI`, Helvetica, Arial, sans-serif
- Data: the UI stack with `font-variant-numeric: tabular-nums`

## Geometry and spacing

- Content width: 1180px.
- Primary radius: 24px; compact controls: 12px.
- Use rounded containers selectively. Lists and evidence use lines and spacing
  rather than putting every item in a card.
- Minimum interactive target: 44px.
- Spacing follows an 8px base with deliberate 12px and 20px intermediate
  values.

## Components

- **Time instrument:** large SVG progress ring, next activity, countdown, and
  two actions. It is the dominant object on the page.
- **Flight plan:** ordered reminder channels with a semantic marker, next due
  time, interval, and enabled state.
- **Local day note:** a small textual summary and recent moments, without
  streaks, scores, goals, or shame.
- **Quick moments:** six immediate choices cover eye rest, position change,
  walking, water, guided movement, and tea or coffee.
- **Side sheet:** settings and evidence use native dialogs styled as calm
  sheets. Forms save automatically or with one clear close action.
- **Break stage:** a focused dialog that turns a due reminder into a short,
  readable sequence with start, done, snooze, and skip actions.
- **Toast:** reserved for persistence errors, browser limitations, and quiet
  confirmations.

## Motion

- Progress updates continuously without decorative orbiting or bouncing.
- A near-due state breathes once every few seconds; due state uses a restrained
  border pulse.
- Dialogs translate by no more than 12px.
- All nonessential motion is removed for `prefers-reduced-motion`.

## Responsive behavior

- Desktop uses a two-column instrument/plan layout.
- Desktop keeps the day trace and quick actions visible in a compact support
  row rather than removing them to save height.
- Tall desktop viewports cap the instrument and flight-plan row so additional
  space benefits the day trace and quick actions below.
- Tablet and mobile preserve the same information hierarchy in one column,
  use edge-to-edge sheets, and provide a sticky quick-break action.
- Common laptop viewports fit the full working composition without page
  scrolling; narrow screens scroll naturally so no content is discarded.
- No horizontal scrolling at 320px.

## Accessibility

- Semantic landmarks, native buttons and inputs, explicit labels, and a skip
  link.
- Visible focus treatment with at least 3:1 contrast.
- Polite live-region updates; countdown seconds are not announced.
- Dialog focus is contained by the native `<dialog>` element.
- Exercise steps remain available as text; no instruction depends on animation.
- Dark mode and forced-colors remain usable.

## Absolute exclusions

- No surveillance visual language, body scoring, red health warnings, or
  medical claims.
- No streaks, rings that imply a daily quota, confetti, badges, or leaderboards.
- No glassmorphism, neon, generic blue SaaS gradients, or stock wellness
  photography.
- No external font or icon dependency.
