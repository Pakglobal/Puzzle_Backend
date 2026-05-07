const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadmiddleware");

const {
    createScene,
    getScenesForGame,
    updateScene,
    deleteScene,
    getSceneById,
} = require("../controllers/scene-controller");

const sceneFields = upload.fields([
    { name: "originalImage", maxCount: 1 },
    { name: "finalLottie", maxCount: 1 },
    { name: "previewImage", maxCount: 1 },
    { name: "levelImages", maxCount: 20 },
    { name: "objectImages", maxCount: 50 },
]);

// CREATE SCENE (auth removed for now — add back when admin panel login is ready)
router.post("/:collectionId", ...sceneFields, createScene);

// GET ALL SCENES FOR GAME — public
router.get("/game/all", getScenesForGame);

// UPDATE SCENE — admin only
router.patch(
    "/:sceneId",
    ...sceneFields,
    updateScene
);

// DELETE SCENE — admin only
router.delete("/:sceneId", deleteScene);


// GET SINGLE SCENE BY ID — public/admin
router.get("/:sceneId", getSceneById);


// UPDATE SCENE — admin only
router.patch(
    "/:sceneId",
    ...sceneFields,
    updateScene
);

module.exports = router;
