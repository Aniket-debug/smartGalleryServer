const { Router } = require("express");
const { handlePostSignUp, handlePostLogIn, handlePostLogOut } = require("../controllers/authController");
const upload = require("../config/upload");

const router = Router();


// Signup route
router.post("/signup", upload.single("profileImage"), handlePostSignUp);

// Login route
router.post("/login", handlePostLogIn);

// Logout route
router.post("/logout", handlePostLogOut);

module.exports = router;