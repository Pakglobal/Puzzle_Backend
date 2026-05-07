const admin = require("firebase-admin");

let serviceAccount;

try {
  // Try to load from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT environment variable not found. Push notifications will not work.");
  }
} catch (error) {
  console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", error.message);
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://puzzle-game-6c4b2-default-rtdb.firebaseio.com"
  });
  console.log("Firebase Admin initialized successfully.");
}

module.exports = admin;
