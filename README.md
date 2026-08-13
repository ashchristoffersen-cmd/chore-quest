# Chore Quest 🏆

A phone/tablet-friendly chore game for two kids: tick chores off, get confetti and sound,
earn money into a vault, unlock trophies, and chase savings goals. Installable as a home-screen
app and works offline.

## Features

- **Today screen** — big emoji chore buttons per kid, tap to complete (tap again to undo), progress ring, streak counter.
- **Bonus Blitz** — weekend-only extra jobs worth more money (bathrooms, windows, pool fence...).
- **Celebrations** — confetti + synthesised sound effects on every tick, bigger ones for bonuses and trophies.
- **Vault** — running balance per kid, savings-goal progress bar, day-by-day history you can expand to see exactly which chores were done and when, plus PIN-protected add/withdraw.
- **Trophies** — 35+ badges across streaks, perfect days/weeks/months, Bonus Blitz, money milestones, plus shared **Teamwork** trophies (both kids finish everything → each gets a bonus).
- **Parent zone** — PIN-locked. Edit chores, amounts, which weekdays each chore runs, add today-only jobs, edit kid names/avatars/colours/goals, bonus amounts, day-reset hour, date override, sounds, and optional weekly vault interest.

## Running locally

```bash
npm install
npm run dev
```

## Sync between phones (optional)

Without configuration the app is local-only: each device keeps its own data in the browser.
To share one family dataset across both parents' phones, point it at a Supabase project:

1. Create a free project at https://supabase.com.
2. Run this in the SQL editor:

   ```sql
   create table app_state (
     id text primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );
   alter table app_state enable row level security;
   create policy "family access" on app_state for all using (true) with check (true);
   ```

3. Copy `.env.example` to `.env` and fill in the project URL and anon key.

Sync is last-write-wins on `updatedAt`, pulled on load/focus and every 15s, pushed ~1s after a change.

> The RLS policy above is open to anyone holding the anon key. It's fine for a family chore
> app on a URL nobody else knows; swap in Supabase Auth if you want it locked down properly.

## Deploying

Any static host works. For GitHub Pages, build with the repo name as the base path:

```bash
VITE_BASE_PATH=/chore-quest/ npm run build
```

## Scripts

- `npm run dev` — dev server
- `npm run build` — typecheck + production build
- `npm run lint` — oxlint
