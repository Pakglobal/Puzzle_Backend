const path = require("path");
const multer = require("multer");
const { uploadToR2, buildKey } = require("../services/r2");

// ─── Memory storage ──────────────────────────────────────────────────────────
const storage = multer.memoryStorage();

// ─── File filter ─────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/") ||
        file.mimetype.startsWith("audio/")
    ) {
        cb(null, true);
    } else {
        cb(new Error("Only image / video / audio files are allowed."));
    }
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const multerUpload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB
});

// ─── R2 upload middleware ─────────────────────────────────────────────────────
const uploadToR2Middleware = async (req, res, next) => {
    try {
        const file = req.file; // single upload
        if (!file) return next();

        const folder = `collection/${Date.now().toString().slice(-6)}`;
        const key = buildKey(folder, file.originalname);

        file.r2Url = await uploadToR2(file.buffer, key, file.mimetype);
        file.r2Key = key;

        next();
    } catch (err) {
        next(err);
    }
};

// ─── Export object with .single() compatible with existing route ─────────────
const upload = {
    single: (fieldName) => [
        multerUpload.single(fieldName),
        uploadToR2Middleware,
    ],
};

module.exports = upload;
