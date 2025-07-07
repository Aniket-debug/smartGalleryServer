const Gallery = require("../models/gallery");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinaryUtils");
const { getImageEmbedding, getCaptionEmbedding, cosineSim } = require("../utils/clipService");


const handleGetMyImages = async (req, res) => {
  try {
    if (req.user) {
      const userId = req.user._id;
      const imagesUrl = await Gallery.find({ userId }).select("url");
      return res.json({ images: imagesUrl });
    }
    return res.status(401).json({ msg: "Please log in first." });
  } catch (error) {
    console.error("Error fetching user images:", error);
    return res.status(500).json({ msg: "Server error. Please try again later." });
  }
}

const handleDeleteImage = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: "Please log in first." });
    }

    const imageId = req.params.id;

    const image = await Gallery.findById(imageId);
    if (!image) {
      return res.status(404).json({ msg: "Image not found." });
    }

    if (image.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Not authorized to delete this image." });
    }

    await deleteFromCloudinary(image.publicId);

    await Gallery.findByIdAndDelete(imageId);

    return res.json({ msg: "Image deleted successfully!" });

  } catch (error) {
    console.error("Error deleting image:", error);
    return res.status(500).json({ msg: "Server error. Please try again later." });
  }
};


const handlePostUploadImage = async (req, res) => {
  try {

    if (!req.user._id) {
      return res.status(400).json({ message: "Please login to upload a file!" })
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload a file!" });
    }

    const { url, public_id } = await uploadToCloudinary(req.file.buffer, "gallery");

    const embedding = await getImageEmbedding(url);

    const newImage = new Gallery({
      userId: req.user._id,
      url,
      publicId: public_id,
      embedding,
    });

    await newImage.save();

    res.status(200).json({
      message: 'Image uploaded and embedded successfully',
      imageId: newImage._id,
    });

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Failed to upload and process image' });
  }
};


const handlePostSearchImage = async (req, res) => {
  try {

    if (!req.user._id) {
      return res.status(400).json({ message: "Please login to upload a file!" })
    }

    const userId = req.user._id;
    const caption = req.body.caption;

    if (!caption || typeof caption !== 'string') {
      return res.status(400).json({ error: "Caption is required" });
    }

    const captionEmbedding = await getCaptionEmbedding(caption);

    const images = await Gallery.find({ userId }).select("url embedding");

    if (!images.length) {
      return res.status(404).json({ message: "No images found for this user." });
    }

    const results = images.map(img => {
      const similarity = cosineSim(captionEmbedding, img.embedding);
      return {
        _id: img._id,
        url: img.url,
        similarity: Number(similarity.toFixed(4)),
      };
    });

    results.sort((a, b) => b.similarity - a.similarity);

    res.status(200).json({ results: results.slice(0, 10) });

  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: 'Search failed' });
  }
};

module.exports = {
  handleGetMyImages,
  handleDeleteImage,
  handlePostUploadImage,
  handlePostSearchImage
};
