const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const db = require("../models/db");
const jwt = require("jsonwebtoken");

// Regex untuk validasi email sederhana
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

router.get("/profile", verifyToken, (req, res) => {
  const userId = req.user.id;

  const query = "SELECT id, username, email, role FROM users WHERE id = ?";

  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error("Query error:", err);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan pada server." });
    }

    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "User tidak ditemukan atau telah dihapus." });
    }

    const user = result[0];

    try {
      const token = req.headers.authorization?.split(" ")[1];
      const decodedToken = jwt.decode(token);

      res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          iat: decodedToken?.iat,
          exp: decodedToken?.exp,
        },
      });
    } catch (tokenErr) {
      console.error("Token decode error:", tokenErr);
      return res.status(400).json({ message: "Token tidak valid." });
    }
  });
});

// Endpoint update profil dengan validasi username dan email
router.put("/profile/update", verifyToken, (req, res) => {
  const userId = req.user.id;
  const { username, email } = req.body;

  // Validasi format email
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Format email tidak valid" });
  }

  // Cek apakah username sudah digunakan oleh user lain
  const checkUsernameQuery =
    "SELECT id FROM users WHERE username = ? AND id != ?";

  db.query(checkUsernameQuery, [username, userId], (err, usernameResults) => {
    if (err) return res.status(500).json({ error: "Gagal mengecek username" });

    if (usernameResults.length > 0) {
      return res
        .status(400)
        .json({ message: "Username sudah digunakan oleh pengguna lain" });
    }

    // Cek apakah email sudah digunakan oleh user lain
    const checkEmailQuery = "SELECT id FROM users WHERE email = ? AND id != ?";

    db.query(checkEmailQuery, [email, userId], (err, emailResults) => {
      if (err) return res.status(500).json({ error: "Gagal mengecek email" });

      if (emailResults.length > 0) {
        return res
          .status(400)
          .json({ message: "Email sudah digunakan oleh pengguna lain" });
      }

      // Update jika username & email aman
      const updateQuery =
        "UPDATE users SET username = ?, email = ? WHERE id = ?";

      db.query(updateQuery, [username, email, userId], (err, result) => {
        if (err)
          return res.status(500).json({ error: "Gagal mengupdate profil" });

        if (result.affectedRows === 0) {
          return res.status(404).json({
            message: "User tidak ditemukan atau tidak ada perubahan",
          });
        }

        res.status(200).json({ message: "Profil berhasil diperbarui" });
      });
    });
  });
});

// GET all users (hanya ambil id, username, email, role)
router.get("/users", (req, res) => {
  const query = "SELECT id, username, email, role FROM users";

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ message: "Gagal mengambil data user" });
    }

    res.status(200).json(result);
  });
});

module.exports = router;
