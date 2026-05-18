const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification-controller");

router.post("/send", notificationController.sendNotification);

// External cron trigger — called by cron-job.org at scheduled times
router.get("/cron-trigger", notificationController.cronTriggerNotification);

module.exports = router;
