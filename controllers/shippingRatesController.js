const db = require("../models/db"); 

const getShippingRates = (req, res) => {
  const query = "SELECT city, shipping_cost FROM shipping_rates";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching shipping rates:", err);
      return res
        .status(500)
        .json({ error: "Gagal mengambil data ongkos kirim" });
    }
    res.json(results);
  });
};

module.exports = {
  getShippingRates,
};
