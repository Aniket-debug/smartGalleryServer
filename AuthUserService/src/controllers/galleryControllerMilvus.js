const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryUtils");
const { getImageEmbedding, getCaptionEmbedding } = require("../utils/clipService");
const crypto = require("crypto");
const milvusClient = require("../config/milvus")();
const createCollectionIfNotExists = require("../models/galleryMilvus");

createCollectionIfNotExists();

const handleGetMyImages = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: "Please logIn first." });
    }

    const userId = req.user._id.toString();

    const result = await milvusClient.query({
      collection_name: "gallery_images",
      expr: `user_id == "${userId}"`,
      output_fields: ["url", "metadata_id"]
    });

    const images = result.data || [];

    return res.json({
      numberOfImages: images.length,
      images
    });

  } catch (error) {
    console.error("Milvus Query Error:", error);
    return res.status(500).json({ msg: "Server error. Please try again later." });
  }
};

const handlePostUploadImages = async (req, res) => {
  const cloudinaryPublicIds = [];

  try {
    if (!req.user?._id) {
      return res.status(400).json({ message: "Please login to upload files!" });
    }

    const files = req.files;
    if (!files?.length) {
      return res.status(400).json({ message: "Please upload at least one file!" });
    }

    if (files.length > 50) {
      return res.status(400).json({ message: "You can upload a maximum of 50 images at once." });
    }

    const insertData = [];

    for (const file of files) {
      const imageBuffer = file.buffer;

      const [cloudinaryRes, embedding] = await Promise.all([
        uploadToCloudinary(imageBuffer, "gallery", req.user.email.replace(/[@.]/g, "_")),
        getImageEmbedding(imageBuffer)
      ]);

      const { url, public_id } = cloudinaryRes;
      cloudinaryPublicIds.push(public_id);

      insertData.push({
        user_id: req.user._id.toString(),
        url,
        metadata_id: crypto.randomUUID(), // custom field to allow lookup
        embedding
      });
    }

    await milvusClient.insert({
      collection_name: "gallery_images",
      fields_data: insertData
    });

    return res.status(200).json({
      message: "Images uploaded and embedded successfully",
      uploadedCount: insertData.length
    });

  } catch (err) {
    for (const publicId of cloudinaryPublicIds) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (cloudErr) {
        console.warn("Cloudinary cleanup failed:", cloudErr);
      }
    }

    console.error("Milvus Upload Error:", err);
    return res.status(500).json({ error: "Failed to upload and process images" });
  }
};

const handleDeleteImage = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ msg: "Please logIn first." });

    const metadataId = req.params.id;

    const searchResult = await milvusClient.query({
      collection_name: "gallery_images",
      expr: `metadata_id == "${metadataId}"`
    });

    const record = searchResult.data?.[0];
    if (!record) return res.status(404).json({ msg: "Image not found." });

    if (record.user_id !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Not authorized to delete this image." });
    }

    const publicId = extractPublicId(record.url);
    await deleteFromCloudinary(publicId);

    await milvusClient.deleteEntities({
      collection_name: "gallery_images",
      expr: `metadata_id == "${metadataId}"`
    });

    return res.json({ msg: "Image deleted successfully!" });

  } catch (error) {
    console.error("Milvus Delete Error:", error);
    return res.status(500).json({ msg: "Server error. Please try again later." });
  }
};

const handlePostSearchImage = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(400).json({ message: "Please logIn to search!" });
    }

    const caption = req.body.caption;
    if (!caption || typeof caption !== 'string') {
      return res.status(400).json({ error: "Caption is required" });
    }

    const captionEmbedding = await getCaptionEmbedding(caption);

    const results = await milvusClient.search({
      collection_name: "gallery_images",
      vector: [captionEmbedding],
      output_fields: ["url", "user_id", "metadata_id"],
      search_params: { anns_field: "embedding", topk: 3, metric_type: "IP" },
      filter: `user_id == "${req.user._id.toString()}"`
    });

    const searchData = results.results || [];

    const formatted = searchData.map((item) => ({
      _id: item.metadata_id,
      url: item.url,
      similarity: Number(item.score.toFixed(4))
    }));

    return res.status(200).json({ results: formatted });

  } catch (err) {
    console.error("Milvus Search Error:", err);
    res.status(500).json({ error: 'Search failed' });
  }
};

module.exports = {
  handleGetMyImages,
  handleDeleteImage,
  handlePostUploadImages,
  handlePostSearchImage
};

