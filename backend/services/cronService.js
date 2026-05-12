"use strict";

const cron = require("node-cron");
const { multiCastNotification } = require("../controllers/notification-controller");

// ─────────────────────────────────────────────────────────────────────────────
// Health tracker – lets us see if jobs are running from logs
// ─────────────────────────────────────────────────────────────────────────────
const health = {
  morning: { attempts: 0, lastSuccess: null, lastError: null },
  afternoon: { attempts: 0, lastSuccess: null, lastError: null },
  evening: { attempts: 0, lastSuccess: null, lastError: null },
};

/**
 * Safely run a notification with retry logic.
 * - 3 attempts with 30-second gaps before giving up for that day.
 * - Never throws upward so it cannot kill the cron scheduler.
 */
async function safeNotify(label, healthKey, title, body) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 30_000; // 30 seconds between retries
  const now = () => new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  health[healthKey].attempts += 1;

  console.log("\n" + "═".repeat(60));
  console.log(`[Cron] 🔔 TRIGGERED: ${label}`);
  console.log(`[Cron]    Time (IST): ${now()}`);
  console.log(`[Cron]    Title     : "${title}"`);
  console.log(`[Cron]    Body      : "${body}"`);
  console.log("═".repeat(60));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Cron] Attempt ${attempt}/${MAX_RETRIES} – sending notification...`);
      const result = await multiCastNotification(title, body);
      health[healthKey].lastSuccess = new Date().toISOString();
      health[healthKey].lastError = null;

      console.log("\n" + "✅".repeat(5));
      console.log(`[Cron] ✅ NOTIFICATION SENT SUCCESSFULLY`);
      console.log(`[Cron]    Devices total : ${result.total ?? 0}`);
      console.log(`[Cron]    Messages sent : ${result.sent ?? 0}`);
      console.log(`[Cron]    Failed        : ${result.failed ?? 0}`);
      console.log(`[Cron]    Time (IST)    : ${now()}`);
      console.log("✅".repeat(5) + "\n");
      return; // done – no need to retry
    } catch (err) {
      console.error("\n" + "❌".repeat(5));
      console.error(`[Cron] ❌ NOTIFICATION FAILED (attempt ${attempt}/${MAX_RETRIES})`);
      console.error(`[Cron]    Error: ${err.message}`);
      console.error("❌".repeat(5) + "\n");
      health[healthKey].lastError = err.message;

      if (attempt < MAX_RETRIES) {
        console.log(`[Cron] ⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  // All retries exhausted
  console.error(`[Cron] ❌ ALL ${MAX_RETRIES} ATTEMPTS FAILED for ${label}. Will retry at next scheduled time.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule definitions (all times in IST / Asia/Kolkata)
// ─────────────────────────────────────────────────────────────────────────────
const SCHEDULES = [
  {
    label: "Morning Notification (8:30 AM IST)",
    healthKey: "morning",
    expression: "30 8 * * *",
    title: "Start Your Day with a Puzzle",
    body: "Wake up your mind! Solve a beautiful jigsaw and feel refreshed.",
  },
  {
    label: "Afternoon Notification (1:00 PM IST)",
    healthKey: "afternoon",
    expression: "0 13 * * *",
    title: "Take a Break, Play a Puzzle",
    body: "Stuck in the routine? Relax with a quick jigsaw challenge now!",
  },
  {
    label: "Evening Notification (8:00 PM IST)",
    healthKey: "evening",
    expression: "27 17 * * *",
    title: "Unwind with Art Puzzles",
    body: "End your day peacefully—complete a stunning puzzle tonight.",
  },
];

const cronOptions = {
  scheduled: true,
  timezone: "Asia/Kolkata",
};

// ─────────────────────────────────────────────────────────────────────────────
// Keep references so we can destroy/restart if needed
// ─────────────────────────────────────────────────────────────────────────────
const scheduledTasks = [];

const initCronJobs = () => {
  console.log("[Cron] Initializing automated notification schedules (Asia/Kolkata)...");

  SCHEDULES.forEach(({ label, healthKey, expression, title, body }) => {
    // Validate cron expression before scheduling
    if (!cron.validate(expression)) {
      console.error(`[Cron] Invalid cron expression "${expression}" for ${label} – skipping.`);
      return;
    }

    const task = cron.schedule(
      expression,
      async () => {
        // Wrap in a top-level try/catch so an unhandled rejection can never
        // propagate outside the cron runner and kill the process.
        try {
          await safeNotify(label, healthKey, title, body);
        } catch (fatalErr) {
          // Should never reach here because safeNotify swallows errors,
          // but belts-and-suspenders protection.
          console.error(`[Cron] UNEXPECTED fatal error in ${label}:`, fatalErr.message);
        }
      },
      cronOptions
    );

    scheduledTasks.push(task);
    console.log(`[Cron] Scheduled: ${label} (${expression})`);
  });

  console.log(`[Cron] ${scheduledTasks.length}/${SCHEDULES.length} jobs active.`);

  // ── Health check log every hour so we can verify cron is alive in logs ──
  cron.schedule(
    "0 * * * *",
    () => {
      console.log("[Cron] Heartbeat – scheduler is alive. Health snapshot:", JSON.stringify(health));
    },
    cronOptions
  );
};

module.exports = { initCronJobs, getCronHealth: () => ({ ...health }) };
