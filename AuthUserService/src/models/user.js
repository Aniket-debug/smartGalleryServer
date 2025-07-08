const { Schema, model } = require("mongoose");
const { createHmac, randomBytes } = require("crypto");
const { createToken } = require("../utils/jwtUtils");

const userSchema = Schema({
    fullname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    profileImageURL: {
        type: String,
    },
    role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER",
    },
    password: {
        type: String,
        required: true,
        unique: true
    },
    salt: {
        type: String
    }
}, { timestamps: true });



userSchema.pre("save", function (next) {
    const user = this;
    if (!user.isModified("password")) return next();
    const salt = randomBytes(16).toString();
    const hashedPassword = createHmac("sha256", salt).update(user.password).digest("hex");
    this.salt = salt;
    this.password = hashedPassword;
    next();
});

userSchema.static("matchUserAndReturnToken", async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) {
        throw new Error("User not found");
    }

    const userProvidedPasswordHash = createHmac("sha256", user.salt)
        .update(password)
        .digest("hex");

    if (user.password !== userProvidedPasswordHash) {
        throw new Error("Incorrect password");
    }

    const token = createToken(user);

    return {
        token,
        user: {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            profileImageURL: user.profileImageURL,
            role: user.role,
        }
    };
});

const User = model("user", userSchema);

module.exports = User;