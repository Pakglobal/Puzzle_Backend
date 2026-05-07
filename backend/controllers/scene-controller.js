const mongoose = require("mongoose");
const Scene = require("../models/sceneModel");
const { deleteFromR2, getKeyFromUrl } = require("../services/r2");
const { generateCollectionsJson, generateStoryJson, generateEverything } = require("../services/cdnJson.service");

// ─── URL helper ──────────────────────────────────────────────────────────────
const getBaseUrl = (req) =>
  process.env.BASE_URL?.replace(/\/$/, "") ||
  `${req.protocol}://${req.get("host")}`;

const makeUrl = (baseUrl, p) => {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  return `${baseUrl}${p.startsWith("/") ? "" : "/"}${p}`;
};

const fileUrl = (file) => (file ? file.r2Url || "" : undefined);


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
        objects: [],
      };

    sceneData.collectionId = req.params.collectionId;

    // ── Level normalization ───────────────────────────────────────────
    const levelIdMap = new Map();

    sceneData.levels = (sceneData.levels || []).map((lvl, i) => {
      const id = new mongoose.Types.ObjectId();
      levelIdMap.set(lvl?.levelId ?? i, id);

      const uploadedFile = req.files?.levelImages?.[i];
      return {
        ...lvl,
        levelId: id,
        imageUrl: uploadedFile ? uploadedFile.r2Url : "",
      };
    });

    // ── Object normalization ──────────────────────────────────────────
    sceneData.objects = (sceneData.objects || []).map((obj, i) => {
      const uploadedFile = req.files?.objectImages?.[i];
      return {
        ...obj,
        id: new mongoose.Types.ObjectId(),
        levelId: levelIdMap.get(obj?.levelId),
        imageUrl: uploadedFile ? uploadedFile.r2Url : "",
      };
    });

    // ── Main files ────────────────────────────────────────────────────
    sceneData.originalImageUrl = req.files?.originalImage?.[0]?.r2Url || "";
    sceneData.previewImageUrl = req.files?.previewImage?.[0]?.r2Url || "";
    sceneData.finalLottieUrl = req.files?.finalLottie?.[0]?.r2Url || "";

    const scene = await new Scene(sceneData).save();

    // ── CDN AUTO-UPDATE (Refreshes everything to prevent index shifts) ──
    setTimeout(() => {
      generateEverything().catch(e => console.error("CDN Regeneration Error:", e.message));
    }, 3000);
    // ──────────────────────────────────────────────────────────────────

    // ── Response format ───────────────────────────────────────────────
    const levelNumberMap = new Map();
    scene.levels.forEach((l, i) =>
      levelNumberMap.set(l.levelId.toString(), i + 1)
    );

    res.status(201).json({
      success: true,
      message: "Scene created successfully",
      data: {
        id: scene._id,
        sceneName: scene.sceneName,
        height: scene.height,
        width: scene.width,
        previewUrl: makeUrl(baseUrl, scene.previewImageUrl),
        originalImageUrl: makeUrl(baseUrl, scene.originalImageUrl),
        finalLottieUrl: makeUrl(baseUrl, scene.finalLottieUrl),

        levels: scene.levels.map((l, i) => ({
          levelId: i + 1,
          imageUrl: makeUrl(baseUrl, l.imageUrl),
        })),

        objects: scene.objects.map((o) => ({
          id: o.id,
          levelId: levelNumberMap.get(o.levelId.toString()),
          x: o.x,
          y: o.y,
          width: o.width,
          height: o.height,
          imageUrl: makeUrl(baseUrl, o.imageUrl),
        })),
      },
    });

  } catch (err) {
    next(err);
  }
};


// GET ALL SCENES (for game)
exports.getScenesForGame = async (req, res, next) => {
  try {
    const baseUrl = getBaseUrl(req);

    const scenes = await Scene.find()
      .sort({ sceneName: 1 })
      .lean();

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

    res.status(200).json({ success: true, scenes: formattedScenes });

  } catch (err) {
    next(err);
  }
};


