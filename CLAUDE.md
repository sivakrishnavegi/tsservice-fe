@AGENTS.md

# TS Service — project instructions

Personal iOS app (Expo SDK 58, Expo Router, TypeScript) with two **independent** modules: Office and Tiffin.

- `src/modules/office` and `src/modules/tiffin` must never import each other. Shared code goes in `src/core`.
- Business rules are pure functions with tests (`time.ts`, `transitions.ts`, `validation.ts`, `stats.ts`, `meal-log.ts`).
  Screens call hooks in `queries.ts`; hooks call `repository.ts`. Don't put maths or SQL in components.
- Times are ISO instants; calendar days are `YYYY-MM-DD` keys in the device timezone (`core/dates.ts`).
- Follow `docs/DESIGN.md`: Apple HIG, native controls, module tints, theme tokens from `core/theme` — no raw hex in screens
  except white on tinted fills.
- Migrations in `core/db/migrations.ts` are append-only.
- Before finishing: `npm test`, `npm run typecheck`, `npx eslint .`.
