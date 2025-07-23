const db = require("../models/db");

const getAllProducts = (req, res) => {
  let { category, color, search } = req.query;

  if (category && !Array.isArray(category)) category = category.split(",");
  if (color && !Array.isArray(color)) color = color.split(",");

  let sql = `
  SELECT 
    p.*, 
    AVG(r.rating) AS average_rating
  FROM products p
  LEFT JOIN ratings r ON p.id = r.product_id
  LEFT JOIN product_categories pc ON p.id = pc.product_id
  LEFT JOIN categories c ON pc.category_id = c.id
  LEFT JOIN product_colors pcl ON p.id = pcl.product_id
  LEFT JOIN colors col ON pcl.color_id = col.id
  WHERE 1=1
`;

  const values = [];

  if (category && category.length > 0) {
    sql += ` AND c.name IN (${category.map(() => "?").join(",")})`;
    values.push(...category);
  }

  if (color && color.length > 0) {
    sql += ` AND col.color_name IN (${color.map(() => "?").join(",")})`;
    values.push(...color);
  }

  if (search) {
    sql += " AND p.name LIKE ?";
    values.push(`%${search}%`);
  }

  sql += " GROUP BY p.id"; // Penting untuk AVG()

  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Query gagal", error: err });
    }
    res.status(200).json(result);
  });
};

const getPopularProducts = (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const minReviews = 3;

  const getGlobalAvgSql = `SELECT AVG(average_rating) AS globalAvgRating FROM products`;

  db.query(getGlobalAvgSql, (err, avgResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        message: "Failed to calculate global average rating",
        error: err,
      });
    }

    const globalAvgRating = avgResult[0].globalAvgRating || 0;

    const sql = `
      SELECT 
        *,
        (
          (total_reviews / (total_reviews + ?)) * average_rating + 
          (? / (total_reviews + ?)) * ?
        ) AS weighted_rating
      FROM products
      WHERE sold_count >= 5 
        AND average_rating > 3 
        AND total_reviews > 5
      ORDER BY weighted_rating DESC
      LIMIT ?
    `;

    db.query(
      sql,
      [minReviews, minReviews, minReviews, globalAvgRating, limit],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            message: "Failed to fetch popular products",
            error: err,
          });
        }

        res.status(200).json(result);
      }
    );
  });
};

const getProductDetails = (req, res) => {
  const productId = req.params.id;
  const userId = req.query.userId;

  const productSql = "SELECT * FROM products WHERE id = ?";
  db.query(productSql, [productId], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    const product = result[0];

    // Ambil kategori
    const categorySql = `
      SELECT c.id, c.name FROM categories c
      JOIN product_categories pc ON c.id = pc.category_id
      WHERE pc.product_id = ?
    `;
    db.query(categorySql, [productId], (err, categories) => {
      if (err) return res.status(500).json({ message: "Gagal fetch kategori" });

      // Ambil warna
      const colorSql = `
        SELECT col.id, col.color_name FROM colors col
        JOIN product_colors pc ON col.id = pc.color_id
        WHERE pc.product_id = ?
      `;
      db.query(colorSql, [productId], (err, colors) => {
        if (err) return res.status(500).json({ message: "Gagal fetch colors" });

        // Ambil ukuran
        const sizeSql = `
          SELECT s.id, s.size_name FROM sizes s
          JOIN product_sizes ps ON s.id = ps.size_id
          WHERE ps.product_id = ?
        `;
        db.query(sizeSql, [productId], (err, sizes) => {
          if (err)
            return res.status(500).json({ message: "Gagal fetch sizes" });

          // Ambil rating rata-rata & total review
          const ratingSql = `
            SELECT 
              AVG(rating) AS average_rating, 
              COUNT(*) AS total_reviews 
            FROM ratings 
            WHERE product_id = ?
          `;
          db.query(ratingSql, [productId], (err, ratingStats) => {
            if (err)
              return res.status(500).json({ message: "Gagal fetch rating" });

            const average_rating = parseFloat(
              ratingStats[0].average_rating || 0
            ).toFixed(1);
            const total_reviews = ratingStats[0].total_reviews;

            // Ambil rating user jika userId ada
            if (userId) {
              const userRatingSql = `
                SELECT rating FROM ratings WHERE product_id = ? AND user_id = ?
              `;
              db.query(
                userRatingSql,
                [productId, userId],
                (err, userRatingResult) => {
                  if (err)
                    return res
                      .status(500)
                      .json({ message: "Gagal fetch user rating" });

                  const user_rating =
                    userRatingResult.length > 0
                      ? userRatingResult[0].rating
                      : null;

                  return res.status(200).json({
                    ...product,
                    categories,
                    colors,
                    sizes,
                    average_rating,
                    total_reviews,
                    user_rating,
                  });
                }
              );
            } else {
              return res.status(200).json({
                ...product,
                categories,
                colors,
                sizes,
                average_rating,
                total_reviews,
              });
            }
          });
        });
      });
    });
  });
};