// DELETE SCENE
exports.deleteScene = async (req, res, next) => {
  try {
    const { sceneId } = req.params;

    const scene = await Scene.findById(sceneId);
    if (!scene)
      return res.status(404).json({ success: false, message: "Scene not found" });

    // --- R2 DELETION LOGIC ---
    // Collect all potential URLs
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
    // -------------------------

    await scene.deleteOne();

    // ── CDN AUTO-UPDATE (Refreshes everything to prevent index shifts) ──
    generateEverything().catch(e => console.error("CDN Regeneration Error:", e.message));

    // Use the same slug logic as cdnJson.service.js to delete the JSON file
    const slugify = (text) => {
      if (!text) return "";
      return text.toString().toLowerCase().trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w-]+/g, "")
        .replace(/\-\-+/g, "_");
    };
    const storySlug = slugify(scene.sceneName);
    deleteFromR2(`stories/${storySlug}.json`).catch(() => { });
    // ──────────────────────────────────────────────────────────────────

    res.status(200).json({ success: true, message: "Scene and its assets deleted successfully" });

  } catch (err) {
    next(err);
  }
};


// UPDATE SCENE (PATCH)
exports.updateScene = async (req, res, next) => {
  try {
    const baseUrl = getBaseUrl(req);
    const { sceneId } = req.params;

    const scene = await Scene.findById(sceneId);
    if (!scene)
      return res.status(404).json({ success: false, message: "Scene not found" });

    const data = req.body.sceneData
      ? (typeof req.body.sceneData === "string"
        ? JSON.parse(req.body.sceneData)
        : req.body.sceneData)
      : {};

    // ── Basic fields ──────────────────────────────────────────────────
    if (data.sceneName !== undefined) scene.sceneName = data.sceneName;
    if (data.height !== undefined) scene.height = data.height;
    if (data.width !== undefined) scene.width = data.width;

    // ── Main files ────────────────────────────────────────────────────
    if (req.files?.originalImage?.[0]) {
      const oldKey = getKeyFromUrl(scene.originalImageUrl);
      if (oldKey) deleteFromR2(oldKey).catch(() => { });
      scene.originalImageUrl = req.files.originalImage[0].r2Url;
    }

    if (req.files?.previewImage?.[0]) {
      const oldKey = getKeyFromUrl(scene.previewImageUrl);
      if (oldKey) deleteFromR2(oldKey).catch(() => { });
      scene.previewImageUrl = req.files.previewImage[0].r2Url;
    }

    if (req.files?.finalLottie?.[0]) {
      const oldKey = getKeyFromUrl(scene.finalLottieUrl);
      if (oldKey) deleteFromR2(oldKey).catch(() => { });
      scene.finalLottieUrl = req.files.finalLottie[0].r2Url;
    }

    // ── Level patch ───────────────────────────────────────────────────
    if (data.levels) {
      const newLevels = [];
      let levelImageIndex = 0;

      for (const lvl of data.levels) {
        let existing = null;
        if (lvl.levelId && !lvl.levelId.startsWith("temp_")) {
          existing = scene.levels.find(l => l.levelId.toString() === lvl.levelId);
        }

        let newImageUrl = existing ? existing.imageUrl : "";
        if (lvl.hasNewImage && req.files?.levelImages?.[levelImageIndex]) {
          const uploadedFile = req.files.levelImages[levelImageIndex];
          if (existing && existing.imageUrl) {
            const oldKey = getKeyFromUrl(existing.imageUrl);
            if (oldKey) deleteFromR2(oldKey).catch(() => { });
          }
          newImageUrl = uploadedFile.r2Url;
          levelImageIndex++;
        }

        const finalLevelId = existing ? existing.levelId : new mongoose.Types.ObjectId();

        // If this is a new level, update any object referencing it via the temp ID
        if (!existing && data.objects) {
          data.objects.forEach(obj => {
            if (obj.levelId === lvl.levelId) {
              obj.levelId = finalLevelId.toString();
            }
          });
        }

        newLevels.push({
          levelId: finalLevelId,
          imageUrl: newImageUrl
        });
      }

      // Cleanup images for removed levels
      scene.levels.forEach(oldLvl => {
        const isKept = newLevels.some(l => l.levelId.toString() === oldLvl.levelId.toString());
        if (!isKept && oldLvl.imageUrl) {
          const oldKey = getKeyFromUrl(oldLvl.imageUrl);
          if (oldKey) deleteFromR2(oldKey).catch(() => { });
        }
      });

      scene.levels = newLevels;
    }

    // ── Object patch ──────────────────────────────────────────────────
    if (data.objects) {
      const newObjects = [];
      let imageIndex = 0;

      for (const obj of data.objects) {
        // Find existing object if it has a valid ID
        let existing = null;
        if (obj.id) {
          existing = scene.objects.find(o => o.id.toString() === obj.id);
        }

        // Consume image if frontend says it sent one
        let newImageUrl = existing ? existing.imageUrl : "";
        if (obj.hasNewImage && req.files?.objectImages?.[imageIndex]) {
          const uploadedFile = req.files.objectImages[imageIndex];
          if (existing && existing.imageUrl) {
            const oldKey = getKeyFromUrl(existing.imageUrl);
            if (oldKey) deleteFromR2(oldKey).catch(() => { });
          }
          newImageUrl = uploadedFile.r2Url;
          imageIndex++;
        }

        newObjects.push({
          id: existing ? existing.id : new mongoose.Types.ObjectId(),
          levelId: obj.levelId || (scene.levels[0] ? scene.levels[0].levelId : null),
          x: obj.x !== undefined ? obj.x : (existing ? existing.x : 0),
          y: obj.y !== undefined ? obj.y : (existing ? existing.y : 0),
          width: obj.width !== undefined ? obj.width : (existing ? existing.width : 0),
          height: obj.height !== undefined ? obj.height : (existing ? existing.height : 0),
          imageUrl: newImageUrl
        });
      }

      // Cleanup images for objects that were removed
      scene.objects.forEach(oldObj => {
        const isKept = data.objects.some(newObj => newObj.id && newObj.id === oldObj.id.toString());
        if (!isKept && oldObj.imageUrl) {
          const oldKey = getKeyFromUrl(oldObj.imageUrl);
          if (oldKey) deleteFromR2(oldKey).catch(() => { });
        }
      });

      scene.objects = newObjects;
    }

    await scene.save();

    // ── CDN AUTO-UPDATE (Refreshes everything if name might have changed) ──
    generateEverything().catch(e => console.error("CDN Regeneration Error:", e.message));
    // ──────────────────────────────────────────────────────────────────

    // ── Format response ───────────────────────────────────────────────
    const levelNumberMap = new Map();
    scene.levels.forEach((l, i) =>
      levelNumberMap.set(l.levelId.toString(), i + 1)
    );

    res.status(200).json({
      success: true,
      message: "Scene updated successfully",
      data: {
        id: scene._id,
        sceneName: scene.sceneName,
        height: scene.height,
        width: scene.width,
        previewUrl: makeUrl(baseUrl, scene.previewImageUrl),
        originalImageUrl: makeUrl(baseUrl, scene.originalImageUrl),
        finalLottieUrl: makeUrl(baseUrl, scene.finalLottieUrl),

        levels: scene.levels.map((l, i) => ({
          levelId: i + 1,
          imageUrl: makeUrl(baseUrl, l.imageUrl),
        })),

        objects: scene.objects.map((o) => ({
          id: o.id,
          levelId: levelNumberMap.get(o.levelId.toString()),
          x: o.x,
          y: o.y,
          width: o.width,
          height: o.height,
          imageUrl: makeUrl(baseUrl, o.imageUrl),
        })),
      },
    });

  } catch (err) {
    next(err);
  }
};




