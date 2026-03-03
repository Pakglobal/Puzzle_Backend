const mongoose = require("mongoose");
const Scene = require("../models/sceneModel");

// Get base URL safely from request
const getBaseUrl = (req) =>
    process.env.BASE_URL?.replace(/\/$/, "") ||
    `${req.protocol}://${req.get("host")}`;

// Convert short path -> full URL
const makeUrl = (base, p) =>
    p ? `${base}${p.startsWith("/") ? "" : "/"}${p}` : "";


// CREATE SCENE
exports.createScene = async (req, res, next) => {
    try {

        const baseUrl = getBaseUrl(req);

        const sceneData = req.body.sceneData
            ? (typeof req.body.sceneData === "string"
                ? JSON.parse(req.body.sceneData)
                : req.body.sceneData)
            : {
                sceneName: req.body.sceneName,
                height: parseInt(req.body.height),
                width: parseInt(req.body.width),
                levels: [],
                objects: []
            };

        sceneData.collectionId = req.params.collectionId;

        // ---------- LEVEL NORMALIZATION ----------
        const levelIdMap = new Map();

        sceneData.levels = (sceneData.levels || []).map((lvl, i) => {
            const id = new mongoose.Types.ObjectId();
            levelIdMap.set(lvl?.levelId ?? i, id);

            return {
                ...lvl,
                levelId: id,
                imageUrl: req.files?.levelImages?.[i]
                    ? `/uploads/${req.storyFolder}/${req.files.levelImages[i].filename}`
                    : ""
            };
        });

        // ---------- OBJECT NORMALIZATION ----------
        sceneData.objects = (sceneData.objects || []).map((obj, i) => ({
            ...obj,
            id: new mongoose.Types.ObjectId(),
            levelId: levelIdMap.get(obj?.levelId),
            imageUrl: req.files?.objectImages?.[i]
                ? `/uploads/${req.storyFolder}/${req.files.objectImages[i].filename}`
                : ""
        }));

        // ---------- MAIN FILES ----------
        sceneData.originalImageUrl = req.files?.originalImage?.[0]
            ? `/uploads/${req.storyFolder}/${req.files.originalImage[0].filename}`
            : "";

        sceneData.previewImageUrl = req.files?.previewImage?.[0]
            ? `/uploads/${req.storyFolder}/${req.files.previewImage[0].filename}`
            : "";

        sceneData.finalLottieUrl = req.files?.finalLottie?.[0]
            ? `/uploads/${req.storyFolder}/${req.files.finalLottie[0].filename}`
            : "";

        const scene = await new Scene(sceneData).save();


        // ---------- RESPONSE FORMAT ----------
        const levelNumberMap = new Map();
        scene.levels.forEach((l, i) =>
            levelNumberMap.set(l.levelId.toString(), i + 1)
        );

        res.status(201).json({
            success: true,
            message: "Scene created successfully",
            data: {
                ...scene.toObject(),
                originalImageUrl: makeUrl(baseUrl, scene.originalImageUrl),
                previewImageUrl: makeUrl(baseUrl, scene.previewImageUrl),
                finalLottieUrl: makeUrl(baseUrl, scene.finalLottieUrl),

                levels: scene.levels.map((l, i) => ({
                    levelId: i + 1,
                    imageUrl: makeUrl(baseUrl, l.imageUrl)
                })),

                objects: scene.objects.map(o => ({
                    id: o.id,
                    levelId: levelNumberMap.get(o.levelId.toString()),
                    x: o.x,
                    y: o.y,
                    width: o.width,
                    height: o.height,
                    imageUrl: makeUrl(baseUrl, o.imageUrl)
                }))
            }
        });

    } catch (err) {
        next(err);
    }
};


// GET SCENES FOR GAME
exports.getScenesForGame = async (req, res, next) => {
    try {

        const baseUrl = getBaseUrl(req);

        const scenes = await Scene.find()
            .sort({ sceneName: 1 })
            .lean();

        const formattedScenes = scenes.map(scene => {

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

        res.status(200).json({ success: true, scenes: formattedScenes });

    } catch (err) {
        next(err);
    }
};



// UPDATE SCENE (PATCH)
exports.updateScene = async (req, res, next) => {
    try {

        const { sceneId } = req.params;

        const scene = await Scene.findById(sceneId);
        if (!scene)
            return res.status(404).json({ success: false, message: "Scene not found" });

        const data = req.body.sceneData
            ? (typeof req.body.sceneData === "string"
                ? JSON.parse(req.body.sceneData)
                : req.body.sceneData)
            : {};

        // ---------- BASIC FIELDS ----------
        if (data.sceneName !== undefined) scene.sceneName = data.sceneName;
        if (data.height !== undefined) scene.height = data.height;
        if (data.width !== undefined) scene.width = data.width;

        // ---------- MAIN FILE PATCH ----------
        if (req.files?.originalImage?.[0])
            scene.originalImageUrl =
                `/uploads/${req.storyFolder}/${req.files.originalImage[0].filename}`;

        if (req.files?.previewImage?.[0])
            scene.previewImageUrl =
                `/uploads/${req.storyFolder}/${req.files.previewImage[0].filename}`;

        if (req.files?.finalLottie?.[0])
            scene.finalLottieUrl =
                `/uploads/${req.storyFolder}/${req.files.finalLottie[0].filename}`;

        // ---------- LEVEL PATCH ----------
        if (data.levels) {
            data.levels.forEach((lvl, i) => {
                const existing = scene.levels.find(
                    l => l.levelId.toString() === lvl.levelId
                );
                if (!existing) return;

                if (req.files?.levelImages?.[i]) {
                    existing.imageUrl =
                        `/uploads/${req.storyFolder}/${req.files.levelImages[i].filename}`;
                }
            });
        }

        // ---------- OBJECT PATCH ----------
        if (data.objects) {
            data.objects.forEach((obj, i) => {
                const existing = scene.objects.find(
                    o => o.id.toString() === obj.id
                );
                if (!existing) return;

                if (obj.x !== undefined) existing.x = obj.x;
                if (obj.y !== undefined) existing.y = obj.y;
                if (obj.width !== undefined) existing.width = obj.width;
                if (obj.height !== undefined) existing.height = obj.height;
                if (obj.levelId !== undefined) existing.levelId = obj.levelId;

                if (req.files?.objectImages?.[i]) {
                    existing.imageUrl =
                        `/uploads/${req.storyFolder}/${req.files.objectImages[i].filename}`;
                }
            });
        }

        await scene.save();

        res.status(200).json({
            success: true,
            message: "Scene patched successfully",
            scene
        });

    } catch (err) {
        next(err);
    }
};
