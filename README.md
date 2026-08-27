# PulseFit

A modern dark-themed fitness tracker for React Native + Expo. Log workouts, scan barcodes on supplements and food, and visualise your progress over time.

> Built for the Final Project (Coursework 2) of the Mobile Application Development module.

---

## Highlights

- **Workout tracking** — start a session, pick from a seed catalogue of 32 exercises (chest / back / shoulders / arms / legs / core / cardio / full-body), log sets with reps × weight or duration, and finish with notes. Sessions are persisted to a local SQLite database, so they survive app restarts.
- **Camera barcode scanner** — point the camera at any food or supplement barcode; PulseFit looks it up against the [Open Food Facts](https://world.openfoodfacts.org/) database, caches the nutrition data locally, and lets you add notes. Re-scanning the same barcode refreshes the cached row instead of creating a duplicate.
- **Progress analytics** — weekly summary cards (volume, sets, time, streak), a 7/30/90-day volume line chart, muscle-group balance bars, top-exercises leaderboard, and all-time personal records ranked by estimated 1RM (Epley formula).
- **Rest timer overlay** — every logged set kicks off a configurable rest countdown with a +15s extension button, haptic feedback, and a skip control.
- **Offline-first** — all data lives in on-device SQLite (`expo-sqlite`) and AsyncStorage. No account, no server, no analytics calls home.
- **Polished dark UI** — electric green (#00E676) on near-black (#0A0A0A), card-based layout, custom typography scale, smooth gradients, and consistent spacing tokens.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React Native 0.74 + Expo SDK 51 | Required by the brief; managed workflow keeps the build pipeline simple. |
| Language | TypeScript (strict) | Catches a class of bugs at compile time and makes the data layer self-documenting. |
| Navigation | Expo Router v3 (file-based) | Filesystem-mapped routes are easier to reason about than manual `Stack.Screen` lists. |
| State | Zustand | Minimal, hook-friendly, no boilerplate. Used for the active workout session. |
| Persistence | `expo-sqlite` (SQLite) + AsyncStorage | SQLite for relational data (workouts/sets/products); AsyncStorage for the small user-preferences blob. |
| Camera | `expo-camera` | Cross-platform barcode scanning (EAN-13, EAN-8, UPC-A, UPC-E, QR). |
| Charts | `react-native-chart-kit` + custom SVG-free bars | Line chart for volume trends; custom horizontal bars for muscle balance. |
| Testing | Jest + `jest-expo` + `@testing-library/react-native` | 150 unit + component tests, including an in-memory SQLite mock. |
| Linting | ESLint with `eslint-config-expo` | Enforces the same conventions Expo itself uses. |

---

## Project Structure

```
PulseFit/
├── app/                       # Expo Router screens (file-based routing)
│   ├── _layout.tsx            # Root layout: SafeArea, DB migration, Stack
│   ├── (tabs)/                # Tab navigator group
│   │   ├── _layout.tsx        # Tab bar configuration (5 tabs + floating Scan button)
│   │   ├── index.tsx          # Home dashboard
│   │   ├── workouts.tsx       # Past workouts list
│   │   ├── scan.tsx           # Camera barcode scanner
│   │   ├── progress.tsx       # Analytics charts
│   │   └── profile.tsx        # Settings + body-weight log
│   ├── workout/
│   │   ├── [id].tsx           # Workout detail / active session
│   │   └── new.tsx            # New workout modal
│   ├── exercise/[id].tsx      # Exercise detail + history + PR
│   └── scanned/[id].tsx       # Scanned product detail + notes
├── src/
│   ├── components/
│   │   ├── ui/                # Button, Card, Text, TextInput, Chip, StatCard,
│   │   │                      # EmptyState, SegmentedControl, ProgressBar
│   │   ├── workout/           # WorkoutCard, ExerciseRow, SetRow, RestTimerOverlay
│   │   ├── charts/            # VolumeChart, MuscleSplitChart, StreakCalendar
│   │   └── scan/              # ProductCard
│   ├── lib/
│   │   ├── db.ts              # SQLite schema + CRUD (exercises, workouts, sets,
│   │   │                      # body_weight, scanned_products)
│   │   ├── analytics.ts       # Aggregation queries (weekly summary, volume-by-day,
│   │   │                      # muscle split, PRs, top exercises)
│   │   ├── openfoodfacts.ts   # Barcode → product lookup via OFF API
│   │   ├── preferences.ts     # AsyncStorage-backed user prefs
│   │   └── utils.ts           # Pure formatting + arithmetic helpers
│   ├── hooks/                 # useActiveWorkout, useTimer, usePreferences,
│   │                          # useExercises, useWorkouts
│   ├── store/workoutStore.ts  # Zustand store for the active session
│   ├── constants/             # theme.ts (design tokens), exercises.ts (32 seed exercises)
│   ├── types/index.ts         # Domain types (Exercise, Workout, WorkoutSet, etc.)
│   └── test/inMemoryDb.ts     # In-memory SQLite mock for Jest
├── __tests__/                 # 11 test files, 150 tests
│   ├── lib/                   # utils, db, analytics, preferences, openfoodfacts
│   ├── components/            # Button, WorkoutCard, SetRow, SegmentedControl
│   └── hooks/                 # useTimer, workoutStore
├── __mocks__/                 # Stubs for expo-modules-core paths used by jest-expo
├── assets/images/             # App icon, splash, adaptive icon, favicon
├── app.json                   # Expo config
├── package.json               # Scripts + deps
├── tsconfig.json              # TS strict mode + path aliases (@/*, @components/*, ...)
├── babel.config.js            # babel-preset-expo
├── jest.setup.js              # Mocks for camera, haptics, sqlite, async-storage
└── .eslintrc.json             # ESLint config extending expo
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node 24)
- npm 9+ (or yarn / pnpm — adjust commands accordingly)
- Expo CLI (installed automatically as a dev dependency)
- For physical-device testing: the **Expo Go** app on your phone (iOS or Android)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/pulsefit.git
cd pulsefit

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. (Optional) verify everything compiles + tests pass
npx tsc --noEmit
npm test
```

> **Why `--legacy-peer-deps`?** Expo SDK 51 has a few peer-dependency conflicts with newer React 18.3+ packages (specifically `react-dom`). The `--legacy-peer-deps` flag tells npm to use the older resolution algorithm that ignores peer-dep mismatches. The installed versions are all known-good combinations shipped by Expo.

### Running the app

```bash
# Start the Expo dev server
npm start

# Then either:
#   - scan the QR code with the Expo Go app on your phone, OR
#   - press `i` in the terminal to open in the iOS simulator, OR
#   - press `a` to open in the Android emulator
```

The first launch seeds the local SQLite database with 32 exercises. You can start logging workouts immediately — no signup or internet connection required (the camera scanner does need internet to look up barcodes via Open Food Facts).

### Running tests

```bash
# Full test suite (150 tests, runs in ~2s)
npm test

# Watch mode for TDD
npm run test:watch

# Coverage report (writes to /coverage)
npm run test:coverage

# Type-check only
npm run typecheck

# Lint
npm run lint
```

### Building for app stores

To produce a standalone binary that can be submitted to the App Store or Play Store:

```bash
# Install EAS CLI (one-time)
npm install -g eas-cli

# Log in to your Expo account
eas login

# Configure the project (creates eas.json)
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

After the build completes, EAS gives you a downloadable `.ipa` (iOS) or `.aab` (Android) that you can upload to the respective store console.

---

## Key Features Walkthrough

### 1. Home Dashboard

The home screen is the user's daily landing page. It shows:
- A greeting header with the user's name and a flame streak badge.
- A large "Start Workout" CTA that turns into "Resume Workout" if a session is in progress.
- A 2×2 grid of weekly stats: workouts count, total volume, total sets, total time.
- A 7-day streak calendar showing which days had at least one workout.
- The 3 most recent workouts as tappable cards.

### 2. Active Workout

Tapping "Start Workout" opens a modal where the user can name the session (with quick templates like "Push Day" / "Pull Day" / "Leg Day"). Confirming navigates to the workout detail screen, which serves dual purpose:
- **Active mode** (workout.endedAt === null): shows a live set logger, exercise picker, rest timer, and a Finish button. Each set added kicks off the rest timer and updates the workout's aggregate stats (totalVolume, totalSets) in real time.
- **Read-only mode** (workout.endedAt !== null): shows the historical session with all sets grouped by exercise, plus notes.

### 3. Camera Scanner (Innovation Feature)

The Scan tab uses `expo-camera`'s `CameraView` to detect barcodes in real time. When a barcode is detected:
1. A medium haptic fires to confirm the scan.
2. The barcode is sent to the Open Food Facts API (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`).
3. The returned product (name, brand, image, calories, protein, carbs, fat, nutriscore, serving size) is cached in SQLite via `upsertScannedProduct`.
4. The user is navigated to the product detail screen where they can edit notes, refresh the data from OFF, or delete the scan.

If the barcode isn't in the OFF database, the scan is still cached with a placeholder name and an error note, so the user has a record of what they tried to scan.

### 4. Progress Analytics

The Progress tab has four sections, each driven by the analytics module:
- **Volume Over Time** — a line chart of total daily training volume, with a 7/30/90-day segmented control.
- **Muscle Group Balance** — horizontal bars showing the percentage of volume allocated to each category, colour-coded to match the exercise chips elsewhere in the app.
- **Top Exercises** — a leaderboard of the 5 exercises with the highest volume in the selected window.
- **Personal Records** — all-time best lifts ranked by estimated 1RM (using the Epley formula: `1RM = weight × (1 + reps/30)`).

### 5. Profile & Settings

The Profile tab exposes:
- The user's name (used in the home greeting) and preferred weight unit (kg / lb).
- A body-weight log with a quick-add input and a list of recent entries (long-press to delete).
- Toggles for haptic feedback and the default rest duration (60/90/120/180 seconds).
- A "Reset All Data" danger zone that drops all user data while keeping the seeded exercise catalogue.

---

## Testing Strategy

The test suite is split into three layers:

| Layer | What it covers | Tooling |
|---|---|---|
| **Unit tests** (`__tests__/lib/`) | Pure functions in `utils.ts`, the OFF API client (with `fetch` mocked), the preferences layer (with AsyncStorage mocked), and the full SQLite data layer. | Jest |
| **Hook tests** (`__tests__/hooks/`) | The `useTimer` countdown hook (with Jest fake timers) and the Zustand workout store (start / addSet / removeSet / finish lifecycle). | Jest + React Hooks Testing Library |
| **Component tests** (`__tests__/components/`) | Button (variants, disabled, loading), WorkoutCard, SetRow, SegmentedControl. | `@testing-library/react-native` |

### In-memory SQLite mock

`expo-sqlite` isn't available in the Jest environment. Rather than mocking individual queries (which wouldn't catch SQL syntax errors), `src/test/inMemoryDb.ts` implements a small SQL interpreter that handles the subset of SQL PulseFit's data layer uses:

