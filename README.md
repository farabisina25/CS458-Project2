# ARES-X — Integrated Adaptive Survey Ecosystem

**CS458 Software Verification & Validation — Project 2**

> A unified ecosystem combining a TDD-driven Web Architect for designing dynamic surveys with a **native Flutter Mobile Client** that renders them using recursive conditional logic.

## Team

| Name | Bilkent ID |
|---|---|
| Maksat Abrayev | 22201182 |
| Hüseyin Utku Yüksel | 22103511 |
| Farabi Sina Sarı | 22102084 |
| Furkan Özek | 22103680 |

## Architecture

```
┌──────────────┐     HTTP      ┌──────────────┐     Polling     ┌──────────────┐
│ Web Architect │ ◄──────────► │  Fastify API  │ ◄────────────► │ Mobile Client │
│ (React/Vite) │   PUT/GET     │  (Node.js)    │   GET /surveys │   (Flutter)   │
└──────┬───────┘               └──────┬───────┘                └──────┬───────┘
       │                              │                               │
       ▼                              ▼                               ▼
  survey-core (TS)              survey-core (TS)              lib/core/ (Dart)
  DAG · RCLR · GBCR                                        DAG · RCLR · GBCR
```

## Project Structure

```
CS458-Project2/
├── packages/survey-core/     # Web-side algorithms (DAG, RCLR, GBCR) in TS
│   ├── src/                  # TypeScript source
│   └── tests/                # 13 unit tests (Vitest)
├── apps/
│   ├── api/                  # Fastify REST API (survey CRUD, sync)
│   ├── web-architect/        # React survey designer (TDD, 3 tests)
│   └── mobile/               # Flutter native mobile client (Android/iOS)
│       ├── lib/core/         # Dart port of DAG · RCLR · GBCR
│       ├── lib/ui/           # Login (from P1) + survey flow
│       └── test/             # 13 flutter_test cases
├── e2e/
│   ├── mobile-appium/        # 10 Appium test scenarios
│   └── sync-suite/           # Cross-platform sync conflict test
└── package.json              # npm workspaces root (web + api only)
```

## Prerequisites

- **Node.js** ≥ 18 (tested with v20.18.0) — for API + web architect
- **Flutter** ≥ 3.38 with Dart ≥ 3.10 — for the mobile client
- **Android Studio** with an emulator (e.g. Pixel 7, API 34) or a connected device

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Build the shared library

```bash
npm run build -w @ares/survey-core
```

### 3. Start all services

Open **3 terminals**:

**Terminal 1 — API server (port 4000):**
```bash
npm run dev:api
```

**Terminal 2 — Web Architect (port 5173):**
```bash
npm run dev:web
```

**Terminal 3 — Mobile app (Flutter):**
```bash
cd apps/mobile
flutter pub get
flutter run
```

To override the API base URL (e.g. a non-emulator device):
```bash
flutter run --dart-define=API_URL=http://<host-ip>:4000
```

### 4. Use the app

1. **Web Architect** → Open `http://localhost:5173`
   - Add/edit/remove questions
   - Link questions with edges (conditional logic)
   - Click **Publish** to push the survey live

2. **Mobile App** → Opens on the Android emulator
   - Log in with any credentials (demo mode)
   - Fill the survey — questions appear/hide based on your answers (RCLR)
   - The survey auto-updates within 2.5s when you publish changes on web (GBCR)

## Running Tests

### Unit tests

```bash
# Web + API side (TS, Vitest) — 16 tests (13 survey-core + 3 architect)
npm test

# Survey-core only (13 tests: DAG, RCLR, GBCR)
npm run test:core

# Web Architect only (3 TDD tests)
npm run test:web

# Mobile side (Dart, flutter_test) — 13 tests mirroring survey-core
cd apps/mobile && flutter test
```

### Expected output (mobile)

```
00:03 +13: All tests passed!
```

## Key Algorithms

| Algorithm | Purpose | TS (web) | Dart (mobile) |
|---|---|---|---|
| **DAG Validation** | Prevents cycles in survey graph | `packages/survey-core/src/dag.ts` | `apps/mobile/lib/core/dag.dart` |
| **RCLR** | Computes visible questions based on answers | `packages/survey-core/src/rclr.ts` | `apps/mobile/lib/core/rclr.dart` |
| **GBCR** | Handles mid-session schema conflicts | `packages/survey-core/src/gbcr.ts` | `apps/mobile/lib/core/gbcr.dart` |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | API server port |
| `VITE_API_URL` | `/api` | Web architect API base |
| `API_URL` (dart-define) | `http://10.0.2.2:4000` (Android) · `http://127.0.0.1:4000` (iOS) | Mobile API URL, override with `flutter run --dart-define=API_URL=...` |

## License

This project is developed for CS458 coursework at Bilkent University.
