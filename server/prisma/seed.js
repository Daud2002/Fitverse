import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const VID = {
  hiit: "https://www.youtube.com/watch?v=ml6cT4AZdqI",
  yoga: "https://www.youtube.com/watch?v=v7AYKMP6rOE",
  run: "https://www.youtube.com/watch?v=kVnyY17VS9Y",
  strength: "https://www.youtube.com/watch?v=oAPCPjnU1wA",
};

async function main() {
  console.log("Seeding FitVerse...");

  // Clear (dev only)
  await prisma.reward.deleteMany();
  await prisma.challengeParticipant.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.post.deleteMany();
  await prisma.sosAlert.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("Pass123!", 10);

  // Admin
  await prisma.user.create({
    data: {
      name: "Admin",
      username: "admin",
      email: "admin@fitverse.com",
      passwordHash: hash,
      role: "admin",
      gender: "other",
    },
  });

  // Demo user (matches prototype "Abdul Daim")
  const daim = await prisma.user.create({
    data: {
      name: "Abdul Daim",
      username: "abduldaim",
      email: "abdul.daim@gmail.com",
      passwordHash: hash,
      gender: "male",
      age: 22,
      height: 178,
      weight: 75,
      points: 1890,
      profile: { create: { currentGoal: "Build muscle", targetGoal: "80kg lean", level: "medium", activityLevel: "Active" } },
    },
  });

  // Leaderboard peers (prototype names)
  const peers = [
    { name: "Musa", username: "musa", email: "musa@fitverse.com", points: 2450 },
    { name: "Wasif", username: "wasif", email: "wasif@fitverse.com", points: 2380 },
    { name: "Hussnain", username: "hussnain", email: "hussnain@fitverse.com", points: 2310 },
    { name: "Ahmed", username: "ahmed", email: "ahmed@fitverse.com", points: 1820 },
  ];
  for (const p of peers) {
    await prisma.user.create({
      data: { ...p, passwordHash: hash, gender: "male", profile: { create: { level: "easy" } } },
    });
  }

  // Stock workout library (prototype workout list)
  const stock = [
    {
      name: "Full Body HIIT", category: "Cardio", durationMin: 30, caloriesEst: 350, level: "hard",
      exercises: [
        { name: "Jumping Jacks", sets: 3, reps: 30, videoUrl: VID.hiit },
        { name: "Push-ups", sets: 3, reps: 15, videoUrl: VID.strength },
        { name: "Squats", sets: 3, reps: 20, videoUrl: VID.strength },
        { name: "Burpees", sets: 3, reps: 10, videoUrl: VID.hiit },
        { name: "Plank", sets: 3, reps: 1, timerSeconds: 60, videoUrl: VID.hiit },
        { name: "Mountain Climbers", sets: 3, reps: 30, videoUrl: VID.hiit },
      ],
    },
    {
      name: "Yoga Flow", category: "Flexibility", durationMin: 45, caloriesEst: 180, level: "easy",
      exercises: [
        { name: "Sun Salutation", sets: 1, reps: 5, videoUrl: VID.yoga },
        { name: "Warrior Pose", sets: 1, reps: 1, timerSeconds: 60, videoUrl: VID.yoga },
        { name: "Tree Pose", sets: 1, reps: 1, timerSeconds: 45, videoUrl: VID.yoga },
      ],
    },
    {
      name: "Running Session", category: "Cardio", durationMin: 40, caloriesEst: 420, level: "medium",
      exercises: [{ name: "Outdoor Run", sets: 1, reps: 1, timerSeconds: 2400, videoUrl: VID.run }],
    },
    {
      name: "Strength Training", category: "Strength", durationMin: 50, caloriesEst: 300, level: "hard",
      exercises: [
        { name: "Bench Press", sets: 4, reps: 10, videoUrl: VID.strength },
        { name: "Deadlift", sets: 4, reps: 8, videoUrl: VID.strength },
        { name: "Bicep Curls", sets: 3, reps: 12, videoUrl: VID.strength },
      ],
    },
  ];
  for (const w of stock) {
    await prisma.workoutPlan.create({
      data: {
        name: w.name, category: w.category, durationMin: w.durationMin, caloriesEst: w.caloriesEst,
        level: w.level, isStock: true,
        exercises: { create: w.exercises.map((e, i) => ({ ...e, restSeconds: 30, order: i })) },
      },
    });
  }

  // Challenges (prototype)
  const challenges = [
    { title: "30-Day Workout Streak", description: "Complete a workout every day for 30 days", type: "personal", goalValue: 30, unit: "days", points: 500, durationDays: 30 },
    { title: "Team Challenge: 1000km", description: "Run 1000km as a team this month", type: "community", goalValue: 1000, unit: "km", points: 1000, durationDays: 30 },
    { title: "Burn 10,000 Calories", description: "Burn a total of 10,000 calories this week", type: "personal", goalValue: 10000, unit: "cal", points: 300, durationDays: 7 },
    { title: "Weekly Yoga Master", description: "Complete 5 yoga sessions this week", type: "personal", goalValue: 5, unit: "sessions", points: 200, durationDays: 7 },
    { title: "Community Steps Challenge", description: "Join 500+ members walking 100,000 steps", type: "community", goalValue: 100000, unit: "steps", points: 750, durationDays: 30 },
  ];
  const created = [];
  for (const c of challenges) created.push(await prisma.challenge.create({ data: c }));

  // Daim joins the first 3 with progress (prototype "Active (3)")
  await prisma.challengeParticipant.create({ data: { challengeId: created[0].id, userId: daim.id, progress: 15 } });
  await prisma.challengeParticipant.create({ data: { challengeId: created[1].id, userId: daim.id, progress: 642 } });
  await prisma.challengeParticipant.create({ data: { challengeId: created[2].id, userId: daim.id, progress: 6420 } });

  // Emergency contacts (prototype SOS confirmation)
  await prisma.emergencyContact.createMany({
    data: [
      { userId: daim.id, name: "Ahmed Mehmood", phoneNumber: "+92-309-6667777", relation: "Brother" },
      { userId: daim.id, name: "Hussnain", phoneNumber: "+92-324-5434312", relation: "Friend" },
    ],
  });

  // A couple of meals + a social post for demo
  await prisma.meal.createMany({
    data: [
      { userId: daim.id, name: "Scrambled Eggs", calories: 220, protein: 18, carbs: 2, fat: 15, mealType: "Breakfast" },
      { userId: daim.id, name: "Whole Wheat Toast", calories: 140, protein: 5, carbs: 26, fat: 2, mealType: "Breakfast" },
    ],
  });
  await prisma.post.create({
    data: { userId: daim.id, content: "Healthy lunch prep for the week! Meal planning is key to success." },
  });

  console.log("Seed complete. Login: admin@fitverse.com / abdul.daim@gmail.com — password Pass123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
