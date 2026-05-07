const express = require("express");
const router = express.Router();

const {
    createCollection,
    getScenesByCollection,
    getAllCollectionsWithScenes,
    getCollection,
    updateCollection,
    deleteCollection,
} = require("../controllers/collectionController");

const upload = require("../middleware/collectionUpload");

// GET ALL COLLECTIONS (must come BEFORE /:collectionId)
router.get("/", getAllCollectionsWithScenes);

// CREATE COLLECTION
router.post(
    "/",
    ...upload.single("thumbnail"),
    createCollection
);

// GET SCENES BY COLLECTION
router.get("/:collectionId", getScenesByCollection);


// GET SINGLE COLLECTION
router.get("/:collectionId/details", getCollection);

// GET SCENES BY COLLECTION
router.get("/:collectionId", getScenesByCollection);

// UPDATE COLLECTION
router.put(
    "/:collectionId",
    ...upload.single("thumbnail"),
    updateCollection
);

// DELETE COLLECTION
router.delete("/:collectionId", deleteCollection);


module.exports = router;
