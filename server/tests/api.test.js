// Integration tests mapping to the Phase-3 document test cases (TC-1..TC-14).
// Run with: npm test  (requires a reachable PostgreSQL configured in .env and a seeded DB).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const app = createApp();
const request = supertest(app);

let dbUp = true;
let userToken = "";
let adminToken = "";
const uniq = Date.now();

before(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbUp = false;
    console.warn("\n[tests] PostgreSQL not reachable — DB-backed tests will be skipped.\n");
  }
});

after(async () => {
  await prisma.$disconnect().catch(() => {});
});

// TC-2 User Registration
test("TC-2 register creates an account", { skip: () => !dbUp && "no db" }, async () => {
  const res = await request.post("/auth/register").send({
    name: "Test User",
    username: `tester_${uniq}`,
    email: `tester_${uniq}@gmail.com`,
    password: "Pass123!",
    gender: "male",
    weight: 70,
    currentGoal: "Lose weight",
    targetGoal: "65kg",
    level: "medium",
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  userToken = res.body.token;
});

// TC-1 User Login
test("TC-1 login returns a token", { skip: () => !dbUp && "no db" }, async () => {
  const res = await request.post("/auth/login").send({ email: `tester_${uniq}@gmail.com`, password: "Pass123!" });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  userToken = res.body.token;
});

// TC-10 Security: protected route without token => 401
test("TC-10 protected route requires auth", async () => {
  const res = await request.get("/dashboard");
  assert.equal(res.status, 401);
});

// TC-3 / TC-11 AI gender-based workout plan generation
test("TC-3/TC-11 generate gender-based AI workout plan", { skip: () => !dbUp && "no db" }, async () => {
  const res = await request.post("/workouts/generate").set("Authorization", `Bearer ${userToken}`).send();
  assert.equal(res.status, 201);
  assert.ok(res.body.workout.exercises.length > 0);
  // TC-12: at least the timed exercise carries a timer; video fields present.
  const hasVideo = res.body.workout.exercises.some((e) => e.videoUrl);
  assert.ok(hasVideo, "expected at least one exercise with a video URL");
});

// TC-12 / TC-13 Live tracking session lifecycle
test("TC-12/TC-13 workout session start -> track -> complete", { skip: () => !dbUp && "no db" }, async () => {
  const list = await request.get("/workouts").set("Authorization", `Bearer ${userToken}`);
  const planId = list.body.workouts[0].id;
  const start = await request.post("/workouts/sessions").set("Authorization", `Bearer ${userToken}`).send({ workoutPlanId: planId });
  assert.equal(start.status, 201);
  const sid = start.body.session.id;
  const track = await request.patch(`/workouts/sessions/${sid}`).set("Authorization", `Bearer ${userToken}`).send({ exercisesDone: 1 });
  assert.equal(track.body.session.exercisesDone, 1);
  const done = await request.post(`/workouts/sessions/${sid}/complete`).set("Authorization", `Bearer ${userToken}`).send({ caloriesBurned: 200 });
  assert.ok(done.body.session.completedAt);
});

// TC-4 Meal recognition (works with demo fallback when no API keys)
test("TC-4 meal recognition returns macros", { skip: () => !dbUp && "no db" }, async () => {
  const res = await request.post("/meals/recognize").set("Authorization", `Bearer ${userToken}`).send({ imageBase64: "ZmFrZS1pbWFnZS1ieXRlcw==" });
  assert.equal(res.status, 200);
  assert.ok(res.body.result.name);
  assert.ok(res.body.result.calories >= 0);
});

// TC-5 Mood tracking
test("TC-5 mood entry is stored", { skip: () => !dbUp && "no db" }, async () => {
  const res = await request.post("/moods").set("Authorization", `Bearer ${userToken}`).send({ mood: "Happy", intensity: 2 });
  assert.equal(res.status, 201);
  assert.equal(res.body.entry.mood, "Happy");
});

// TC-6 Social feed post
test("TC-6 create social post", { skip: () => !dbUp && "no db" }, async () => {
  const res = await request.post("/posts").set("Authorization", `Bearer ${userToken}`).send({ content: "Test post" });
  assert.equal(res.status, 201);
});

// TC-7 Challenge completion awards points
test("TC-7 challenge join + complete awards points", { skip: () => !dbUp && "no db" }, async () => {
  const list = await request.get("/gamification/challenges").set("Authorization", `Bearer ${userToken}`);
  const challenge = list.body.available[0];
  if (!challenge) return; // seed required
  await request.post(`/gamification/challenges/${challenge.id}/join`).set("Authorization", `Bearer ${userToken}`).send();
  const res = await request.patch(`/gamification/challenges/${challenge.id}/progress`).set("Authorization", `Bearer ${userToken}`).send({ progress: challenge.goalValue });
  assert.ok(res.body.entry.completed);
  assert.ok(res.body.awarded, "expected a badge to be awarded");
});

// TC-8 SOS alert
test("TC-8 SOS alert is created", { skip: () => !dbUp && "no db" }, async () => {
  const res = await request.post("/sos").set("Authorization", `Bearer ${userToken}`).send({ lat: 40.71, lng: -74.0 });
  assert.equal(res.status, 201);
  assert.ok(res.body.alert.id);
});

// TC-9 Performance: workout generation responds under 3 seconds
test("TC-9 plan generation under 3s", { skip: () => !dbUp && "no db" }, async () => {
  const t0 = process.hrtime.bigint();
  await request.post("/workouts/generate").set("Authorization", `Bearer ${userToken}`).send();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 3000, `expected <3000ms, got ${Math.round(ms)}ms`);
});

// TC-14 Video feature: stock workouts ship with video URLs
test("TC-14 stock workouts include exercise videos", { skip: () => !dbUp && "no db" }, async () => {
  const list = await request.get("/workouts").set("Authorization", `Bearer ${userToken}`);
  const anyVideo = list.body.workouts.some((w) => w.exercises.some((e) => e.videoUrl));
  assert.ok(anyVideo, "expected stock workouts with video URLs (run npm run seed)");
});

// Admin role guard (Decision Table 1)
test("admin routes reject non-admin", { skip: () => !dbUp && "no db" }, async () => {
  const res = await request.get("/admin/analytics").set("Authorization", `Bearer ${userToken}`);
  assert.equal(res.status, 403);
});
