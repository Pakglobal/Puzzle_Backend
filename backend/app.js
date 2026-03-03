
require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const sceneRoutes = require("./routes/sceneRoutes");
const collectionRoutes = require("./routes/collectionRoutes");

const cors = require("cors");
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: '*' }));
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

// Routes

app.use("/api/auth", authRoutes);
app.use("/api/scenes", sceneRoutes);
app.use("/api/collections", collectionRoutes);


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

