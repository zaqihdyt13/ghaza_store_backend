const express = require("express");
const router = express.Router();
const {
  addRating,
  getRatingsByProduct,
  getUserRatingForProduct
} = require("../controllers/ratingController");

router.post("/", addRating);
router.get("/:productId", getRatingsByProduct);
router.get("/user-rating/check", getUserRatingForProduct); 

module.exports = router;
