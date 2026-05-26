const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification-controller");
const authMiddleware = require("../middleware/authMiddleware");

// Audit log every request hitting this router (detects ghost callers)
router.use(notificationController.logIncomingRequest);

router.post("/send", authMiddleware, notificationController.sendNotification);

// External cron trigger — called by cron-job.org at scheduled times
router.get("/broadcast-trigger", notificationController.cronTriggerNotification);

// Single-device test — sends to ONE token only, never broadcasts
// Body: { token, title, message } | Header: x-cron-secret
router.post("/test-device", notificationController.testSingleDevice);

module.exports = router;

