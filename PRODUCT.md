# Vulture Lite

Vulture Lite is a calm, private break-reminder web app for people who work at
managed computers and cannot install desktop software. It runs as a static
GitHub Pages site, needs no account, and stores its settings and daily history
only in the current browser.

## Product promise

Keep one lightweight tab open and Vulture Lite will quietly hold the rhythm of
the workday: move, look away, drink, and occasionally take a longer reset.

It is a behavioral reminder, not a medical device. It does not diagnose,
monitor posture, prescribe hydration, or claim that one exact break schedule is
optimal for everyone.

## Audience

- Knowledge workers on organization-managed Windows, macOS, or Linux devices.
- People who cannot install software or grant camera access.
- People who want useful reminders without surveillance, accounts, streaks, or
  a wellness dashboard that becomes another job.

## Core experience

1. A first visit offers a conservative balanced rhythm:
   - eye comfort every 20 minutes for 20 seconds;
   - movement every 30 minutes for 2 minutes;
   - water every 60 minutes;
   - a longer walk, drink, or guided movement every 90 minutes.
2. The user can change every interval, duration, activity mix, workday, and
   notification preference.
3. The main view shows one clear next nudge, the rest of the plan, and a
   pressure-free local summary of moments taken today.
4. Nearby reminders are combined so the app does not interrupt twice.
5. A due moment can be started, completed, snoozed, or skipped. Nothing blocks
   work.
6. The favicon and document title show calm, approaching, due, paused, and
   off-hours states.

## Product principles

- **Private by construction.** No backend, camera, microphone, account,
  analytics, advertising, or cross-device identity.
- **Honest reliability.** Browser notifications require permission and the
  page to remain open. A GitHub Pages app cannot promise scheduled reminders
  after every tab and browser window is closed.
- **Gentle agency.** Short frequent changes are offered, never enforced.
  Snoozing and skipping are normal actions, not failures.
- **Evidence-proportional language.** Promote movement and task variation
  without turning short-term findings into disease-prevention claims.
- **Low interruption cost.** Combine reminders, respect quiet hours, recover
  cleanly after a closed tab, and never release a backlog of alerts.
- **Installless first.** The pinned browser tab is the primary product. Offline
  caching and optional browser installation are conveniences, not requirements.

## Reminder channels

| Channel | Default | Purpose |
| --- | --- | --- |
| Eye comfort | 20 seconds every 20 minutes | Look into the distance, blink fully, or gently close the eyes |
| Move | 2 minutes every 30 minutes | Stand, change position, walk, or use a conservative guided movement |
| Water | Every 60 minutes | A neutral prompt to drink if wanted; no fixed intake target |
| Longer reset | 5 minutes every 90 minutes | Step away, walk, make tea or coffee, or choose a movement |

The defaults are product choices, not universal clinical thresholds.

## Scientific foundation

- WHO recommends limiting sedentary time and replacing it with physical
  activity of any intensity, without prescribing one exact interruption
  interval.
- HSE recommends short, frequent breaks or changes of activity and says timing
  depends on the work; its example is 5–10 minutes each hour.
- OSHA suggests a five-minute break from computer tasks each hour, including
  looking away, stretching, standing, or walking.
- Controlled trials and meta-analyses support favorable acute glucose and
  insulin responses when prolonged sitting is interrupted with activity.
  Light walking generally has stronger acute evidence than standing alone.
  Long-term clinical outcomes and an optimal universal cadence remain
  uncertain.
- A 2022 micro-break meta-analysis found improved vigor and reduced fatigue on
  average. Performance effects varied with task and break duration.
- The 20-20-20 eye rule is widely recommended by optometric guidance, but the
  exact schedule is not established as a treatment. A small controlled study
  found no significant benefit from scheduled 20-second breaks during a
  40-minute task.
- Workplace exercise may help discomfort, but heterogeneous studies and risk
  of bias do not support prevention or treatment claims for individual
  movements.

## Safety boundary

Guided movements are general information for adults who can exercise safely.
Use stable support and a clear floor area, move within a comfortable range, and
stop for pain, severe discomfort, dizziness, chest discomfort, unusual
breathlessness, numbness, or loss of balance. People with an injury, recent
surgery, significant balance impairment, or another condition affecting
exercise should ask a qualified clinician which movements are suitable.

## Technical constraints

- Static HTML, CSS, and JavaScript deployable to GitHub Pages.
- No runtime dependency on third-party CDNs, fonts, APIs, or cookies.
- Local persistence through `localStorage`.
- Wall-clock due times so background-tab throttling does not corrupt the
  schedule.
- Service worker for offline reuse and notification click handling.
- One-tab notification leadership to avoid duplicate alerts.
- Keyboard, screen-reader, reduced-motion, light, and dark-mode support.

## Success criteria

- A first-time user can begin a balanced plan in under one minute.
- The next reminder and browser reliability state are always understandable.
- Settings survive reloads and no personal data leaves the browser.
- The app remains useful with notifications denied.
- Desktop and mobile layouts remain calm, legible, and fully operable.
