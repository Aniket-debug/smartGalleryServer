const cloudinary = require("../config/cloudinary");

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer - The image file buffer.
 * @param {string} folderName - Folder prefix for categorizing images (e.g., 'profile', 'gallery').
 * @param {string} ObjectId - Folder prefix for categorizing users.
 * @returns {Promise<{ url: string, public_id: string }>}
 */
const uploadToCloudinary = (buffer, folderType, userId) => {
  return new Promise((resolve, reject) => {
    const folder = `smartGallery/${folderType}Images/${userId}`;
    const publicId = `${folderType}-${Date.now()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
        public_id: publicId,
        transformation: [
          { width: 800, crop: "scale", fetch_format: "auto", quality: "auto" }
        ]
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error);
          return reject(error);
        }
        if (!result) {
          return reject(new Error("Upload returned no result"));
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    if (!buffer || buffer.length === 0) {
      return reject(new Error("Buffer is empty or undefined"));
    }

    uploadStream.end(buffer);
  });
};

const extractPublicId = (imageUrl) => {
  try {
    const urlParts = imageUrl.split('/upload/')[1];
    const parts = urlParts.split('/');
    parts.shift();
    const filename = parts.pop().split('.')[0];
    return [...parts, filename].join('/');
  } catch (error) {
    console.error("Invalid Cloudinary URL format");
    return null;
  }
}

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

const deleteFolderFromCloudinary = async (folderPath) => {
  try {
    await cloudinary.api.delete_resources_by_prefix(folderPath + '/');
    await cloudinary.api.delete_folder(folderPath);
    console.log(`✅ Deleted Cloudinary folder: ${folderPath}`);
  } catch (err) {
    console.warn(`⚠️ Failed to delete Cloudinary folder: ${folderPath}`, err);
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
  deleteFolderFromCloudinary
};