- `CREATE TABLE IF NOT EXISTS` (parses columns and types)
- `INSERT INTO ... VALUES (?, ?, NULL, 0, ...)` (handles both `?` placeholders and inline literals)
- `SELECT ... FROM ... [alias] [JOIN ... ON ...] [WHERE ... AND/OR ...] [GROUP BY ...] [ORDER BY ...] [LIMIT ?]` (with support for multiple JOINs, alias-qualified columns, AND/OR in WHERE, aggregate functions like `SUM(s.reps * s.weight)`, and `strftime('%Y-%m-%d', col)` for date grouping)
- `UPDATE ... SET ... WHERE ...`
- `DELETE FROM ... WHERE ...`

If `db.ts` ever uses a SQL feature the mock doesn't support, the test fails immediately with a clear error like `Cannot parse SELECT: ...` — so the mock doubles as a regression guard.

---

## Data Model

```
exercises           workouts            workout_sets
───────────         ─────────           ────────────
id (PK)             id (PK)             id (PK)
name                name                workout_id (FK → workouts.id)
category            started_at          exercise_id (FK → exercises.id)
equipment           ended_at            set_index
is_rep_based        duration_sec        reps
muscle_groups       total_volume        weight
is_custom           total_sets          duration_sec
created_at          notes               is_pr
                                        completed_at

body_weight         scanned_products
───────────         ────────────────
id (PK)             id (PK)
weight              barcode (UNIQUE)
unit                name
measured_at         brand
note                image_url
                    calories_per_100g
                    protein_per_100g
                    carbs_per_100g
                    fat_per_100g
                    serving_size
                    serving_unit
                    nutriscore
                    scanned_at
                    notes
```

