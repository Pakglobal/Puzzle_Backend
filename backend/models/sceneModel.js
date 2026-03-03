// models/Scene.js
const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
    levelId: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        required: true,
        index: true
    },
    imageUrl: {
        type: String,
        required: true
    }
}, { _id: false });

const objectSchema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        required: true,
        index: true
    },
    levelId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    width: {
        type: Number,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    imageUrl: {
        type: String,
    }
}, { _id: false });

const sceneSchema = new mongoose.Schema({

    collectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Collection",
        required: false,
        index: true
    },

    sceneName: {
        type: String,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    width: {
        type: Number,
        required: true
    },
    previewImageUrl: {
        type: String,
        default: ''
    },
    originalImageUrl: {
        type: String,
        required: true
    },
    finalLottieUrl: {
        type: String,
    },
    levels: [levelSchema],
    objects: [objectSchema]
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('Scene', sceneSchema);