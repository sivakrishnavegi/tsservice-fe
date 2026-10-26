# TS Service

A personal iOS app with two independent modules:

- **Office** — check in and out, start and end breaks, or enter times by hand. See time worked (breaks excluded),
  time left, and when you can leave. Shift as fixed hours (9:30 AM – 6:30 PM) or hours per day (8 h 30 min).
  Week and month history with a balance against your target, leave and holiday days, and reminders.
- **Tiffin** — breakfast, lunch and dinner marked Received, Missed or Leave, with a remark and a photo.
  Month history and counts. Choose which meals you take and on which days.

Each module has its own screens, settings, storage and reminders, and neither imports the other.
App-level Settings only turns modules on or off, sets Face ID lock and appearance.

Built with Expo SDK 58 (React Native 0.88), Expo Router native tabs and native stack toolbars,
SQLite on the device, TanStack Query, Reanimated 4 and SF Symbols. Designed to Apple's Human Interface Guidelines
— see [docs/DESIGN.md](docs/DESIGN.md).

## Run it

Needs Xcode (for the iOS Simulator) or an iPhone with a development build.

```bash
npm install
npx expo run:ios          # builds and opens in the iOS Simulator
```

On your iPhone without Xcode: `npx eas-cli build --profile development --platform ios`, install it, then `npx expo start`.
This app uses native modules (SQLite, date pickers, segmented control, Face ID), so Expo Go is not enough.

## Scripts

```bash
npm test          # Vitest: office time maths, transitions, validation; tiffin stats
npm run typecheck
npx eslint .
```

## Project layout

```
src/
  app/                      routes (Expo Router)
    (tabs)/office/          Office home, History
    (tabs)/tiffin/          Tiffin home, History
    (tabs)/settings/        App settings
    office-day/[date].tsx   sheet: check-in, breaks, check-out, day type
    office-settings.tsx     sheet
    tiffin-meal/[date]/[meal].tsx  sheet: status, remark, photo
    tiffin-settings.tsx     sheet
  modules/
    office/                 types, time.ts (pure maths), transitions.ts, validation.ts,
                            repository.ts (storage boundary), queries.ts, reminders.ts, components/
    tiffin/                 types, stats.ts, meal-log.ts, repository.ts, photos.ts, queries.ts, reminders.ts, components/
  core/                     dates, SQLite migrations + settings store, theme, motion, UI kit, lock screen
```

### How Office works it out

- **Worked** = (check-out, or now) − check-in − breaks. A running break pauses work.
- **Left** = target − worked. The target is hours per day, or the fixed window minus your planned break.
- **Leave at** = now + time left, plus whatever is left of your planned lunch break (if you turned that on).
  Every break you take pushes it later.
- A past day with no check-out counts nothing until you fix it, rather than inventing hours.

### Storage

Everything is stored on the iPhone in SQLite (`tsservice.db`); photos go in the app's documents folder.
Each module talks only to its `repository.ts` interface, so a backend (e.g. MongoDB + S3) can replace the
on-device implementation later without touching screens.