const getAllCategories = (req, res) => {
  const sql = "SELECT * FROM categories";
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch categories", error: err });
    }
    res.status(200).json(result);
  });
};

const getAllColors = (req, res) => {
  const sql = "SELECT * FROM colors";
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch colors", error: err });
    }
    res.status(200).json(result);
  });
};

const getAllSizes = (req, res) => {
  const sql = "SELECT * FROM sizes";
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch sizes", error: err });
    }
    res.status(200).json(result);
  });
};

const getRecommendedProducts = (req, res) => {
  const productId = req.params.id;

  // Ambil kategori produk
  const getCategoriesQuery = `
    SELECT pc.category_id, c.name
    FROM product_categories pc
    JOIN categories c ON pc.category_id = c.id
    WHERE pc.product_id = ?
  `;

  db.query(getCategoriesQuery, [productId], (err, categories) => {
    if (err)
      return res.status(500).json({ message: "Server error", error: err });
    if (categories.length === 0)
      return res.status(404).json({ message: "Product not found" });

    // Filter kategori bukan 'Pria' atau 'Wanita'
    const filteredCategories = categories.filter(
      (cat) =>
        cat.name.toLowerCase() !== "pria" && cat.name.toLowerCase() !== "wanita"
    );
    const categoryIds = filteredCategories.map((cat) => cat.category_id);

    const getProductQuery = `SELECT * FROM products WHERE id = ? LIMIT 1`;
    db.query(getProductQuery, [productId], (err, productResult) => {
      if (err)
        return res.status(500).json({ message: "Server error", error: err });

      const currentProduct = productResult[0];
      const price = currentProduct.price;
      const brand = currentProduct.name.split(" ")[0];

      // === 1. Fuzzifikasi ===
      const fuzzyMurah =
        price <= 35000
          ? 1
          : price >= 100000
          ? 0
          : (100000 - price) / (100000 - 35000);
      const fuzzySedang =
        price <= 75000 || price >= 300000
          ? 0
          : price <= 150000
          ? (price - 75000) / (150000 - 75000)
          : price <= 300000
          ? (300000 - price) / (300000 - 150000)
          : 0;
      const fuzzyMahal =
        price <= 250000
          ? 0
          : price >= 300000
          ? 1
          : (price - 250000) / (300000 - 250000);

      // === 2. Inferensi ===
      const zLow = 50000;
      const zMedium = 200000;
      const zHigh = 650000;

      // === 3. Defuzzifikasi (Metode Centroid) ===
      const numerator =
        zLow * fuzzyMurah + zMedium * fuzzySedang + zHigh * fuzzyMahal;
      const denominator = fuzzyMurah + fuzzySedang + fuzzyMahal;
      const defuzzifiedPrice =
        denominator === 0 ? price : numerator / denominator;

      // Tetapkan rentang harga fuzzy
      let minPrice, maxPrice;
      if (defuzzifiedPrice <= 100000) {
        minPrice = 0;
        maxPrice = 99999;
      } else if (defuzzifiedPrice <= 300000) {
        minPrice = 100000;
        maxPrice = 300000;
      } else {
        minPrice = 300001;
        maxPrice = 10000000;
      }

      // === 4. Strategi Fuzzy 1: Berdasarkan kategori
      const placeholders = categoryIds.map(() => "?").join(",");
      const recommendationQuery = `
        SELECT DISTINCT p.*
        FROM products p
        JOIN product_categories pc ON p.id = pc.product_id
        WHERE pc.category_id IN (${placeholders})
          AND p.price BETWEEN ? AND ?
          AND p.id != ?
        LIMIT 5
      `;

      db.query(
        recommendationQuery,
        [...categoryIds, minPrice, maxPrice, productId],
        (err, recommendationResult) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Server error", error: err });

          // === Hasil ditemukan dari strategi 1 ===
          if (recommendationResult.length > 0) {
            return res.json({
              currentProduct,
              fuzzyMembership: {
                murah: fuzzyMurah.toFixed(2),
                sedang: fuzzySedang.toFixed(2),
                mahal: fuzzyMahal.toFixed(2),
                defuzzifiedPrice: Math.round(defuzzifiedPrice),
              },
              recommendations: recommendationResult,
            });
          }

          // === Strategi Fuzzy 2: Jika kategori gagal, cari berdasarkan brand + rentang harga fuzzy ===
          const fallbackQuery = `
            SELECT * FROM products
            WHERE name LIKE ? AND price BETWEEN ? AND ? AND id != ?
            LIMIT 5
          `;
          db.query(
            fallbackQuery,
            [`${brand}%`, minPrice, maxPrice, productId],
            (err, fallbackResult) => {
              if (err)
                return res
                  .status(500)
                  .json({ message: "Server error", error: err });

              return res.json({
                currentProduct,
                fuzzyMembership: {
                  murah: fuzzyMurah.toFixed(2),
                  sedang: fuzzySedang.toFixed(2),
                  mahal: fuzzyMahal.toFixed(2),
                  defuzzifiedPrice: Math.round(defuzzifiedPrice),
                },
                recommendations: fallbackResult,
              });
            }
          );
        }
      );
    });
  });
};

