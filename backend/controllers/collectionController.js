const Collection = require("../models/collectionModel");
const Scene = require("../models/sceneModel");
const { generateCollectionsJson } = require("../services/cdnJson.service");
const { deleteFromR2, getKeyFromUrl } = require("../services/r2");

// ─── URL helper ───────────────────────────────────────────────────────────────
const getBaseUrl = (req) =>
    process.env.BASE_URL?.replace(/\/$/, "") ||
    `${req.protocol}://${req.get("host")}`;

const makeUrl = (baseUrl, p) => {
    if (!p) return "";
    if (p.startsWith("http")) return p;
    return `${baseUrl}${p.startsWith("/") ? "" : "/"}${p}`;
};


// CREATE COLLECTION
exports.createCollection = async (req, res) => {
    try {
        const baseUrl = getBaseUrl(req);
        const { collectionName, description } = req.body;

        // R2 URL is attached by the upload middleware
        const thumbnailUrl = req.file?.r2Url || "";

        const collection = await Collection.create({
            collectionName,
            description,
            thumbnailUrl,
        });

        // ── CDN AUTO-UPDATE ───────────────────────────────────────────────
        generateCollectionsJson().catch(e => console.error("CDN Collections Update Error:", e.message));
        // ──────────────────────────────────────────────────────────────────

        const result = collection.toObject();
        result.thumbnailUrl = makeUrl(baseUrl, result.thumbnailUrl);

        res.status(201).json({ success: true, data: result });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// GET SCENES BY COLLECTION
exports.getScenesByCollection = async (req, res, next) => {
    try {
        const { collectionId } = req.params;
        const baseUrl = getBaseUrl(req);

        const collection = await Collection.findById(collectionId).lean();
        if (!collection) {
            return res.status(404).json({ success: false, message: "Collection not found" });
        }

        const formattedCollection = {
            id: collection._id,
            collectionName: collection.collectionName,
            description: collection.description,
            thumbnailUrl: makeUrl(baseUrl, collection.thumbnailUrl),
        };

        const scenes = await Scene.find({ collectionId }).sort({ sceneName: 1 }).lean();

        const formattedScenes = scenes.map((scene) => {
            const levelMap = new Map();
            scene.levels.forEach((lvl, i) =>
                levelMap.set(lvl.levelId.toString(), i + 1)
            );

            return {
                id: scene._id,
                sceneName: scene.sceneName,
                height: scene.height,
                width: scene.width,
                previewUrl: makeUrl(baseUrl, scene.previewImageUrl),
                originalImageUrl: makeUrl(baseUrl, scene.originalImageUrl),
                finalLottieUrl: makeUrl(baseUrl, scene.finalLottieUrl),

                levels: scene.levels.map((lvl, i) => ({
                    levelId: i + 1,
                    imageUrl: makeUrl(baseUrl, lvl.imageUrl),
                })),

                objects: scene.objects.map((obj) => ({
                    id: obj.id,
                    levelId: levelMap.get(obj.levelId.toString()),
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height,
                    imageUrl: makeUrl(baseUrl, obj.imageUrl),
                })),
            };
        });

        res.status(200).json({
            success: true,
            collection: formattedCollection,
            scenes: formattedScenes,
        });

    } catch (err) {
        next(err);
    }
};


// GET ALL COLLECTIONS WITH THEIR SCENES
exports.getAllCollectionsWithScenes = async (req, res, next) => {
    try {
        const baseUrl = getBaseUrl(req);

        const collections = await Collection.find().sort({ createdAt: 1 }).lean();

        // ── Single query for all scenes (avoid N+1) ───────────────────────
        const collectionIds = collections.map((c) => c._id);
        const allScenes = await Scene.find({ collectionId: { $in: collectionIds } })
            .sort({ sceneName: 1 })
            .lean();

        // Group scenes by collectionId
        const scenesMap = new Map();
        for (const scene of allScenes) {
            const cId = scene.collectionId.toString();
            if (!scenesMap.has(cId)) scenesMap.set(cId, []);
            scenesMap.get(cId).push(scene);
        }

        const result = collections.map((collection) => {
            const scenes = scenesMap.get(collection._id.toString()) || [];

            const formattedScenes = scenes.map((scene) => {
                const levelMap = new Map();
                scene.levels.forEach((lvl, i) =>
                    levelMap.set(lvl.levelId.toString(), i + 1)
                );

                return {
                    id: scene._id,
                    sceneName: scene.sceneName,
                    height: scene.height,
                    width: scene.width,
                    previewUrl: makeUrl(baseUrl, scene.previewImageUrl),
                    originalImageUrl: makeUrl(baseUrl, scene.originalImageUrl),
                    finalLottieUrl: makeUrl(baseUrl, scene.finalLottieUrl),

                    levels: scene.levels.map((lvl, i) => ({
                        levelId: i + 1,
                        imageUrl: makeUrl(baseUrl, lvl.imageUrl),
                    })),

                    objects: scene.objects.map((obj) => ({
                        id: obj.id,
                        levelId: levelMap.get(obj.levelId.toString()),
                        x: obj.x,
                        y: obj.y,
                        width: obj.width,
                        height: obj.height,
                        imageUrl: makeUrl(baseUrl, obj.imageUrl),
                    })),
                };
            });

            return {
                id: collection._id,
                collectionName: collection.collectionName,
                description: collection.description,
                thumbnailUrl: makeUrl(baseUrl, collection.thumbnailUrl),
                scenes: formattedScenes,
                sceneCount: scenes.length,
            };
        });

        res.status(200).json({ success: true, collections: result });

    } catch (err) {
        next(err);
    }
};



// ════════════════════════════════════════════════════════════════════════════
// GET SINGLE COLLECTION DETAILS
// ════════════════════════════════════════════════════════════════════════════
exports.getCollection = async (req, res, next) => {
    try {
        const { collectionId } = req.params;
        const baseUrl = getBaseUrl(req);

        const collection = await Collection.findById(collectionId).lean();
        if (!collection) {
            return res.status(404).json({ success: false, message: "Collection not found" });
        }

        const formattedCollection = {
            id: collection._id,
            collectionName: collection.collectionName,
            description: collection.description,
            thumbnailUrl: makeUrl(baseUrl, collection.thumbnailUrl),
        };

        res.status(200).json({ success: true, collection: formattedCollection });

    } catch (err) {
        next(err);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// GET SCENES BY COLLECTION
// ════════════════════════════════════════════════════════════════════════════
exports.deleteCollection = async (req, res, next) => {
    try {
        const { collectionId } = req.params;

        const collection = await Collection.findById(collectionId);
        if (!collection) {
            return res.status(404).json({ success: false, message: "Collection not found" });
        }

        // 1. Find all scenes in this collection
        const scenes = await Scene.find({ collectionId });

        // 2. Clean up R2 assets for each scene
        for (const scene of scenes) {
            const urlsToDelete = [
                scene.previewImageUrl,
                scene.originalImageUrl,
                scene.finalLottieUrl,
                ...(scene.levels || []).map(l => l.imageUrl),
                ...(scene.objects || []).map(o => o.imageUrl)
            ].filter(url => !!url);

            const deletePromises = urlsToDelete.map(async (url) => {
                const key = getKeyFromUrl(url);
                if (key) return deleteFromR2(key).catch(e => console.error(`R2 Delete Error for ${key}:`, e.message));
            });
            await Promise.all(deletePromises);
        }

        // 3. Delete all scenes from DB
        await Scene.deleteMany({ collectionId });

        // 4. Delete collection thumbnail from R2
        const collectionKey = getKeyFromUrl(collection.thumbnailUrl);
        if (collectionKey) {
            await deleteFromR2(collectionKey).catch(e => console.error(`R2 Delete Error for collection thumbnail:`, e.message));
        }

        // 5. Delete collection from DB
        await collection.deleteOne();

        // Sync to CDN
        await generateCollectionsJson().catch(err => console.error("CDN sync failed during collection deletion:", err.message));

        res.status(200).json({
            success: true,
            message: "Collection and all associated scenes and assets deleted successfully"
        });

    } catch (err) {
        next(err);
    }
};


// ════════════════════════════════════════════════════════════════════════════
// UPDATE COLLECTION
// ════════════════════════════════════════════════════════════════════════════
exports.updateCollection = async (req, res, next) => {
    try {
        const { collectionId } = req.params;
        const baseUrl = getBaseUrl(req);
        const { collectionName, description } = req.body;

        const collection = await Collection.findById(collectionId);
        if (!collection) {
            return res.status(404).json({ success: false, message: "Collection not found" });
        }

        // Update basic fields
        if (collectionName) collection.collectionName = collectionName;
        if (description !== undefined) collection.description = description;

        // Check if a new thumbnail was uploaded
        if (req.file) {
            const newThumbnailUrl = req.file.r2Url;

            // Delete the old thumbnail from R2
            if (collection.thumbnailUrl) {
                const oldKey = getKeyFromUrl(collection.thumbnailUrl);
                if (oldKey) {
                    await deleteFromR2(oldKey).catch(e =>
                        console.error(`R2 Delete Error for old collection thumbnail:`, e.message)
                    );
                }
            }

            collection.thumbnailUrl = newThumbnailUrl;
        }

        await collection.save();

        const result = collection.toObject();
        result.thumbnailUrl = makeUrl(baseUrl, result.thumbnailUrl);

        // Sync to CDN
        await generateCollectionsJson().catch(err => console.error("CDN sync failed during collection update:", err.message));

        res.status(200).json({ success: true, data: result, message: "Collection updated successfully" });

    } catch (err) {
        next(err);
    }
};