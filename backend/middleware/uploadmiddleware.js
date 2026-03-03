const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Scene = require("../models/sceneModel");

const baseUploadDir = path.join(__dirname, "..", "uploads");

const createDirIfNotExist = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const getShortTs = () => Date.now().toString().slice(-6);

const storage = multer.diskStorage({

    destination: async (req, file, cb) => {
        try {
            //  Agar pehle file ne folder bana diya, reuse karo
            if (req.storyFolder) {
                const finalPath = path.join(baseUploadDir, req.storyFolder);
                return cb(null, finalPath);
            }

            let storyFolder;

            //  UPDATE case — purana folder use karo
            if (req.params?.sceneId) {
                const scene = await Scene.findById(req.params.sceneId).lean();

                if (scene?.originalImageUrl) {
                    const parts = scene.originalImageUrl.split("/");
                    storyFolder = parts[2];
                }
            }

            //  CREATE case — ek baar folder banao
            if (!storyFolder) {
                storyFolder = `${getShortTs()}_story`;
            }

            const finalPath = path.join(baseUploadDir, storyFolder);
            createDirIfNotExist(finalPath);

            //  MOST IMPORTANT LINE
            req.storyFolder = storyFolder;

            cb(null, finalPath);

        } catch (err) {
            cb(err);
        }
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        const baseName = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_]/g, "_");

        const shortTs = getShortTs();

        cb(null, `${shortTs}-${baseName}${ext}`);
    }

});

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
        "application/octet-stream"
    ];

    const allowedExtensions = [".gif", ".mp4", ".mov", ".mkv"];

    const ext = path.extname(file.originalname).toLowerCase();

    if (
        allowedMimeTypes.includes(file.mimetype) ||
        allowedExtensions.includes(ext)
    ) {
        cb(null, true);
    } else {
        cb(new Error("Only image, gif, and video files are allowed."));
    }
};



module.exports = multer({
    storage,
    fileFilter,
    limits: { fileSize: 300 * 1024 * 1024 },
});
