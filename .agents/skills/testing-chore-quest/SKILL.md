---
name: testing-chore-quest
description: How to run and end-to-end test the Chore Quest local-first PWA (chores, bonuses, trophies, Vault, Parent zone), including money-math reconciliation traps, date-override tricks, and UI input quirks that make naive testing produce wrong values.
---

# Testing Chore Quest

Vite + React 19 + TS local-first PWA. Two kids (Remy 🦁, Amelie 🦄). Four bottom tabs:
Chores, Vault, Trophies, Parent.

## Running it

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd <repo>
npm install
npm run dev -- --port 5173 --host
```

- No backend, no `.env` needed — Supabase sync is disabled without one.
- State lives entirely in localStorage key `chore-quest-state-v1`.
- Parent PIN default: `1234`.
- If port 5173 is taken, Vite silently shifts to 5174 — always confirm the actual URL from
  the dev-server output before driving the browser.

## Resetting state between tests

Use the UI: Parent → Unlock (1234) → Settings → "Reset everything". Prefer this over clearing
localStorage by hand so the app rehydrates its defaults correctly.

## Default money math (worth memorising)

- 6 daily chores per kid × `$0.50`
- perfect-day ("all chores done") bonus: `$1.00` → a kid's perfect day = `$4.00`
- teamwork bonus when BOTH kids finish the same date: `$1.00` each
- perfect-week bonus: `$5.00`
- Weekend "Bonus Blitz" jobs (`$1.00`–`$2.50`) only exist on Sat/Sun dates.

Reducing a kid to ONE daily chore (delete the other 5 in Parent → Chores) makes multi-day
math trivial to verify: 7 days = 7×$0.50 + 7×$1.00 + $5.00 = **$15.50**.

## High-risk area: derived bonuses and reconciliation

Bonuses are *derived* transactions, recomputed by a reconcile pass. Test these adversarially:

- Tick/untick repeatedly and assert the balance returns to the exact prior value (no drift,
  no orphan history rows).
- Unticking one chore of a perfect day must claw back the `$1.00` bonus AND re-lock the
  Perfect Day trophy; re-ticking must restore the exact amount and re-unlock it.
- The teamwork bonus is symmetric: unticking ONE of kid B's chores must also remove kid A's
  `$1.00` teamwork bonus, and Team Trophy (Trophies → "🤝 Team" tab) must re-lock.
- Parent → Settings → "Recheck trophies" is the manual reconcile trigger. Press it while a
  date override points at an EARLIER day of a completed week and confirm the perfect-week
  bonus is not deleted. Press it 2–3 more times to prove idempotence (no duplicate rows).
- Known trap: **adding a daily chore does not automatically reconcile already-derived
  bonuses** — previously awarded perfect-day/teamwork money can go stale until you press
  "Recheck trophies". If balances look wrong right after editing chore config, try a recheck
  before reporting a money bug.

## Date override (how to reach specific weekdays)

Parent → Settings → "Date override" (native `<input type="date">`), and "Back to today".

The date input is a segmented control — typing a plain ISO string mangles it. Reliable
recipe: click the input, press `Left` three times to land on the month segment, then type the
8 digits `MMDDYYYY` (e.g. `08152026` → 2026-08-15).

Gotchas:
- The Parent zone **relocks every time you switch tabs**; re-enter the PIN each visit.
- Possible defect: the Chores heading can still read "Today" while an override is active
  (`TodayView` passes the override date as both args to `formatDay`). Chore availability,
  weekend banner, history grouping and balances DO follow the override, so verify behaviour
  by those rather than by the heading.

## UI input quirks that cause false failures

- Money inputs (chore amount, goal amount) are controlled and re-parse on **every
  keystroke**, so typing `40` yields `4.00` and `40.00` yields `4.00`. Workaround: type `4`,
  then place the caret after it (`Home`, `Right`) and type `0` to get `40.00`. Report this as
  a usability issue rather than working around it silently.
- The PIN keypad modal grows when "Wrong PIN, try again" appears, shifting every key ~23px
  down. Re-screenshot and recompute coordinates after a wrong-PIN attempt, and click keys one
  at a time with short waits.

## Vault checks

- Expanding a date row in History reveals a "Chores done" list (chore names + completion
  times) and a "Money" list (per-chore rows, bonus rows, manual `➕`/`➖` rows).
- Both "➕ Add money" and "➖ Take out" must show the PIN gate BEFORE any amount form.
  Verify a wrong PIN (`1111`) shows "Wrong PIN, try again" and never opens the amount form.
- Savings-goal percent: with a blank/zero goal target it must render `0%`, never `NaN%`.

## Responsive testing

Chrome enforces a physical window minimum around ~532px, so `wmctrl`/`xdotool` cannot reach a
400px phone width. Use browser zoom to obtain a ~400 CSS-px viewport instead, and confirm
geometry via the console (`innerWidth`, `documentElement.scrollWidth` for horizontal overflow,
chore row and tab bar heights ≥44px). Note the zoom workaround in the report.

## Devin Secrets Needed

None — the app is fully local-first.
