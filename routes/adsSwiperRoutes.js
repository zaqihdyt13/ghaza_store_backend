const express = require("express");
const router = express.Router();
const adsSwiperController = require("../controllers/adsSwiperController");

router.get("/", adsSwiperController.getAllAds);
router.get("/:id", adsSwiperController.getAdById);
router.post("/", adsSwiperController.createAd);
router.put("/:id", adsSwiperController.updateAd);
router.delete("/:id", adsSwiperController.deleteAd);

module.exports = router;