const createProduct = (req, res) => {
  try {
    const { name, price, description, sold_count } = req.body;

    const categories = JSON.parse(req.body.categories || "[]");
    const colors = JSON.parse(req.body.colors || "[]");
    const sizes = JSON.parse(req.body.sizes || "[]");

    const image_url = req.file?.path || null;

    const insertProductSql = `
      INSERT INTO products (name, price, image_url, description, sold_count)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      insertProductSql,
      [name, price, image_url, description, sold_count],
      (err, result) => {
        if (err) {
          console.error("Insert product error:", err);
          return res
            .status(500)
            .json({ message: "Failed to insert product", error: err });
        }

        const productId = result.insertId;
        const insertRelations = [];

        if (categories.length > 0) {
          insertRelations.push(
            new Promise((resolve, reject) => {
              db.query(
                `SELECT id FROM categories WHERE name IN (?)`,
                [categories],
                (err, rows) => {
                  if (err) return reject(err);
                  const values = rows.map((r) => [productId, r.id]);
                  db.query(
                    `INSERT INTO product_categories (product_id, category_id) VALUES ?`,
                    [values],
                    (err) => (err ? reject(err) : resolve())
                  );
                }
              );
            })
          );
        }

        if (colors.length > 0) {
          insertRelations.push(
            new Promise((resolve, reject) => {
              db.query(
                `SELECT id FROM colors WHERE color_name IN (?)`,
                [colors],
                (err, rows) => {
                  if (err) return reject(err);
                  const values = rows.map((r) => [productId, r.id]);
                  db.query(
                    `INSERT INTO product_colors (product_id, color_id) VALUES ?`,
                    [values],
                    (err) => (err ? reject(err) : resolve())
                  );
                }
              );
            })
          );
        }

        if (sizes.length > 0) {
          insertRelations.push(
            new Promise((resolve, reject) => {
              db.query(
                `SELECT id FROM sizes WHERE size_name IN (?)`,
                [sizes],
                (err, rows) => {
                  if (err) return reject(err);
                  const values = rows.map((r) => [productId, r.id]);
                  db.query(
                    `INSERT INTO product_sizes (product_id, size_id) VALUES ?`,
                    [values],
                    (err) => (err ? reject(err) : resolve())
                  );
                }
              );
            })
          );
        }

        Promise.all(insertRelations)
          .then(() => {
            res.status(201).json({ message: "Product created", productId });
          })
          .catch((err) => {
            console.error("Insert relation error:", err);
            res
              .status(500)
              .json({ message: "Failed to insert relations", error: err });
          });
      }
    );
  } catch (err) {
    console.error("General error in createProduct:", err);
    res.status(500).json({ message: "Internal Server Error", error: err });
  }
};

const updateProduct = async (req, res) => {
  const productId = req.params.id;

  const { name, price, description, sold_count } = req.body;

  const categories = JSON.parse(req.body.categories || "[]");
  const colors = JSON.parse(req.body.colors || "[]");
  const sizes = JSON.parse(req.body.sizes || "[]");

  let image_url;

  try {
    // Ambil image baru jika ada
    if (req.file) {
      image_url = req.file.path;
    } else {
      const [rows] = await new Promise((resolve, reject) => {
        db.query(
          "SELECT image_url FROM products WHERE id = ?",
          [productId],
          (err, result) => (err ? reject(err) : resolve(result))
        );
      });
      image_url = rows?.image_url || null;
    }

    // Update produk utama
    await new Promise((resolve, reject) => {
      const sqlUpdate = `
        UPDATE products 
        SET name = ?, price = ?, image_url = ?, description = ?, sold_count = ?
        WHERE id = ?
      `;
      const values = [
        name,
        price,
        image_url,
        description,
        sold_count,
        productId,
      ];
      db.query(sqlUpdate, values, (err) => (err ? reject(err) : resolve()));
    });

    // Hapus relasi lama
    const deleteRelasi = [
      "DELETE FROM product_categories WHERE product_id = ?",
      "DELETE FROM product_colors WHERE product_id = ?",
      "DELETE FROM product_sizes WHERE product_id = ?",
    ];
    for (let query of deleteRelasi) {
      await new Promise((resolve, reject) => {
        db.query(query, [productId], (err) => (err ? reject(err) : resolve()));
      });
    }

    // Ambil ID berdasarkan nama
    const getIdsByNames = (table, column, names) => {
      return new Promise((resolve, reject) => {
        if (names.length === 0) return resolve([]);
        const placeholders = names.map(() => "?").join(",");
        db.query(
          `SELECT id FROM ${table} WHERE ${column} IN (${placeholders})`,
          names,
          (err, results) => {
            if (err) return reject(err);
            resolve(results.map((row) => row.id));
          }
        );
      });
    };

    const categoryIds = await getIdsByNames("categories", "name", categories);
    const colorIds = await getIdsByNames("colors", "color_name", colors);
    const sizeIds = await getIdsByNames("sizes", "size_name", sizes);

    const insertRelasi = async (table, column) => {
      let data;
      if (column === "category_id") data = categoryIds;
      else if (column === "color_id") data = colorIds;
      else data = sizeIds;

      if (data.length === 0) return;

      const values = data.map((id) => [productId, id]);
      await new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO ${table} (product_id, ${column}) VALUES ?`,
          [values],
          (err) => (err ? reject(err) : resolve())
        );
      });
    };

    await insertRelasi("product_categories", "category_id");
    await insertRelasi("product_colors", "color_id");
    await insertRelasi("product_sizes", "size_id");

    // Kirim response sukses setelah semua selesai
    res.status(200).json({ message: "Produk berhasil diperbarui" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Gagal update produk", error: err });
  }
};

