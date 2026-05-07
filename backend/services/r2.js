require("dotenv").config();
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const path = require("path");
const pLimit = require("p-limit");
const crypto = require("crypto");
const https = require("https");

// ─── Concurrency Limiter ─────────────────────────────────────────────────────
// Concurrency 4 is safe for background transfers.
const limit = pLimit(4);

// ─── Connection Pooling ──────────────────────────────────────────────────────
// Standard Node.js HTTPS agent can run out of sockets during bulk uploads.
// We use a custom agent with a larger pool to prevent ECONNRESET.
const agent = new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    rejectUnauthorized: false // Sometimes needed for R2 local proxy setups
});

// ─── R2 Client ───────────────────────────────────────────────────────────────
const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
    forcePathStyle: false,
    requestHandler: new NodeHttpHandler({
        httpsAgent: agent,
        connectionTimeout: 10000,
        requestTimeout: 30000,
    }),
    maxAttempts: 12,
    retryMode: "adaptive",
});

// ─── Upload ──────────────────────────────────────────────────────────────────
/**
 * Uploads a buffer to Cloudflare R2.
 */
const uploadToR2 = (buffer, key, mimetype) => {
    if (!process.env.CLOUDFLARE_R2_BUCKET) {
        throw new Error("CLOUDFLARE_R2_BUCKET is not defined in environment variables");
    }

    return limit(async () => {
        // High local retry count to ensure background tasks eventually succeed.
        const maxAttempts = 15; 
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[R2] Put "${key}" [Atmt ${attempt}]`);
                
                await r2Client.send(
                    new PutObjectCommand({
                        Bucket: process.env.CLOUDFLARE_R2_BUCKET,
                        Key: key,
                        Body: buffer,
                        ContentType: mimetype,
                        CacheControl: "public, max-age=3600",
                        // CRITICAL: Force UNSIGNED-PAYLOAD. This is the #1 fix for 
                        // random S3-compatible 500 errors during headers-only checks.
                        requestChecksumCalculation: "WHEN_REQUIRED",
                        responseChecksumValidation: "WHEN_REQUIRED",
                    })
                );
                const publicBase = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/$/, "");
                return `${publicBase}/${key}`;
            } catch (error) {
                const status = error.$metadata?.httpStatusCode;
                const errorName = error.name;

                // Only log errors for the last few attempts to avoid console spam
                if (attempt > 3 || status !== 500) {
                    console.error(`[R2] FAILED "${key}" — ${errorName} (HTTP ${status})`);
                }

                const isRetryable =
                    status === 500 ||
                    status === 502 ||
                    status === 503 ||
                    status === 429 ||
                    errorName === "InternalError" ||
                    errorName === "DeserializationError" ||
                    error.code === "ECONNRESET" ||
                    error.code === "ETIMEDOUT";

                if (isRetryable && attempt < maxAttempts) {
                    // Exponential backoff to clear Cloudflare blocks: 2s, 4s, 8s, 16s...
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
                    console.warn(`[R2] Backing off ${Math.round(delay)}ms for "${key}"...`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw error;
            }
        }
    });
};

const deleteFromR2 = (key) =>
    limit(() =>
        r2Client.send(
            new DeleteObjectCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET,
                Key: key,
            })
        )
    );

const getShortTs = () => Date.now().toString().slice(-6);

const buildKey = (folder, originalname) => {
    const ext = path.extname(originalname).toLowerCase();
    const base = path
        .basename(originalname, ext)
        .replace(/[^a-zA-Z0-9-_]/g, "_");
    const rand = crypto.randomBytes(3).toString("hex"); 
    return `${folder}/${getShortTs()}-${rand}-${base}${ext}`;
};

const getKeyFromUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const publicBase = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/$/, "");
    if (url.startsWith(publicBase)) return url.replace(`${publicBase}/`, "");
    if (url.startsWith("/uploads/")) return url.replace("/uploads/", "");
    return null;
};

module.exports = { r2Client, uploadToR2, deleteFromR2, buildKey, getShortTs, getKeyFromUrl };
