const cron = require("node-cron");
const { multiCastNotification } = require("../controllers/notification-controller");

const initCronJobs = () => {
  console.log("[Cron Service] Initializing automated notification schedules...");

  // Timezone options for India Standard Time (IST) since user time is +05:30
  const cronOptions = {
    scheduled: true,
    timezone: "Asia/Kolkata"
  };

  // 🌅 Morning Notification (8:30 AM)
  cron.schedule("30 8 * * *", async () => {
    console.log("[Cron Service] Triggering Morning Notification at 9:40 AM");
    try {
      await multiCastNotification(
        "Start Your Day with a Puzzle",
        "Wake up your mind! Solve a beautiful jigsaw and feel refreshed."
      );
    } catch (error) {
      console.error("[Cron Service] Morning notification error:", error.message);
    }
  }, cronOptions);

  // ☀️ Afternoon Notification (1:00 PM)
  cron.schedule("0 13 * * *", async () => {
    console.log("[Cron Service] Triggering Afternoon Notification at 1:00 PM");
    try {
      await multiCastNotification(
        "Take a Break, Play a Puzzle",
        "Stuck in the routine? Relax with a quick jigsaw challenge now!"
      );
    } catch (error) {
      console.error("[Cron Service] Afternoon notification error:", error.message);
    }
  }, cronOptions);

  // 🌙 Evening Notification (8:00 PM)
  cron.schedule("0 20 * * *", async () => {
    console.log("[Cron Service] Triggering Evening Notification at 8:00 PM");
    try {
      await multiCastNotification(
        "Unwind with Art Puzzles",
        "End your day peacefully—complete a stunning puzzle tonight."
      );
    } catch (error) {
      console.error("[Cron Service] Evening notification error:", error.message);
    }
  }, cronOptions);

  console.log("[Cron Service] All jobs scheduled successfully with Asia/Kolkata timezone.");
};

module.exports = initCronJobs;
