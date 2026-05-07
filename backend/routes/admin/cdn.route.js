const express = require("express");
const router = express.Router();
const { generateEverything, generateStoryJson, generateCollectionsJson } = require("../../services/cdnJson.service");

// ✅ Specific story generate karo
router.post("/generate-cdn-json/:sceneId", async (req, res, next) => {
    try {
        // Full regeneration is required because a single change 
        // can shift global indexes (level_XX.json) for all scenes.
        await generateEverything();
        res.status(200).json({ success: true, message: "All JSONs synchronized to prevent index shifts." });
    } catch (err) { next(err); }
});

// ✅ Full regenerate (emergency use only)
router.post("/generate-cdn-json", async (req, res, next) => {
  try {
    await generateEverything();
    res.status(200).json({ success: true, message: "All JSONs regenerated." });
  } catch (err) { next(err); }
});



module.exports = router;
