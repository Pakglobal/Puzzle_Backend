const admin = require("../config/firebase-admin");
const NOTIFICATION_POOL = require("../data/notification-messages.json");

const VALID_SLOTS = Object.keys(NOTIFICATION_POOL); // ["morning", "afternoon", "evening"]

// ─── Core multicast engine ────────────────────────────────────────────────────
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
    tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(payload);

  // Cleanup invalid tokens
  if (response.failureCount > 0) {
    const tokensToRemove = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const errorCode = res.error?.code;
        if (
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/invalid-registration-token"
        ) {
          tokensToRemove.push(tokens[idx]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      const removePromises = [];
      Object.keys(devicesData).forEach((deviceId) => {
        if (tokensToRemove.includes(devicesData[deviceId].token)) {
          removePromises.push(db.ref(`devices/${deviceId}`).remove());
        }
      });
      await Promise.all(removePromises);
    }
  }

  return {
    success: true,
    total: tokens.length,
    sent: response.successCount,
    failed: response.failureCount,
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

  const { title, body } = getRandomMessage(slot);

  try {
    const result = await exports.multiCastNotification(title, body);
    const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    console.log(
      `[Notification] ${time} | Slot: ${slot} | Title: "${title}" | Sent: ${result.sent}/${result.total}`
    );
    res.status(200).json({ success: true, slot, ...result });
  } catch (error) {
    res.status(500).json({ error: "Failed to send notification", detail: error.message });
  }
};
