const db = require("../models/db");

// Bungkus db.execute menjadi Promise agar bisa digunakan dengan await
function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.execute(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

const addToCart = async (req, res) => {
  let { product_id, quantity } = req.body;
  const user_id = req.user.id;

  if (!product_id || !quantity) {
    return res.status(400).json({ message: "Data tidak lengkap." });
  }

  product_id = parseInt(product_id);
  quantity = parseInt(quantity);

  if (isNaN(product_id) || isNaN(quantity) || quantity <= 0) {
    return res
      .status(400)
      .json({ message: "ID produk atau jumlah tidak valid." });
  }

  try {
    const existing = await query(
      "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
      [user_id, product_id]
    );

    if (existing.length > 0) {
      const newQty = existing[0].quantity + quantity;
      await query("UPDATE cart_items SET quantity = ? WHERE id = ?", [
        newQty,
        existing[0].id,
      ]);
      return res
        .status(200)
        .json({ message: "Jumlah produk diperbarui di keranjang." });
    } else {
      await query(
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
        [user_id, product_id, quantity]
      );
      return res
        .status(201)
        .json({ message: "Produk ditambahkan ke keranjang." });
    }
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ message: "Gagal menambahkan ke keranjang." });
  }
};

const getCartItems = async (req, res) => {
  const user_id = req.user.id;
  console.log(user_id)

  try {
    const cartItems = await query(
      `SELECT 
        ci.id AS cart_id,
        ci.quantity,
        p.id AS product_id,
        p.name,
        p.price,
        p.image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?`,
      [user_id]
    );

    res.status(200).json(cartItems);
    console.log(cartItems)
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil isi keranjang." });
  }
};

const updateCartItem = async (req, res) => {
  const user_id = parseInt(req.user.id); // pastikan integer
  const cartItemId = parseInt(req.params.cartItemId); // pastikan integer
  const { quantity } = req.body;

  if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
    return res.status(400).json({ message: "Jumlah tidak valid." });
  }

  try {
    console.log("Updating cart item:", { user_id, cartItemId, quantity });

    const result = await query(
      "UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?",
      [quantity, cartItemId, user_id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Item tidak ditemukan atau bukan milik user." });
    }

    res.status(200).json({ message: "Item keranjang diperbarui." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui item keranjang." });
  }
};

const deleteCartItem = async (req, res) => {
  const user_id = parseInt(req.user.id); // pastikan integer
  const cartItemId = parseInt(req.params.cartItemId); // pastikan integer

  try {
    console.log("Deleting cart item:", { user_id, cartItemId });

    const result = await query(
      "DELETE FROM cart_items WHERE id = ? AND user_id = ?",
      [cartItemId, user_id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Item tidak ditemukan atau bukan milik user." });
    }

    res.status(200).json({ message: "Item berhasil dihapus dari keranjang." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus item dari keranjang." });
  }
};

module.exports = {
  addToCart,
  getCartItems,
  updateCartItem,
  deleteCartItem,
};
