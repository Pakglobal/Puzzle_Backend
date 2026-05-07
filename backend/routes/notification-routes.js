const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification-controller");

router.post("/send", notificationController.sendNotification);

module.exports = router;
