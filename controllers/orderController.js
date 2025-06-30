// orderController.js
const db = require("../models/db");
const midtransClient = require("midtrans-client");

// Fungsi untuk membungkus db.execute menjadi Promise
function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.execute(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Buat Snap instance
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: "SB-Mid-server-ArCI4T6MXzhKUJKMSGkV0KSF", // ganti sesuai server key midtrans kamu
});

// Create order dan generate Snap token
const createOrder = async (req, res) => {
  const user_id = req.user.id;
  const { city, address, shipping_cost, total_price, items } = req.body;

  if (
    !city ||
    !address ||
    !shipping_cost ||
    !total_price ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res
      .status(400)
      .json({ message: "Data tidak lengkap atau items kosong." });
  }

  try {
    // Insert ke tabel orders
    const result = await query(
      "INSERT INTO orders (user_id, city, address, shipping_cost, total_price, status) VALUES (?, ?, ?, ?, ?, ?)",
      [user_id, city, address, shipping_cost, total_price, "pending"]
    );

    const orderId = result.insertId;
    const midtransOrderId = `ORDER-${orderId}-${Date.now()}`;

    // Insert ke order_items (loop items)
    for (const item of items) {
      const { product_id, quantity, price, subtotal, size, color } = item;
      if (!product_id || !quantity || !price || !subtotal || !size || !color) {
        return res.status(400).json({ message: "Data item tidak lengkap." });
      }

      await query(
        "INSERT INTO order_items (order_id, product_id, quantity, price, subtotal, size, color) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [orderId, product_id, quantity, price, subtotal, size, color]
      );
    }

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: total_price,
      },
      customer_details: {
        first_name: `User-${user_id}`,
        email: "dummy@email.com",
        address,
      },
      // callbacks: {
      //   finish: "http://localhost:5173/", // <- Ganti ke URL frontend kamu
      // },
    };

    const snapResponse = await snap.createTransaction(parameter);

    // Update order dengan midtrans_order_id
    await query("UPDATE orders SET midtrans_order_id = ? WHERE id = ?", [
      midtransOrderId,
      orderId,
    ]);

    res.status(201).json({
      message: "Pesanan berhasil dibuat.",
      orderId,
      snapToken: snapResponse.token, // penting, kirim token ke frontend
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: "Gagal membuat pesanan." });
  }
};

const handleNotification = async (req, res) => {
  const notif = req.body;
  const orderId = notif.order_id;
  const transactionStatus = notif.transaction_status;

  let status = "pending";
  if (transactionStatus === "settlement" || transactionStatus === "capture") {
    status = "paid";
  } else if (transactionStatus === "expire") {
    status = "expired";
  } else if (transactionStatus === "cancel") {
    status = "cancelled";
  }

  try {
    // Update status pesanan
    await query("UPDATE orders SET status = ? WHERE midtrans_order_id = ?", [
      status,
      orderId,
    ]);

    if (status === "paid") {
      // Ambil user_id dari order
      const [order] = await query(
        "SELECT id, user_id FROM orders WHERE midtrans_order_id = ?",
        [orderId]
      );

      if (order && order.user_id) {
        // Hapus cart_items
        await query("DELETE FROM cart_items WHERE user_id = ?", [
          order.user_id,
        ]);

        // Ambil daftar item pada pesanan
        const orderItems = await query(
          "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
          [order.id]
        );

        // Update sold_count tiap produk
        for (const item of orderItems) {
          await query(
            "UPDATE products SET sold_count = sold_count + ? WHERE id = ?",
            [item.quantity, item.product_id]
          );
        }
      }
    }

    res.status(200).json({ message: "Notifikasi berhasil diproses" });
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).json({ message: "Gagal memproses notifikasi" });
  }
};

// Mengambil semua order (khusus admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await query(`
      SELECT 
        o.id,
        u.username AS user_name,
        u.email,
        o.city,
        o.address,
        o.total_price,
        o.status,
        o.created_at,
        o.midtrans_order_id
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.status(200).json(orders);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil semua pesanan." });
  }
};

// Mengambil semua pesanan milik pengguna yang sedang login
const getUserOrders = async (req, res) => {
  const user_id = req.user.id;

  try {
    const orders = await query("SELECT * FROM orders WHERE user_id = ?", [
      user_id,
    ]);
    res.status(200).json(orders);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil data pesanan." });
  }
};

const getOrderDetail = async (req, res) => {
  const orderId = req.params.id;

  try {
    // Cari order tanpa filter user_id (karena ini admin)
    const order = await query("SELECT * FROM orders WHERE id = ?", [orderId]);

    if (order.length === 0) {
      return res.status(404).json({ message: "Order tidak ditemukan." });
    }

    const items = await query(
      `SELECT oi.id, oi.quantity, oi.price, oi.subtotal, p.name, p.image_url, p.description, p.sold_count, p.average_rating
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.status(200).json({
      order: order[0],
      items,
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil detail order." });
  }
};

const updateOrderStatus = async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  try {
    // 1. Update status order
    await query("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);

    // 2. Ambil user_id dari order
    const [orderResult] = await query(
      "SELECT user_id FROM orders WHERE id = ?",
      [orderId]
    );
    const userId = orderResult?.user_id;

    if (!userId) {
      return res
        .status(404)
        .json({ message: "User ID tidak ditemukan untuk pesanan ini" });
    }

    // 3. Ambil nama user dari tabel users
    const [userResult] = await query("SELECT username FROM users WHERE id = ?", [
      userId,
    ]);
    const userName = userResult?.username || "Pelanggan";

    // 4. Jika status = shipped, kirim notifikasi
    if (status === "shipped") {
      const message = `Halo ${userName}, pesanan Anda dengan ID #${orderId} telah dikirim. Harap ditunggu kedatangannya!`;
      await query(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [userId, "Pesanan Anda Telah Dikirim", message]
      );
    }

    // 5. Jika status = delivered, kirim notifikasi terima kasih
    if (status === "delivered") {
      const message = `Terima kasih ${userName}, kami telah menerima konfirmasi bahwa pesanan #${orderId} sudah sampai. Semoga Anda puas berbelanja di Ghaza Store!`;
      await query(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [userId, "Pesanan Telah Diterima", message]
      );
    }

    res.status(200).json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getUserOrders,
  handleNotification,
  getOrderDetail,
  updateOrderStatus,
};
