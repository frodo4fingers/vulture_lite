# Vulture Lite

Vulture Lite is a private, installless break reminder for managed work
computers. Keep the GitHub Pages tab open and it quietly reminds you to move,
look away, drink water, step out for tea or coffee, or follow a conservative
desk-side movement.

**Live app:** <https://frodo4fingers.github.io/vulture_lite/>

## What it does

- Four independent, configurable reminder channels: eye comfort, movement,
  water, and a longer reset.
- Browser notifications, an updating document title, and a color-changing
  favicon.
- Nearby reminders are bundled into one interruption.
- Pause, snooze, skip, quiet work hours, optional chime, and manual quick
  breaks.
- A small local-only daily history without accounts, analytics, streaks, or
  health scoring.
- A sourced movement library with seated and standing options.
- Light, dark, reduced-motion, keyboard, and screen-reader support.
- Offline reuse after the first successful load.

All settings and history stay in `localStorage` in the current browser. The app
has no backend, camera, microphone, cookies, account, or third-party runtime
dependency.

## Important browser limitation

Vulture Lite can notify reliably while its page remains open, including behind
other tabs when the browser allows notifications. A static GitHub Pages site
cannot schedule guaranteed notifications after every Vulture Lite tab and
browser window has been fully closed.

Pinning the tab is the intended operating model. If the page is reopened after
a long gap, the schedule restarts cleanly instead of releasing a backlog of
missed alerts.

## Scientific scope

The app promotes task variation, light movement, and voluntary screen breaks.
Its defaults are product choices rather than universal medical thresholds.
Evidence is strongest for replacing some prolonged sitting with activity and
for short breaks reducing fatigue; exact timing, eye-break schedules, hydration
needs, and long-term health effects vary.

See [EVIDENCE.md](EVIDENCE.md) for the claim boundary and source ledger.

Vulture Lite is not a medical device. Guided movements are general information
for adults who can exercise safely and are not diagnosis, treatment,
rehabilitation, or injury-prevention advice.

## Run locally

No build is required:

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173>.

Run the dependency-free checks with:

```bash
npm test
```

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Accessible application shell and dialogs |
| `styles.css` | Responsive visual system |
| `app.js` | Persistence, UI, reminders, notifications, and break flows |
| `scheduler.js` | Pure scheduling helpers |
| `content.js` | Reminder and exercise content |
| `sw.js` | Offline cache and notification-click handling |
| `PRODUCT.md` | Product decisions and boundaries |
| `DESIGN.md` | Durable visual and interaction direction |

## License

MIT
