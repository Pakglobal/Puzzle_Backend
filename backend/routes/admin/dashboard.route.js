const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const Collection = require("../../models/collectionModel");
const Scene = require("../../models/sceneModel");

// Dashboard Stats endpoint
router.get("/stats", async (req, res, next) => {
    try {
        const [userCount, collectionCount, sceneCount] = await Promise.all([
            User.countDocuments({ role: "user" }),
            Collection.countDocuments(),
            Scene.countDocuments()
        ]);

        res.status(200).json({
            success: true,
            data: {
                users: userCount,
                collections: collectionCount,
                scenes: sceneCount,
                notifications: 0 // Placeholder
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
