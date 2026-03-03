const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware")
const adminMiddleware = require("../middleware/adminMiddleware")
const upload = require("../middleware/uploadmiddleware");

const {
    createScene,
    getScenesForGame,
    updateScene

} = require("../controllers/scene-controller");

// CREATE SCENE with images
router.post(
    "/:collectionId",
    upload.fields([
        { name: 'originalImage', maxCount: 1 },
        { name: 'finalLottie', maxCount: 1 },
        { name: 'previewImage', maxCount: 1 },
        { name: 'levelImages', maxCount: 20 },
        { name: 'objectImages', maxCount: 50 }
    ]),
    createScene
);


// GET SCENE
router.get("/game/all", getScenesForGame);

// // UPDATE SCENE
router.patch(
    "/:sceneId",
    upload.fields([
        { name: 'originalImage', maxCount: 1 },
        { name: 'finalLottie', maxCount: 1 },
        { name: 'previewImage', maxCount: 1 },
        { name: 'levelImages', maxCount: 20 },
        { name: 'objectImages', maxCount: 50 }
    ]),
    updateScene
);


module.exports = router;