const deleteProduct = (req, res) => {
  const productId = req.params.id;

  // Hapus data dari tabel relasi terlebih dahulu
  const deleteRelations = `
    DELETE FROM product_colors WHERE product_id = ?;
    DELETE FROM product_sizes WHERE product_id = ?;
    DELETE FROM product_categories WHERE product_id = ?;
  `;

  db.query(deleteRelations, [productId, productId, productId], (err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal menghapus relasi produk", error: err });
    }

    // Setelah semua relasi dihapus, hapus produk
    const deleteProductQuery = "DELETE FROM products WHERE id = ?";
    db.query(deleteProductQuery, [productId], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Gagal menghapus produk", error: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Produk tidak ditemukan" });
      }
      res.status(200).json({ message: "Produk berhasil dihapus" });
    });
  });
};

// ===== CRUD CATEGORY =====
const getCategoryById = (req, res) => {
  const { id } = req.params;

  const sql = "SELECT * FROM categories WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal mengambil data kategori", error: err });
    if (result.length === 0)
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    res.status(200).json(result[0]);
  });
};

const createCategory = (req, res) => {
  const { name } = req.body;
  if (!name)
    return res.status(400).json({ message: "Nama kategori harus diisi" });

  const sql = "INSERT INTO categories (name) VALUES (?)";
  db.query(sql, [name], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal menambahkan kategori", error: err });
    res.status(201).json({
      message: "Kategori berhasil ditambahkan",
      categoryId: result.insertId,
    });
  });
};

