const User = require("../models/user");
const { createToken } = require("../utils/jwtUtils");
const { uploadToCloudinary } = require("../utils/cloudinaryUtils");
const mongoose = require("mongoose");

const handlePostSignUp = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let publicId;

  try {
    if (req.user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ msg: "You are already logged in!" });
    }

    const { fullname, email, password } = req.body;

    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Email already exists" });
    }

    let profileImageURL = undefined;

    if (req.file) {
      const { url, public_id } = await uploadToCloudinary(req.file.buffer, "profile", email.replace(/[@.]/g, "_"));
      profileImageURL = url;
      publicId = public_id;
    }

    const user = new User({
      fullname,
      email,
      password,
      profileImageURL,
    });

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    const token = createToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return res.status(201).json({
      message: "Signup successful",
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
      },
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // Rollback Cloudinary image if upload happened
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (cloudErr) {
        console.warn("Cloudinary cleanup failed:", cloudErr);
      }
    }

    console.error("Signup Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


const handlePostLogIn = async (req, res) => {

  if (req.user) return res.status(401).json({ msg: "you are already loggedIn!" });

  const { email, password } = req.body;

  try {
    const { token, user } = await User.matchUserAndReturnToken(email, password);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    console.log("user loggedIn: ", user);

    res.status(200).json({ message: "Login successful", user, });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
}

const handlePostLogOut = (req, res) => {
  if (req.user) {
    return res.clearCookie("token").json({ msg: "logged out successfully!" });
  }
  return res.json({ msg: "please login first!" });
}

module.exports = {
  handlePostSignUp,
  handlePostLogIn,
  handlePostLogOut
}