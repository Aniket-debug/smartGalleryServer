const cloudinary = require("../config/cloudinary");

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer - The image file buffer.
 * @param {string} folderName - Folder prefix for categorizing images (e.g., 'profile', 'gallery').
 * @returns {Promise<{ url: string, public_id: string }>}
 */
const uploadToCloudinary = (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: `${folderName}Images`,
        public_id: `${folderName}-${Date.now()}`,
        transformation: [
          { width: 800, crop: "scale", fetch_format: "auto", quality: "auto" }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary using its public_id.
 * @param {string} publicId - The Cloudinary public ID of the image.
 * @returns {Promise<void>}
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    if (response.result === "ok") {
      console.log("✅ Image deleted successfully from Cloudinary!");
      return true;
    } else if (response.result === "not found") {
      console.warn("⚠️ Image not found in Cloudinary.");
      return false;
    } else {
      console.warn("⚠️ Unexpected result from Cloudinary:", response.result);
      return false;
    }
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary
};
