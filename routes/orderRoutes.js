const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getUserOrders,
  handleNotification,
  getOrderDetail,
  updateOrderStatus,
  getPaymentToken
} = require("../controllers/orderController");
const authenticateToken = require("../middleware/authMiddleware"); // Middleware untuk autentikasi

router.post("/", authenticateToken, createOrder);
router.get("/", getAllOrders);
router.get("/orders", authenticateToken, getUserOrders);
router.post("/midtrans-notification", handleNotification);
router.get("/:id", getOrderDetail);
router.put("/:id/status", updateOrderStatus);
router.get("/payment/:midtrans_order_id", authenticateToken, getPaymentToken);

module.exports = router;
