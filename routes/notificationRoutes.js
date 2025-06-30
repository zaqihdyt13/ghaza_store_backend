const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authenticateToken = require("../middleware/authMiddleware");

router.get(
  "/:userId",
  authenticateToken,
  notificationController.getUserNotifications
);
router.put("/read/:id", authenticateToken, notificationController.markAsRead);
router.post("/", notificationController.createNotification);
router.get("/detail/:id", authenticateToken, notificationController.getNotificationById);


module.exports = router;
