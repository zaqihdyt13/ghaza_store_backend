const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const cartRoutes = require("./routes/cartRoutes");
const shippingRatesRoutes = require("./routes/shippingRatesRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adsSwiperRoutes = require("./routes/adsSwiperRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

dotenv.config();

const app = express();
// app.use(cors());
app.use(cors({
  origin: "https://www.ghazastore.shop",
}));
app.use(express.json());

app.use("/api", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/shipping-rates", shippingRatesRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/ads", adsSwiperRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/notifications", notificationRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
