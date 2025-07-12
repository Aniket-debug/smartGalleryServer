const User = require("../models/user");
const Gallery = require("../models/gallery");
const { match_password} = require("../utils/userUtility");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId, deleteFolderFromCloudinary} = require("../utils/cloudinaryUtils");

const mongoose = require("mongoose");
const handleGetUser = async (req, res) => {
    if (req.user) {
        const user = await User.findById(req.user._id).select("-password -salt");
        return res.json(user);
    }
    return res.status(401).json({ msg: "you are not logged In" })
}

const handlePatchUser = async (req, res) => {
  if (!req.user)
    return res.status(401).json({ msg: "You are not logged in" });

  const session = await mongoose.startSession();
  session.startTransaction();

  const userId = req.user._id;
  const { fullname, old_password, new_password } = req.body;

  let newProfilePublicId;
  let newProfileImageURL;
  let oldProfilePublicIdToDelete;

  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found" });
    }

    let final_messages = [];
    let changed = false;

    if (fullname && fullname !== user.fullname) {
      user.fullname = fullname;
      final_messages.push("Fullname updated ✅");
      changed = true;
    }

    if (req.file) {
      const { url, public_id } = await uploadToCloudinary(req.file.buffer, "profile", req.user.email.replace(/[@.]/g, "_"));
      newProfileImageURL = url;
      newProfilePublicId = public_id;

      if (user.profileImageURL) {
        oldProfilePublicIdToDelete = extractPublicId(user.profileImageURL);
      }

      user.profileImageURL = newProfileImageURL;

      final_messages.push("Profile image updated ✅");
      changed = true;
    }

    if (new_password) {
      if (!old_password) {
        final_messages.push("Please provide old password → password not updated ❌");
      } else if (old_password === new_password) {
        final_messages.push("New password and old password can't be same → password not updated ❌");
      } else if (match_password(old_password, user.password, user.salt)) {
        user.password = new_password;
        final_messages.push("Password updated ✅");
        changed = true;
      } else {
        final_messages.push("Incorrect old password → password not updated ❌");
      }
    }

    if (changed) {
      await user.save({ session });
    } else if (final_messages.length === 0) {
      final_messages.push("No changes made");
    }

    await session.commitTransaction();
    session.endSession();

    if (oldProfilePublicIdToDelete) {
      try {
        await deleteFromCloudinary(oldProfilePublicIdToDelete);
      } catch (cloudErr) {
        console.warn("Warning: Failed to delete old profile image:", cloudErr);
      }
    }

    return res.status(200).json({
      message: final_messages,
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        profileImageURL: user.profileImageURL,
      },
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    if (newProfilePublicId) {
      try {
        await deleteFromCloudinary(newProfilePublicId);
      } catch (cloudErr) {
        console.warn("Warning: Failed to rollback new profile image:", cloudErr);
      }
    }

    console.error("Update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const handleDeleteUser = async (req, res) => {
  if (!req.user) return res.status(401).json({ msg: "You are not logged in" });

  const session = await mongoose.startSession();
  session.startTransaction();

  const userId = req.user._id;

  let publicIdsToDelete = [];

  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found" });
    }

    if (user.profileImageURL) {
      publicIdsToDelete.push(extractPublicId(user.profileImageURL));
    }

    const userImages = await Gallery.find({ userId }).select("url").session(session);
    for (const img of userImages) {
      publicIdsToDelete.push(extractPublicId(img.url));
    }

    await Gallery.deleteMany({ userId }, { session });

    await User.findByIdAndDelete(userId, { session });

    await session.commitTransaction();
    session.endSession();

    for (const publicId of publicIdsToDelete) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (cloudErr) {
        console.warn(`⚠️ Failed to delete image: ${publicId}`, cloudErr);
      }
    }

    const userFolderSafeId = req.user.email.replace(/[@.]/g, "_");

    await deleteFolderFromCloudinary(`smartGallery/profileImages/${userFolderSafeId}`);
    await deleteFolderFromCloudinary(`smartGallery/galleryImages/${userFolderSafeId}`);

    res.clearCookie("token");

    return res.status(200).json({
      message: "✅ User, profile image, and gallery deleted successfully",
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("❌ Error deleting user:", err);
    return res.status(500).json({
      message: "Server error during account deletion",
    });
  }
};

module.exports = {
    handleGetUser,
    handlePatchUser,
    handleDeleteUser
}