const updateCategory = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name)
    return res.status(400).json({ message: "Nama kategori harus diisi" });

  const sql = "UPDATE categories SET name = ? WHERE id = ?";
  db.query(sql, [name, id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal mengubah kategori", error: err });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    res.status(200).json({ message: "Kategori berhasil diperbarui" });
  });
};

const deleteCategory = (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM categories WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal menghapus kategori", error: err });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    res.status(200).json({ message: "Kategori berhasil dihapus" });
  });
};

const getColorById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM colors WHERE id = ?", [id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal mengambil color", error: err });
    if (result.length === 0)
      return res.status(404).json({ message: "Color tidak ditemukan" });
    res.status(200).json(result[0]);
  });
};

const createColor = (req, res) => {
  const { color_name } = req.body;
  if (!color_name)
    return res.status(400).json({ message: "Nama warna harus diisi" });

  db.query(
    "INSERT INTO colors (color_name) VALUES (?)",
    [color_name],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Gagal menambahkan color", error: err });
      res.status(201).json({
        message: "Color berhasil ditambahkan",
        colorId: result.insertId,
      });
    }
  );
};

const updateColor = (req, res) => {
  const { id } = req.params;
  const { color_name } = req.body;
  if (!color_name)
    return res.status(400).json({ message: "Nama warna harus diisi" });

  db.query(
    "UPDATE colors SET color_name = ? WHERE id = ?",
    [color_name, id],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Gagal update color", error: err });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Color tidak ditemukan" });
      res.status(200).json({ message: "Color berhasil diperbarui" });
    }
  );
};

const deleteColor = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM colors WHERE id = ?", [id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal menghapus color", error: err });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Color tidak ditemukan" });
    res.status(200).json({ message: "Color berhasil dihapus" });
  });
};

const getSizeById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM sizes WHERE id = ?", [id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal mengambil size", error: err });
    if (result.length === 0)
      return res.status(404).json({ message: "Size tidak ditemukan" });
    res.status(200).json(result[0]);
  });
};

const createSize = (req, res) => {
  const { size_name } = req.body;
  if (!size_name)
    return res.status(400).json({ message: "Nama ukuran harus diisi" });

  db.query(
    "INSERT INTO sizes (size_name) VALUES (?)",
    [size_name],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Gagal menambahkan size", error: err });
      res.status(201).json({
        message: "Size berhasil ditambahkan",
        sizeId: result.insertId,
      });
    }
  );
};

const updateSize = (req, res) => {
  const { id } = req.params;
  const { size_name } = req.body;
  if (!size_name)
    return res.status(400).json({ message: "Nama ukuran harus diisi" });

  db.query(
    "UPDATE sizes SET size_name = ? WHERE id = ?",
    [size_name, id],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Gagal update size", error: err });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Size tidak ditemukan" });
      res.status(200).json({ message: "Size berhasil diperbarui" });
    }
  );
};

const deleteSize = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM sizes WHERE id = ?", [id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal menghapus size", error: err });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Size tidak ditemukan" });
    res.status(200).json({ message: "Size berhasil dihapus" });
  });
};

const getProductRatingsInfo = (req, res) => {
  const productId = req.params.id;
  const userId = req.query.userId;

  const sql = `
    SELECT 
      (SELECT AVG(rating) FROM ratings WHERE product_id = ?) AS average_rating,
      (SELECT COUNT(*) FROM ratings WHERE product_id = ?) AS total_reviews,
      (SELECT rating FROM ratings WHERE product_id = ? AND user_id = ?) AS user_rating
  `;

  db.query(sql, [productId, productId, productId, userId], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal mengambil data rating", error: err });
    }

    res.status(200).json(result[0]);
  });
};

module.exports = {
  getAllProducts,
  getAllCategories,
  getProductDetails,
  getPopularProducts,
  getAllColors,
  getAllSizes,
  getRecommendedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getColorById,
  createColor,
  updateColor,
  deleteColor,
  getSizeById,
  createSize,
  updateSize,
  deleteSize,
  getProductRatingsInfo,
};
