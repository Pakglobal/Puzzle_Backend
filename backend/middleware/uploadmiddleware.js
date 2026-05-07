const path = require("path");
const multer = require("multer");
const Scene = require("../models/sceneModel");
const { uploadToR2, buildKey, getShortTs } = require("../services/r2");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/bmp",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "video/mp4",
        "video/quicktime",
        "video/x-matroska",
        "application/octet-stream",
    ];

    const allowedExtensions = [".gif", ".mp4", ".mov", ".mkv", ".json"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Only image, gif, video and lottie files are allowed."));
    }
};

// ─── Multer instance (memory, no disk write) ─────────────────────────────────
const multerUpload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 300 * 1024 * 1024 },
});


const uploadToR2Middleware = async (req, res, next) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) return next();

        let storyFolder = req.storyFolder;

        if (!storyFolder) {
            if (req.params?.sceneId) {
                const scene = await Scene.findById(req.params.sceneId)
                    .select("originalImageUrl")
                    .lean();

                if (scene?.originalImageUrl) {

                    const parts = scene.originalImageUrl.split("/");
                    const isR2 = scene.originalImageUrl.startsWith("http");
                    storyFolder = isR2 ? parts[parts.length - 2] : parts[2];
                }
            }

            if (!storyFolder) {
                storyFolder = `${getShortTs()}_story`;
            }

            req.storyFolder = storyFolder;
        }

        // ─── Phase 1: Identify and Prepare ──────────────────────────────────
        const criticalTasks = [];
        const backgroundTasks = [];
        const bufferToResult = new Map();

        const getBufId = (buf) => `${buf.length}-${buf.slice(0, 100).toString("hex")}`;

        for (const [fieldName, filesArr] of Object.entries(req.files)) {
            const isBackgroundGroup = fieldName === "objectImages";

            for (const file of filesArr) {
                const bufId = getBufId(file.buffer);

                if (bufferToResult.has(bufId)) {
                    console.log(`[R2 MIDDLEWARE] Reusing result for duplicate: ${file.originalname}`);
                    const reusePromise = bufferToResult.get(bufId).then(res => {
                        file.r2Url = res.url;
                        file.r2Key = res.key;
                    });
                    if (isBackgroundGroup) backgroundTasks.push(reusePromise);
                    else criticalTasks.push(reusePromise);
                    continue;
                }

                const key = buildKey(storyFolder, file.originalname);
                
                // PREDICTIVE URL GENERATION
                // We calculate the URL before uploading so the DB can save it immediately.
                const publicBase = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/$/, "");
                file.r2Url = `${publicBase}/${key}`;
                file.r2Key = key;

                console.log(`[R2 MIDDLEWARE] [${isBackgroundGroup ? 'BG' : 'SYNC'}] ${fieldName}: ${file.originalname}`);

                const task = uploadToR2(file.buffer, key, file.mimetype).then(url => ({
                    url,
                    key
                }));

                bufferToResult.set(bufId, task);

                if (isBackgroundGroup) {
                    backgroundTasks.push(task.catch(e => console.error(`[R2 BG ERROR] "${key}":`, e.message)));
                } else {
                    criticalTasks.push(task);
                }
            }
        }

        // ─── Phase 2: Await only Critical Assets ─────────────────────────────
        // This makes the API return in seconds instead of minutes.
        if (criticalTasks.length > 0) {
            console.log(`[R2 MIDDLEWARE] Awaiting ${criticalTasks.length} critical assets...`);
            await Promise.all(criticalTasks);
        }

        // ─── Phase 3: Background the rest ────────────────────────────────────
        if (backgroundTasks.length > 0) {
            console.log(`[R2 MIDDLEWARE] Kicking off ${backgroundTasks.length} background assets...`);
            // We do NOT await this. It runs in the parallel while 'next()' proceeds.
            Promise.all(backgroundTasks).then(() => {
                console.log(`[R2 MIDDLEWARE] All ${backgroundTasks.length} background assets uploaded.`);
            }).catch(err => {
                console.error("[R2 MIDDLEWARE] Critical failure in background batch:", err.message);
            });
        }
        
        next();
    } catch (err) {
        next(err);
    }
};


const upload = {
    fields: (fieldSpec) => [
        multerUpload.fields(fieldSpec),
        uploadToR2Middleware,
    ],
    single: (fieldName) => [
        multerUpload.single(fieldName),
        uploadToR2Middleware,
    ],
};

module.exports = upload;
