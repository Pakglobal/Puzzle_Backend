const admin = require("firebase-admin");

let serviceAccount;

try {
  // Try to load from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("[Firebase Config] Found FIREBASE_SERVICE_ACCOUNT env var. Parsing...");
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("[Firebase Config] Service account parsed successfully for Project ID:", serviceAccount.project_id);
  } else {
    console.warn("[Firebase Config] FIREBASE_SERVICE_ACCOUNT environment variable not found. Push notifications will not work.");
  }
} catch (error) {
  console.error("[Firebase Config] Error parsing FIREBASE_SERVICE_ACCOUNT:", error.message);
}

if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://puzzle-game-6c4b2-default-rtdb.firebaseio.com"
    });
    console.log("[Firebase Config] Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("[Firebase Config] Error initializing Firebase Admin SDK:", error.message);
  }
}

module.exports = admin;
