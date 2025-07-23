const { Router } = require("express");
const upload = require("../config/upload");
const { handleGetMyImages,
    handleDeleteImage,
    handlePostUploadImages,
    handlePostSearchImage
} = require("../controllers/galleryControllerMilvus");

const router = Router();

router.get("/my-images", handleGetMyImages);
router.delete("/:id", handleDeleteImage);
router.post("/upload", upload.array("images", 50), handlePostUploadImages);
router.post("/search", handlePostSearchImage);

module.exports = router;
