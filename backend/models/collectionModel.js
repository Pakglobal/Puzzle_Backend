const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema({
    collectionName: {
        type: String,
        required: true
    },

    description: String,

    thumbnailUrl: String

}, { timestamps: true });

module.exports = mongoose.model("Collection", collectionSchema);
