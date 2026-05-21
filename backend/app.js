require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const sceneRoutes = require("./routes/sceneRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const adminCdnRoutes = require("./routes/admin/cdn.route");
const adminDashboardRoutes = require("./routes/admin/dashboard.route");
const notificationRoutes = require("./routes/notification-routes");
// [DISABLED] Internal cron disabled — using cron-job.org (external) as sole trigger
// const { initCronJobs } = require("./services/cronService");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const app = express();

// Connect to MongoDB
connectDB();

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      console.log(`Checking CORS for origin: ${origin}`);
      console.log(`Allowed origins: ${JSON.stringify(allowedOrigins)}`);

      const isAllowed = allowedOrigins.includes(origin);
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log(`CORS blocked for origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res) => {
      res.set("Cache-Control", "no-store");
    },
  })
);

// ─── Health Check (Keep-Alive for Render) ──────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "active", time: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/api/debug-cors", (req, res) => {
  res.json({
    env: process.env.ALLOWED_ORIGINS,
    allowed: allowedOrigins,
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/scenes", sceneRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/admin", adminCdnRoutes);
app.use("/admin/dashboard", adminDashboardRoutes);

// ─── Global crash protection (keeps cron alive on unexpected errors) ─────────
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Process] Unhandled Promise Rejection:", reason);
  // Log but do NOT exit – crashes would kill the cron scheduler
});

process.on("uncaughtException", (err) => {
  console.error("[Process] Uncaught Exception:", err.message);
  // Log but do NOT exit – crashes would kill the cron scheduler
});

// [DISABLED] Internal cron disabled — notifications triggered externally by cron-job.org
// initCronJobs();

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Something went wrong";
  res.status(status).json({ success: false, message });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on port: ${PORT}`);
});

module.exports = app;
