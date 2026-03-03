const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ================= STORAGE =================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        const micro = process.hrtime.bigint()
            .toString()
            .slice(-4);

        const folderName = micro;

        const uploadPath = path.join(
            __dirname,
            "..",
            "uploads",
            "collection",
            folderName
        );

        // Create folder if not exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },


    filename: function (req, file, cb) {

        const ext = path.extname(file.originalname).toLowerCase();

        const baseName = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9]/g, "_")
            .slice(0, 20);

        const shortId = Date.now().toString().slice(-4)

        const fileName = `${shortId}-${baseName}${ext}`;

        cb(null, fileName);
    }
});



// ================= FILE FILTER =================

const fileFilter = (req, file, cb) => {

    if (
        file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/") ||
        file.mimetype.startsWith("audio/")
    ) {
        cb(null, true);
    } else {
        cb(new Error("Only image/gif/video/audio allowed"));
    }
};


// ================= EXPORT =================

module.exports = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 300 * 1024 * 1024 // 300MB
    }
});
