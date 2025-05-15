const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const upload = multer({
  dest: path.join("/tmp", "uploads"),
});

const controller = require("../controllers/skillmintController");
const mintController = require("../controllers/mintBageController");

// Create a new badge template (with image upload)
router.post(
  "/create-template",
  upload.single("file"),
  controller.uploadTemplateMetadata
);

// Get all badge templates
router.get("/templates", controller.getTemplates);

// Mint a badge (assign to user)

router.post("/mint-badge-ex", mintController.mintBadge);

// Get wallet address by GitHub username
router.get("/users/wallet", controller.getWalletByGithub);
router.post("/users/uploadcv", controller.uploadCVtoPianata);
router.get("/users/publiccv", controller.publicCV);

// Get all badges minted for a GitHub user
router.get("/badges", mintController.getBadgesForWallet);
router.post("/store-template", controller.storeTemplate);

module.exports = router;
