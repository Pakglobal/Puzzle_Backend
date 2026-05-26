const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification-controller");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/send", authMiddleware, notificationController.sendNotification);

// External cron trigger — called by cron-job.org at scheduled times

router.get("/broadcast-trigger", notificationController.cronTriggerNotification);

module.exports = router;
