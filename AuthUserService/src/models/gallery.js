const { Schema, model } = require("mongoose");

const gallerySchema = Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },
    url: {
        type: String,
        required: true
    },
    embedding: {
        type: [Number],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

const Gallery = model('gallery', gallerySchema);

module.exports = Gallery;
