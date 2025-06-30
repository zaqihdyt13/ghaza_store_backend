const db = require("../models/db");

const addRating = (req, res) => {
  const { product_id, user_id, rating, comment } = req.body;

  if (!product_id || !user_id || !rating) {
    return res.status(400).json({ message: "Semua field harus diisi" });
  }

  const insertSql = `
    INSERT INTO ratings (product_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?)
  `;

  db.query(insertSql, [product_id, user_id, rating, comment || null], (err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal menambahkan rating", error: err });
    }

    const statsSql = `
      SELECT AVG(rating) AS average_rating, COUNT(*) AS total_reviews
      FROM ratings
      WHERE product_id = ?
    `;
    db.query(statsSql, [product_id], (err, stats) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Gagal menghitung ulang rating", error: err });
      }

      const avgRating = stats[0].average_rating;
      const totalReviews = stats[0].total_reviews;

      const updateProductSql = `
        UPDATE products
        SET average_rating = ?, total_reviews = ?
        WHERE id = ?
      `;
      db.query(
        updateProductSql,
        [avgRating, totalReviews, product_id],
        (err) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Gagal update ke tabel produk", error: err });
          }

          res.status(201).json({
            message: "Rating berhasil ditambahkan",
            average_rating: avgRating,
            total_reviews: totalReviews,
          });
        }
      );
    });
  });
};

const getRatingsByProduct = (req, res) => {
  const productId = req.params.productId;

  const sql = `
    SELECT r.*, u.username
    FROM ratings r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(sql, [productId], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal mengambil data rating", error: err });
    }
    res.status(200).json(result);
  });
};

const getUserRatingForProduct = (req, res) => {
  const { userId, productId } = req.query;

  const sql = `
    SELECT rating, comment
    FROM ratings
    WHERE user_id = ? AND product_id = ?
    LIMIT 1
  `;

  db.query(sql, [userId, productId], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal mengambil rating user", error: err });
    }
    res.status(200).json(result[0] || null);
  });
};

module.exports = {
  addRating,
  getRatingsByProduct,
  getUserRatingForProduct
};
