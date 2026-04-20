# ARES-X — Integrated Adaptive Survey Ecosystem

**CS458 Software Verification & Validation — Project 2**

> A unified ecosystem combining a TDD-driven Web Architect for designing dynamic surveys with a native Mobile Client that renders them using recursive conditional logic.

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
│ (React/Vite) │   PUT/GET     │  (Node.js)    │   GET /surveys │ (Expo/RN)    │
└──────┬───────┘               └──────┬───────┘                └──────┬───────┘
       │                              │                               │
       └──────────────┬───────────────┘                               │
                      │                                               │
               ┌──────▼───────┐                                       │
               │ survey-core  │ ◄─────────────────────────────────────┘
               │ (shared lib) │   DAG · RCLR · GBCR
               └──────────────┘
```

## Project Structure

```
CS458-Project2/
├── packages/survey-core/     # Shared algorithms (DAG, RCLR, GBCR)
│   ├── src/                  # TypeScript source
│   └── tests/                # 13 unit tests (Vitest)
├── apps/
│   ├── api/                  # Fastify REST API (survey CRUD, sync)
│   ├── web-architect/        # React survey designer (TDD, 3 tests)
│   └── mobile/               # Expo/React Native app (P1 login + survey)
├── e2e/
│   ├── mobile-appium/        # 10 Appium test scenarios
│   └── sync-suite/           # Cross-platform sync conflict test
├── REPORT.md                 # Full project report with UML diagrams
└── package.json              # npm workspaces root
```

## Prerequisites

- **Node.js** ≥ 18 (tested with v20.18.0)
- **Android Studio** with an emulator (e.g. Pixel 7, API 34)
- **Expo Go** app installed on the emulator

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

**Terminal 3 — Mobile app (Expo):**
```bash
cd apps/mobile
npx expo start --android --clear
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

### Unit tests (16 total)

```bash
# All tests
npm test

# Survey-core only (13 tests: DAG, RCLR, GBCR)
npm run test:core

# Web Architect only (3 TDD tests)
npm run test:web
```

### Expected output

```
✓ tests/dag.test.ts (4)
✓ tests/rclr.test.ts (5)
✓ tests/gbcr.test.ts (4)
✓ architectReducer.test.ts (3)

Test Files  4 passed (4)
     Tests  16 passed (16)
```

## Key Algorithms

| Algorithm | Purpose | Location |
|---|---|---|
| **DAG Validation** | Prevents cycles in survey graph | `packages/survey-core/src/dag.ts` |
| **RCLR** | Computes visible questions based on answers | `packages/survey-core/src/rclr.ts` |
| **GBCR** | Handles mid-session schema conflicts | `packages/survey-core/src/gbcr.ts` |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | API server port |
| `VITE_API_URL` | `/api` | Web architect API base |
| `EXPO_PUBLIC_API_URL` | `http://10.0.2.2:4000` | Mobile API URL (Android emulator) |

## License

This project is developed for CS458 coursework at Bilkent University.
