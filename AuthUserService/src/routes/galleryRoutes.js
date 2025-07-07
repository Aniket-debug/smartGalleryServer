const { Router } = require("express");
const upload = require("../config/upload");
const { handleGetMyImages,
    handleDeleteImage,
    handlePostUploadImage,
    handlePostSearchImage
} = require("../controllers/galleryController");

const router = Router();

router.get("/my-images", handleGetMyImages);
router.delete("/:id", handleDeleteImage);
router.post("/upload", upload.single("image"), handlePostUploadImage);
router.post("/search", handlePostSearchImage);

module.exports = router;