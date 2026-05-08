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
const initCronJobs = require("./services/cronService");

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

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/scenes", sceneRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/admin", adminCdnRoutes);
app.use("/admin/dashboard", adminDashboardRoutes);

// Initialize Cron Jobs for automated notifications
initCronJobs();

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
