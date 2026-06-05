import { createApp } from "./app.js";
import { config } from "./lib/config.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

try {
  await prisma.$connect();
  console.log("Database connected");
} catch (err) {
  console.error("Failed to connect to the database:", err.message);
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`FitVerse API listening on http://localhost:${config.port}`);
});