// ════════════════════════════════════════════════════════════════════════════
// GET SINGLE SCENE BY ID
// ════════════════════════════════════════════════════════════════════════════
exports.getSceneById = async (req, res, next) => {
  try {
    const baseUrl = getBaseUrl(req);
    const { sceneId } = req.params;

    const scene = await Scene.findById(sceneId).lean();
    if (!scene) {
      return res.status(404).json({ success: false, message: "Scene not found" });
    }

    const levelMap = new Map();
    scene.levels.forEach((lvl, i) => {
      if (lvl.levelId) {
        levelMap.set(lvl.levelId.toString(), i + 1);
      }
    });

    const formattedScene = {
      id: scene._id,
      collectionId: scene.collectionId,
      sceneName: scene.sceneName,
      height: scene.height,
      width: scene.width,
      previewUrl: makeUrl(baseUrl, scene.previewImageUrl),
      originalImageUrl: makeUrl(baseUrl, scene.originalImageUrl),
      finalLottieUrl: makeUrl(baseUrl, scene.finalLottieUrl),

      levels: scene.levels.map((lvl, i) => ({
        id: lvl.levelId,
        levelId: i + 1,
        imageUrl: makeUrl(baseUrl, lvl.imageUrl),
      })),

      objects: scene.objects.map((obj) => ({
        id: obj.id,
        levelId: obj.levelId ? levelMap.get(obj.levelId.toString()) : null,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        imageUrl: makeUrl(baseUrl, obj.imageUrl),
      })),
    };

    res.status(200).json({ success: true, scene: formattedScene });
  } catch (err) {
    next(err);
  }
};


