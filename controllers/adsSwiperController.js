const db = require("../models/db"); // asumsi file koneksi MySQL bernama db.js

// GET all ads
const getAllAds = (req, res) => {
  const query = "SELECT * FROM ads_swiper ORDER BY created_at DESC";
  db.query(query, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal mengambil data iklan", error: err });
    }
    res.status(200).json(results);
  });
};

// GET ad by ID
const getAdById = (req, res) => {
  const adId = req.params.id;
  const query = "SELECT * FROM ads_swiper WHERE id = ?";
  db.query(query, [adId], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal mengambil data iklan", error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Iklan tidak ditemukan" });
    }
    res.status(200).json(results[0]);
  });
};

// POST create new ad
const createAd = (req, res) => {
  const { title, image_url } = req.body;
  const query = "INSERT INTO ads_swiper (title, image_url) VALUES (?, ?)";
  db.query(query, [title, image_url], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal menambahkan iklan", error: err });
    }
    res
      .status(201)
      .json({ message: "Iklan berhasil ditambahkan", id: result.insertId });
  });
};

// PUT update ad
const updateAd = (req, res) => {
  const adId = req.params.id;
  const { title, image_url } = req.body;
  const query = "UPDATE ads_swiper SET title = ?, image_url = ? WHERE id = ?";
  db.query(query, [title, image_url, adId], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal memperbarui iklan", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Iklan tidak ditemukan" });
    }
    res.status(200).json({ message: "Iklan berhasil diperbarui" });
  });
};

// DELETE ad
const deleteAd = (req, res) => {
  const adId = req.params.id;
  const query = "DELETE FROM ads_swiper WHERE id = ?";
  db.query(query, [adId], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal menghapus iklan", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Iklan tidak ditemukan" });
    }
    res.status(200).json({ message: "Iklan berhasil dihapus" });
  });
};

module.exports = {
  getAllAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
};
