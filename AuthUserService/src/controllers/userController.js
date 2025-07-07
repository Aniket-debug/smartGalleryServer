const User = require("../models/user");
const Gallery = require("../models/gallery");
const { match_password} = require("../utils/userUtility");
const { uploadToCloudinary, deleteFromCloudinary} = require("../utils/cloudinaryUtils");

const handleGetUser = async (req, res) => {
    if (req.user) {
        const user = await User.findById(req.user._id).select("-password -salt");
        return res.json(user);
    }
    return res.status(401).json({ msg: "you are not logged In" })
}

const handlePatchUser = async (req, res) => {

    if (!req.user)
        return res.status(401).json({ msg: "you are not logged In" });

    const userId = req.user._id;
    const { fullname, old_password, new_password } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        let final_messages = [];
        let changed = false;

        if (fullname && fullname !== user.fullname) {
            user.fullname = fullname;
            final_messages.push("Fullname updated ✅");
            changed = true;
        }

        if (req.file) {
            if (user.publicId){
                await deleteFromCloudinary(user.publicId);
            }
            const { url, public_id } = await uploadToCloudinary(req.file.buffer, "profile");
            user.profileImageURL = url;
            user.publicId = public_id;
            final_messages.push("Profile image updated ✅");
            changed = true;
        }

        if (new_password) {
            if (!old_password)
            {
                final_messages.push("Please provide old password → password not updated ❌");
            }
            else if (old_password === new_password)
            {
                final_messages.push("new password and old password feilds can not have same value → password not updated ❌");
            }
            else if (match_password(old_password, user.password, user.salt))
            {
                user.password = new_password;
                final_messages.push("Password updated ✅");
                changed = true;
            }
            else
            {
                final_messages.push("Incorrect old password → password not updated");
            }
        }

        if (changed) {
            await user.save();
        } else if (final_messages.length === 0) {
            final_messages.push("No changes made");
        }
        res.status(200).json({
            message: final_messages,
            user: {
                _id: user._id,
                fullname: user.fullname,
                email: user.email,
                profileImageURL: user.profileImageURL,
            },
        });

    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const handleDeleteUser = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ msg: "you are not logged In" });

    const userId = req.user._id;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        //  Delete profile picture from Cloudinary
        if (user.publicId){
            await deleteFromCloudinary(user.publicId);
        }

        // Fetch and delete all images uploaded by the user from cloudinary
        const userImages = await Gallery.find({ userId }).select("publicId");

        for (const img of userImages) {
            await deleteFromCloudinary(img);
        }

        // Remove images from DB
        await Gallery.deleteMany({ userId });

        // Delete user from DB
        await User.findByIdAndDelete(userId);

        // Clear cookie
        res.clearCookie("token");

        res.status(200).json({ message: "✅ User, profile image, and gallery deleted successfully" });
    } catch (err) {
        console.error("❌ Error deleting user:", err);
        res.status(500).json({ message: "Server error during account deletion" });
    }
};

module.exports = {
    handleGetUser,
    handlePatchUser,
    handleDeleteUser
}
