const Gallery = require("../models/gallery");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryUtils");
const { getImageEmbedding, getCaptionEmbedding, dotSim } = require("../utils/clipService");
const mongoose = require("mongoose");

const handleGetMyImages = async (req, res) => {
  try {
    if (req.user) {
      const userId = req.user._id;
      const imagesUrl = await Gallery.find({ userId }).select("url");
      return res.json({ numberOfImages: imagesUrl.length, images: imagesUrl });
    }
    return res.status(401).json({ msg: "Please logIn first." });
  } catch (error) {
    console.error("Error fetching user images:", error);
    return res.status(500).json({ msg: "Server error. Please try again later." });
  }
}

const handlePostUploadImages = async (req, res) => {
  const session = await mongoose.startSession();
  const cloudinaryPublicIds = [];

  try {
    session.startTransaction();

    if (!req.user?._id) {
      return res.status(400).json({ message: "Please login to upload files!" });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "Please upload at least one file!" });
    }

    if (files.length > 50) {
      return res.status(400).json({ message: "You can upload a maximum of 50 images at once." });
    }

    const imageDocs = [];

    for (const file of files) {
      const imageBuffer = file.buffer;

      const [cloudinaryRes, embedding] = await Promise.all([
        uploadToCloudinary(imageBuffer, "gallery", req.user.email.replace(/[@.]/g, "_")),
        getImageEmbedding(imageBuffer)
      ]);

      const { url, public_id } = cloudinaryRes;
      cloudinaryPublicIds.push(public_id);

      imageDocs.push({
        userId: req.user._id,
        url,
        embedding,
      });
    }

    await Gallery.insertMany(imageDocs, { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Images uploaded and embedded successfully",
      uploadedCount: imageDocs.length,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    for (const publicId of cloudinaryPublicIds) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (cloudErr) {
        console.warn("Cloudinary cleanup failed:", cloudErr);
      }
    }

    console.error("Batch Upload Error:", err);
    return res.status(500).json({ error: "Failed to upload and process images" });
  }
};

const handleDeleteImage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ msg: "Please logIn first." });
    }

    const imageId = req.params.id;

    const image = await Gallery.findById(imageId).session(session);
    if (!image) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: "Image not found." });
    }

    if (image.userId.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ msg: "Not authorized to delete this image." });
    }

    const publicId = extractPublicId(image.url);
    await deleteFromCloudinary(publicId);

    await Gallery.findByIdAndDelete(imageId, { session });

    await session.commitTransaction();
    session.endSession();

    return res.json({ msg: "Image deleted successfully!" });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting image:", error);
    return res.status(500).json({ msg: "Server error. Please try again later." });
  }
};

const handlePostSearchImage = async (req, res) => {
  try {

    if (!req.user._id) {
      return res.status(400).json({ message: "Please logIn to upload a file!" })
    }

    const userId = req.user._id;
    const caption = req.body.caption;

    if (!caption || typeof caption !== 'string') {
      return res.status(400).json({ error: "Caption is required" });
    }

    const captionEmbedding = await getCaptionEmbedding(caption);

    const images = await Gallery.find({ userId }).select("url embedding");

    if (!images.length) {
      return res.status(404).json({ message: "No image is found !!" });
    }

    const results = images.map(img => {
      const similarity = dotSim(captionEmbedding, img.embedding);
      return {
        _id: img._id,
        url: img.url,
        similarity: Number(similarity.toFixed(4)),
      };
    });

    results.sort((a, b) => b.similarity - a.similarity);

    res.status(200).json({ results: results.slice(0, 3) });

  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: 'Search failed' });
  }
};

module.exports = {
  handleGetMyImages,
  handleDeleteImage,
  handlePostUploadImages,
  handlePostSearchImage
};