Indexes on `workout_sets.workout_id`, `workout_sets.exercise_id`, `workouts.started_at`, and `body_weight.measured_at` keep the analytics queries fast even with thousands of rows.

---

## Design Tokens

All colours, spacing, radii, typography, and shadows are defined once in `src/constants/theme.ts` and consumed everywhere via the `theme` object or direct named imports (`Colors`, `Spacing`, `Radii`, `Typography`, `Shadows`). This ensures visual consistency across screens and makes it trivial to re-skin the app (e.g. a light theme) by editing a single file.

| Token | Value | Usage |
|---|---|---|
| `Colors.primary` | `#00E676` (electric green) | Accent, CTAs, active tab icon, progress fills |
| `Colors.background` | `#0A0A0A` (near-black) | App background |
| `Colors.surface` | `#141414` | Cards, tab bar |
| `Colors.surfaceElevated` | `#1C1C1C` | Modals, inputs, elevated cards |
| `Colors.text` | `#FFFFFF` | Primary text |
| `Colors.textSecondary` | `#B8B8B8` | Captions, secondary text |
| `Colors.danger` | `#FF5252` | Delete buttons, error states |

---

## Roadmap / Future Work

- **Cloud sync** — currently all data is device-local. Adding optional encrypted cloud backup (via Expo's `expo-secure-store` + a Supabase/Firebase backend) would let users switch devices without losing history.
- **Workout templates** — let users save a routine as a reusable template (e.g. "My Push Day") and start a new session from it with one tap.
- **Exercise graphs on the exercise detail screen** — show a small sparkline of the user's estimated 1RM over time for each exercise.
- **iOS Apple Health / Android Health Connect integration** — sync body-weight entries and workouts to the OS-level health stores.
- **Custom exercise creation UI** — the database layer already supports custom exercises (`is_custom` flag), but the UI for adding them is not yet exposed.

---

## License

This project is submitted as coursework for the Mobile Application Development module. All code is original work. The seed exercise catalogue is generic fitness knowledge; product data shown in the scanner is sourced from the open Open Food Facts database under the [Open Database License](https://opendatacommons.org/licenses/odbl/).
