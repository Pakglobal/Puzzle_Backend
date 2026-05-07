const Collection = require("../models/collectionModel");
const Scene = require("../models/sceneModel");
const { uploadToR2 } = require("./r2");

const CDN_BASE_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/$/, "");

const fixUrl = (url) => {
  if (!url) return "";
  if (url.startsWith(CDN_BASE_URL)) return url;

  let relativePath = url;
  if (url.startsWith("http")) {
    if (url.includes("/uploads/")) {
      relativePath = url.split("/uploads/")[1];
    } else {
      return url;
    }
  } else {
    relativePath = url.replace(/^\/uploads\//, "").replace(/^\//, "");
  }

  return `${CDN_BASE_URL}/${relativePath}`;
};

const formatSceneData = (scene) => {
  if (!scene) return null;

  const levelsArray = (scene.levels || []).map((lvl, i) => ({
    levelId: i + 1,
    imageUrl: fixUrl(lvl.imageUrl),
    objects: [],
  }));

  const levelMap = new Map();
  (scene.levels || []).forEach((lvl, i) => {
    levelMap.set(lvl.levelId.toString(), i);
  });

  (scene.objects || []).forEach((obj) => {
    const levelIndex = levelMap.get(obj.levelId.toString());
    if (levelIndex !== undefined && levelsArray[levelIndex]) {
      levelsArray[levelIndex].objects.push({
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        imageUrl: fixUrl(obj.imageUrl),
      });
    }
  });

  const levelNumber = String(scene.sceneName.match(/\d+/)?.[0] || "0").padStart(2, "0");

  return {
    sceneName: scene.sceneName,
    slug: `level_${levelNumber}`,
    height: scene.height,
    width: scene.width,
    previewUrl: fixUrl(scene.previewImageUrl),
    originalImageUrl: fixUrl(scene.originalImageUrl),
    finalLottieUrl: fixUrl(scene.finalLottieUrl),
    levels: levelsArray,
  };
};

const sortScenesByNumber = (scenes) =>
  [...scenes].sort((a, b) => {
    const numA = parseInt(a.sceneName.match(/\d+/)?.[0] || 0, 10);
    const numB = parseInt(b.sceneName.match(/\d+/)?.[0] || 0, 10);
    return numA - numB;
  });

/**
 * Fetches all collections and scenes, and calculates global/collection indexes.
 * Mandatory for performance: avoids O(N^2) database queries.
 */
const getBulkData = async () => {
    const [collections, allScenes] = await Promise.all([
        Collection.find().sort({ createdAt: 1 }).lean(),
        Scene.find().lean()
    ]);

    const scenesByCollection = new Map();
    allScenes.forEach(s => {
        const colId = s.collectionId?.toString();
        if (!scenesByCollection.has(colId)) scenesByCollection.set(colId, []);
        scenesByCollection.get(colId).push(s);
    });

    let globalCounter = 1;
    const sceneIndexMap = new Map();
    const formattedCollections = [];

    for (const col of collections) {
        const rawScenes = scenesByCollection.get(col._id.toString()) || [];
        const sortedScenes = sortScenesByNumber(rawScenes);

        let collectionCounter = 1;
        const collectionScenesForMeta = sortedScenes.map(s => {
            const globalIndex = globalCounter++;
            const collectionIndex = collectionCounter++;
            
            sceneIndexMap.set(s._id.toString(), { globalIndex, collectionIndex });
            
            return {
                id: `level_${String(globalIndex).padStart(2, "0")}`,
                sceneName: s.sceneName,
                previewUrl: fixUrl(s.previewImageUrl),
                globalIndex,
                collectionIndex
            };
        });

        formattedCollections.push({
            collectionName: col.collectionName,
            description: col.description || "",
            thumbnailUrl: fixUrl(col.thumbnailUrl),
            scenes: collectionScenesForMeta
        });
    }

    return {
        collections: formattedCollections,
        allScenes,
        sceneIndexMap
    };
};

const generateCollectionsJson = async (bulkData = null) => {
    const data = bulkData || (await getBulkData());
    const jsonString = JSON.stringify({ success: true, collections: data.collections }, null, 2);
    const key = "collections.json";
    await uploadToR2(Buffer.from(jsonString), key, "application/json");
    return `${CDN_BASE_URL}/${key}`;
};

const generateStoryJson = async (sceneId, bulkData = null) => {
    let scene, indexes;
    
    if (bulkData) {
        scene = bulkData.allScenes.find(s => s._id.toString() === sceneId.toString());
        indexes = bulkData.sceneIndexMap.get(sceneId.toString());
    } else {
        const [s, bData] = await Promise.all([
            Scene.findById(sceneId).lean(),
            getBulkData()
        ]);
        scene = s;
        indexes = bData.sceneIndexMap.get(sceneId.toString());
    }

    if (!scene || !indexes) return null;

    const storyData = formatSceneData(scene);
    storyData.globalIndex = indexes.globalIndex;
    storyData.collectionIndex = indexes.collectionIndex;

    const levelStr = String(indexes.globalIndex).padStart(2, "0");
    const jsonString = JSON.stringify({ success: true, story: storyData }, null, 2);
    const key = `stories/level_${levelStr}.json`;
    
    await uploadToR2(Buffer.from(jsonString), key, "application/json");
    return `${CDN_BASE_URL}/${key}`;
};

/**
 * Regenerates everything in O(N) time by pre-fetching data.
 * Sequential for-loops are avoided here to hit the < 20s target.
 */
let isGenerating = false;
let lastGeneratedTime = 0;

const generateEverything = async () => {
    const now = Date.now();
    // Enforce a 60-second cooldown between global regenerations
    if (now - lastGeneratedTime < 60000) {
        console.warn(`[CDN] Global regeneration is on cooldown. Please wait ${Math.ceil((60000 - (now - lastGeneratedTime)) / 1000)}s.`);
        return;
    }

    if (isGenerating) {
        console.warn("[CDN] Regeneration already in progress. Skipping...");
        return;
    }
    isGenerating = true;
    try {
        console.log("[CDN] Starting global regeneration (Bulk optimized)...");
        const start = Date.now();
        
        const bulkData = await getBulkData();
        
        // 1. Update collections.json
        await generateCollectionsJson(bulkData);

        // 2. Update all story JSONs in parallel (batches of 10)
        const batchSize = 10;
        for (let i = 0; i < bulkData.allScenes.length; i += batchSize) {
            const batch = bulkData.allScenes.slice(i, i + batchSize);
            console.log(`[CDN] Processing batch ${i / batchSize + 1}...`);
            await Promise.all(batch.map(scene => generateStoryJson(scene._id, bulkData)));
        }
        
        console.log(`[CDN] Global regeneration complete in ${Date.now() - start}ms`);
        lastGeneratedTime = Date.now();
    } finally {
        isGenerating = false;
    }
};

module.exports = { generateCollectionsJson, generateStoryJson, generateEverything };
