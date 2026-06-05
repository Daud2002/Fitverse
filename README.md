# FitVerse — AI-Powered Fitness, Nutrition & Social Wellness Platform

Full-stack implementation of the BSCS FYP (Group F25CS163) Design & Test Specification.

- **`server/`** — Node.js + Express + PostgreSQL (Prisma) API. 11 modules.
- **`apps/mobile/`** — React Native (Expo) app. Bottom tabs: Home / Workout / Food / Social / Goals.
- **`apps/admin/`** — Next.js admin panel (users, workout plans, meals, challenges, moderation, SOS log, analytics).

## Features (maps to the document)

- **Auth & profile** — registration captures name, username, email, password, **gender, weight, current goal, target, level**.
- **AI workout coaching** — `POST /workouts/generate` builds a **gender-based** plan from the profile (LLM when `OPENAI_API_KEY` is set, deterministic rule-based otherwise). Honors Phase-2 feedback: gender-based exercises, per-exercise **timer**, **live tracking** sessions, and exercise **video** playback.
- **Nutrition** — **Snap-to-Track**: meal photo → vision model + USDA FoodData Central macros (demo fallback when keys absent).
- **Mental wellness** — mood tracking with suggestions.
- **Social** — feed with posts, likes, comments.
- **Gamification** — challenges (active/available), points, badges, global leaderboard.
- **Emergency SOS** — alert with Google Maps reverse-geocode + Twilio SMS to emergency contacts (records alert + confirmation UI even without keys).

## Prerequisites

- Node.js 18+ (tested on 24)
- PostgreSQL running locally

## 1. Backend

```bash
cd server
cp .env.example .env            # then set DATABASE_URL to your Postgres
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev                     # http://localhost:4000
```

Seeded logins (password `Pass123!`):
- Admin: `admin@fitverse.com`
- User:  `abdul.daim@gmail.com`

Optional API keys in `.env` enable real AI/SMS/Maps; without them the app uses realistic demo output so every flow still works.

## 2. Mobile app

```bash
cd apps/mobile
npm install
npm run start                   # press w for web, or scan QR in Expo Go
```

> Android emulator: the API base auto-rewrites `localhost` → `10.0.2.2`.
> Physical device: set `extra.apiUrl` in `app.json` to your machine's LAN IP.

## 3. Admin panel

```bash
cd apps/admin
npm install
npm run dev                     # http://localhost:3000  (log in as admin@fitverse.com)
```

## Verification (Test Cases TC-1…TC-14)

```bash
cd server
npm test
```

The suite (`tests/api.test.js`) covers: login (TC-1), registration (TC-2), AI gender-based plan
(TC-3/TC-11), live session + timer (TC-12/TC-13), meal recognition (TC-4), mood (TC-5), social
post (TC-6), challenge completion + points (TC-7), SOS (TC-8), performance <3s (TC-9), security 401
(TC-10), exercise videos (TC-14), and the admin role guard. Tests auto-skip if Postgres is
unreachable; run `npm run seed` first so the stock data they assert against exists.

## Project structure

```
Fitverse/
├── server/
│   ├── prisma/{schema.prisma,seed.js}
│   └── src/
│       ├── modules/{auth,profile,workout,nutrition,mood,social,gamification,sos,dashboard,admin}/
│       ├── ai/{planService,visionService,notifyService}.js
│       ├── middleware/{auth,validate,error}.js
│       └── lib/{prisma,config,jwt,http}.js
├── apps/mobile/   (expo-router app/)
└── apps/admin/    (Next.js app-router)
```
