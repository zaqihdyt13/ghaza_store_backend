const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getUserOrders,
  handleNotification,
  getOrderDetail,
  updateOrderStatus
} = require("../controllers/orderController");
const authenticateToken = require("../middleware/authMiddleware"); // Middleware untuk autentikasi

router.post("/", authenticateToken, createOrder);
router.get("/", getAllOrders);
router.get("/", authenticateToken, getUserOrders);
router.post("/midtrans-notification", handleNotification);
router.get("/:id", getOrderDetail);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
