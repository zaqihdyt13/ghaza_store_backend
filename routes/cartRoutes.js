const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCartItems,
  updateCartItem,
  deleteCartItem,
} = require("../controllers/cartController");
const verifyToken = require("../middleware/authMiddleware");

router.post("/", verifyToken, addToCart);
router.get("/", verifyToken, getCartItems);
router.put("/:cartItemId", verifyToken, updateCartItem);
router.delete("/:cartItemId", verifyToken, deleteCartItem);

module.exports = router;
