const admin = require("../config/firebase-admin");

/**
 * Reusable function to send notifications to all registered tokens
 * @param {string} title - The notification title
 * @param {string} message - The notification body
 * @returns {Object} - Result summary
 */
exports.multiCastNotification = async (title, message) => {
  console.log(`[Notification Engine] Starting multicast: "${title}"`);
  
  if (!admin.apps.length) {
    console.error("[Notification Engine] Firebase Admin not initialized.");
    throw new Error("Firebase Admin not initialized.");
  }

  // Fetch all devices from Firebase Realtime Database with a timeout
  const db = admin.database();
  const devicesRef = db.ref("devices");
  
  console.log("[Notification Engine] Fetching device tokens from RTDB...");
  
  try {
    // 10-second timeout for database fetch
    const snapshot = await Promise.race([
      devicesRef.once("value"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Database timeout (10s)")), 10000))
    ]);

    const devicesData = snapshot.val();
    let tokens = [];
    if (devicesData) {
      Object.keys(devicesData).forEach((deviceId) => {
        const device = devicesData[deviceId];
        if (device.token) {
          tokens.push(device.token);
        }
      });
    }

    console.log(`[Notification Engine] Found ${tokens.length} tokens.`);

    if (tokens.length === 0) {
      console.log("[Notification Engine] No registered tokens found. Skipping send.");
      return { success: true, count: 0, message: "No registered tokens found." };
    }

    const payload = {
      notification: { title, body: message },
      data: { title, body: message, click_action: "FLUTTER_NOTIFICATION_CLICK" },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "high_importance_channel",
          priority: "high",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: { sound: "default", badge: 1, contentAvailable: true },
        },
      },
      tokens: tokens,
    };

    console.log("[Notification Engine] Sending messages via Firebase Cloud Messaging...");
    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`[Notification Engine] FCM Result -> Sent: ${response.successCount}, Failed: ${response.failureCount}`);

    // Cleanup invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const errorCode = res.error.code;
          if (errorCode === "messaging/registration-token-not-registered" || errorCode === "messaging/invalid-registration-token") {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        console.log(`[Notification Engine] Cleaning up ${tokensToRemove.length} invalid tokens...`);
        const removePromises = [];
        Object.keys(devicesData).forEach((deviceId) => {
          if (tokensToRemove.includes(devicesData[deviceId].token)) {
            removePromises.push(db.ref(`devices/${deviceId}`).remove());
          }
        });
        await Promise.all(removePromises);
        console.log("[Notification Engine] Token cleanup completed.");
      }
    }

    return {
      success: true,
      total: tokens.length,
      sent: response.successCount,
      failed: response.failureCount,
      tokens: tokens
    };
  } catch (error) {
    console.error("[Notification Engine] Critical Error:", error.message);
    throw error;
  }
};

exports.sendNotification = async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }

  try {
    const result = await exports.multiCastNotification(title, message);
    res.status(200).json(result);
  } catch (error) {
    console.error("[Notification Engine API] Error in sendNotification:", error.message);
    res.status(500).json({ error: "Failed to send notification", detail: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Pre-defined notification messages for each time slot
// ─────────────────────────────────────────────────────────────────────────────
const NOTIFICATION_SLOTS = {
  morning: {
    title: "Start Your Day with a Puzzle",
    body: "Wake up your mind! Solve a beautiful jigsaw and feel refreshed.",
  },
  afternoon: {
    title: "Take a Break, Play a Puzzle",
    body: "Stuck in the routine? Relax with a quick jigsaw challenge now!",
  },
  evening: {
    title: "Unwind with Art Puzzles",
    body: "End your day peacefully—complete a stunning puzzle tonight.",
  },
};

/**
 * External cron trigger endpoint — called by cron-job.org
 * GET /api/notifications/cron-trigger?slot=morning|afternoon|evening
 * Header: x-cron-secret: <CRON_SECRET>
 */
exports.cronTriggerNotification = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;

  // 1. Validate secret
  const providedSecret = req.headers["x-cron-secret"];
  if (!cronSecret || providedSecret !== cronSecret) {
    console.warn("[Cron Trigger] ❌ Unauthorized request – invalid or missing secret.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 2. Validate slot
  const { slot } = req.query;
  if (!slot || !NOTIFICATION_SLOTS[slot]) {
    return res.status(400).json({
      error: "Invalid slot. Use: morning, afternoon, or evening",
    });
  }

  const { title, body } = NOTIFICATION_SLOTS[slot];
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  console.log("\n" + "═".repeat(60));
  console.log(`[Cron Trigger] 🔔 EXTERNAL TRIGGER: ${slot}`);
  console.log(`[Cron Trigger]    Time (IST): ${now}`);
  console.log(`[Cron Trigger]    Title     : "${title}"`);
  console.log("═".repeat(60));

  try {
    const result = await exports.multiCastNotification(title, body);
    console.log(`[Cron Trigger] ✅ SUCCESS – Sent: ${result.sent ?? 0}, Failed: ${result.failed ?? 0}`);
    res.status(200).json({ success: true, slot, ...result });
  } catch (error) {
    console.error(`[Cron Trigger] ❌ FAILED: ${error.message}`);
    res.status(500).json({ error: "Failed to send notification", detail: error.message });
  }
};
