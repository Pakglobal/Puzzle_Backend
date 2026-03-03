const express = require("express");
const router = express.Router();

const {
    createCollection,
    getScenesByCollection,
    getAllCollectionsWithScenes
} = require("../controllers/collectionController");
const upload = require("../middleware/collectionUpload");

router.post(
    "/",
    upload.single("thumbnail"),
    createCollection
);

router.get(
    "/:collectionId",
    getScenesByCollection
);

router.get(
    "/",
    getAllCollectionsWithScenes
);


module.exports = router;
