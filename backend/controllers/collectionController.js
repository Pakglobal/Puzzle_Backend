const Collection = require("../models/collectionModel");
const Scene = require("../models/sceneModel");

// Build base URL from request
const getBaseUrl = (req) =>
    process.env.BASE_URL?.replace(/\/$/, "") ||
    `${req.protocol}://${req.get("host")}`;

// Convert stored short path → full URL
const makeUrl = (baseUrl, p) =>
    p ? `${baseUrl}${p.startsWith("/") ? "" : "/"}${p}` : "";



// CREATE COLLECTION
exports.createCollection = async (req, res) => {
    try {

        const baseUrl = getBaseUrl(req);
        const { collectionName, description } = req.body;

        let thumbnailUrl = "";

        if (req.file) {
            const relativePath = req.file.path.replace(/\\/g, "/");
            thumbnailUrl = relativePath.substring(relativePath.indexOf("/uploads"));
        }

        const collection = await Collection.create({
            collectionName,
            description,
            thumbnailUrl
        });

        const result = collection.toObject();

        // ONLY response conversion (same as before)
        result.thumbnailUrl = makeUrl(baseUrl, result.thumbnailUrl);

        res.status(201).json({
            success: true,
            data: result
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// GET SCENES BY COLLECTION
exports.getScenesByCollection = async (req, res, next) => {
    try {

        const { collectionId } = req.params;
        const baseUrl = getBaseUrl(req);

        // ===== GET COLLECTION =====
        const collection = await Collection.findById(collectionId).lean();

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: "Collection not found"
            });
        }

        const formattedCollection = {
            id: collection._id,
            collectionName: collection.collectionName,
            description: collection.description,
            thumbnailUrl: makeUrl(baseUrl, collection.thumbnailUrl),
            // createdAt: collection.createdAt
        };

        // ===== GET SCENES =====
        const scenes = await Scene.find({ collectionId })
            .sort({ sceneName: 1 })
            .lean();

        const formattedScenes = scenes.map(scene => {

            const levelMap = new Map();
            scene.levels.forEach((lvl, i) => {
                levelMap.set(lvl.levelId.toString(), i + 1);
            });

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
                    imageUrl: makeUrl(baseUrl, lvl.imageUrl)
                })),

                objects: scene.objects.map(obj => ({
                    id: obj.id,
                    levelId: levelMap.get(obj.levelId.toString()),
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height,
                    imageUrl: makeUrl(baseUrl, obj.imageUrl)
                }))
            };
        });

        res.status(200).json({
            success: true,
            collection: formattedCollection,
            scenes: formattedScenes
        });

    } catch (err) {
        next(err);
    }
};


// GET ALL COLLECTIONS WITH THEIR SCENES
exports.getAllCollectionsWithScenes = async (req, res, next) => {
    try {

        const baseUrl = getBaseUrl(req);

        //  GET ALL COLLECTIONS 
        const collections = await Collection.find().sort({ createdAt: 1 }).lean();

        const result = [];

        for (const collection of collections) {

            //  GET SCENES FOR THIS COLLECTION 
            const scenes = await Scene.find({ collectionId: collection._id })
                .sort({ sceneName: 1 })
                .lean();

            const formattedScenes = scenes.map(scene => {

                const levelMap = new Map();
                scene.levels.forEach((lvl, i) => {
                    levelMap.set(lvl.levelId.toString(), i + 1);
                });

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
                        imageUrl: makeUrl(baseUrl, lvl.imageUrl)
                    })),

                    objects: scene.objects.map(obj => ({
                        id: obj.id,
                        levelId: levelMap.get(obj.levelId.toString()),
                        x: obj.x,
                        y: obj.y,
                        width: obj.width,
                        height: obj.height,
                        imageUrl: makeUrl(baseUrl, obj.imageUrl)
                    }))
                };
            });

            result.push({
                id: collection._id,
                collectionName: collection.collectionName,
                description: collection.description,
                thumbnailUrl: makeUrl(baseUrl, collection.thumbnailUrl),
                // createdAt: collection.createdAt,
                scenes: formattedScenes
            });
        }

        res.status(200).json({
            success: true,
            collections: result
        });

    } catch (err) {
        next(err);
    }
};