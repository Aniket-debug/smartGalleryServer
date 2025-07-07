const { Router } = require("express");
const { handleGetUser, handlePatchUser, handleDeleteUser } = require("../controllers/userController");
const upload = require("../config/upload");

const router = Router();


// profile route
router.get("/me", handleGetUser);

// update route
router.patch("/update", upload.single("profileImage"), handlePatchUser);

// delete route
router.delete("/delete", handleDeleteUser);


module.exports = router;