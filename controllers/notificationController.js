const db = require("../models/db");

exports.getUserNotifications = (req, res) => {
  const userId = req.params.userId;
  const sql =
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC";

  db.execute(sql, [userId], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal mengambil notifikasi", error: err });
    }
    res.status(200).json(results);
  });
};

exports.getNotificationById = (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM notifications WHERE id = ?";
  db.execute(sql, [id], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal ambil detail", error: err });
    if (results.length === 0)
      return res.status(404).json({ message: "Notifikasi tidak ditemukan" });
    res.status(200).json(results[0]);
  });
};

exports.markAsRead = (req, res) => {
  const notificationId = req.params.id;
  const sql = "UPDATE notifications SET is_read = 1 WHERE id = ?";

  db.execute(sql, [notificationId], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal mengubah status notifikasi", error: err });
    }
    res
      .status(200)
      .json({ message: "Notifikasi ditandai sebagai telah dibaca" });
  });
};

exports.createNotification = (req, res) => {
  const { user_id, title, message } = req.body;
  const sql =
    "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)";

  db.execute(sql, [user_id, title, message], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal menambahkan notifikasi", error: err });
    }
    res
      .status(201)
      .json({ message: "Notifikasi berhasil dibuat", id: result.insertId });
  });
};
