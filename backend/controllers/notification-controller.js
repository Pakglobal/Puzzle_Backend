const admin = require("../config/firebase-admin");
const NOTIFICATION_POOL = require("../data/notification-messages.json");

const VALID_SLOTS = Object.keys(NOTIFICATION_POOL); // ["morning", "afternoon", "evening"]

// ─── Incoming request audit logger (helps detect unknown callers) ─────────────
exports.logIncomingRequest = (req, res, next) => {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  console.log(
    `[REQUEST] ${now} | Method: ${req.method} | Path: ${req.path}`
  );
  next();
};


const FCM_BATCH_SIZE = 500;

exports.multiCastNotification = async (title, message) => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin not initialized.");
  }

  const db = admin.database();
  const devicesRef = db.ref("devices");

  const snapshot = await Promise.race([
    devicesRef.once("value"),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firebase Database timeout (10s)")), 10000)
    ),
  ]);

  const devicesData = snapshot.val();
  let tokens = [];

  if (devicesData) {
    Object.keys(devicesData).forEach((deviceId) => {
      const device = devicesData[deviceId];
      if (device.token) tokens.push(device.token);
    });
  }

  // Deduplicate tokens
  tokens = [...new Set(tokens)];

  if (tokens.length === 0) {
    return { success: true, total: 0, sent: 0, failed: 0 };
  }

  // ─── Chunk into ≤500-token batches (FCM hard limit) ──────────────────────
  const batches = [];
  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    batches.push(tokens.slice(i, i + FCM_BATCH_SIZE));
  }

  const basePayload = {
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
  };

  // Send all batches in parallel and collect responses
  const batchResults = await Promise.all(
    batches.map((batchTokens) =>
      admin.messaging().sendEachForMulticast({ ...basePayload, tokens: batchTokens })
    )
  );

  // ─── Merge results + collect stale tokens across all batches ─────────────
  let totalSent = 0;
  let totalFailed = 0;
  const tokensToRemove = [];

  batchResults.forEach((response, batchIdx) => {
    totalSent += response.successCount;
    totalFailed += response.failureCount;

    if (response.failureCount > 0) {
      const batchTokens = batches[batchIdx];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const errorCode = res.error?.code;
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token"
          ) {
            tokensToRemove.push(batchTokens[idx]);
          }
        }
      });
    }
  });

  // Cleanup invalid tokens from Firebase RTDB
  if (tokensToRemove.length > 0 && devicesData) {
    const removePromises = [];
    Object.keys(devicesData).forEach((deviceId) => {
      if (tokensToRemove.includes(devicesData[deviceId].token)) {
        removePromises.push(db.ref(`devices/${deviceId}`).remove());
      }
    });
    await Promise.all(removePromises);
    console.log(`[Cleanup] Removed ${removePromises.length} stale device token(s).`);
  }

  return {
    success: true,
    total: tokens.length,
    batches: batches.length,
    sent: totalSent,
    failed: totalFailed,
  };
};

// ─── Manual send (admin use only) ────────────────────────────────────────────
exports.sendNotification = async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }

  try {
    const result = await exports.multiCastNotification(title, message);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to send notification", detail: error.message });
  }
};

// ─── Random message picker ────────────────────────────────────────────────────
function getRandomMessage(slot) {
  const pool = NOTIFICATION_POOL[slot];
  if (!pool || pool.length === 0) {
    throw new Error(`No messages found for slot: ${slot}`);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

exports.getRandomMessage = getRandomMessage;

// ─── External cron trigger (called by cron-job.org) ──────────────────────────
exports.cronTriggerNotification = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers["x-cron-secret"];

  if (!cronSecret || providedSecret !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { slot } = req.query;
  if (!slot || !VALID_SLOTS.includes(slot)) {
    return res.status(400).json({ error: `Invalid slot. Use: ${VALID_SLOTS.join(", ")}` });
  }

  try {
    // ✅ Inside try so message-pool errors are caught and returned properly
    const { title, body } = getRandomMessage(slot);
    const result = await exports.multiCastNotification(title, body);
    const now = new Date();
    const date = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    const time = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });

    console.log(`[Notification] Date: ${date} | Time: ${time} | Slot: ${slot} | Title: "${title}" | Body: "${body}"`);
    console.log(`[Delivery]     Total: ${result.total} | Sent: ${result.sent} | Failed: ${result.failed}`);

    res.status(200).json({ success: true, slot, ...result });
  } catch (error) {
    console.error(`[Notification ERROR] ${new Date().toISOString()} | Slot: ${slot} | ${error.message}`);
    res.status(500).json({ error: "Failed to send notification", detail: error.message });
  }
};

