const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/productController");
const upload = require("../middleware/upload");

router.get("/products", getAllProducts);
router.get("/categories", getAllCategories);
router.get("/products/popular", getPopularProducts);
router.get("/products/:id", getProductDetails);
router.get("/colors", getAllColors);
router.get("/sizes", getAllSizes);
router.get("/products/:id/recommendations", getRecommendedProducts);
router.post("/products", upload.single("image"), createProduct);
router.put("/products/:id", upload.single("image"), updateProduct);
router.delete("/products/:id", deleteProduct);
router.get("/categories/:id", getCategoryById);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);
router.get("/colors/:id", getColorById);
router.post("/colors", createColor);
router.put("/colors/:id", updateColor);
router.delete("/colors/:id", deleteColor);
router.get("/sizes/:id", getSizeById);
router.post("/sizes", createSize);
router.put("/sizes/:id", updateSize);
router.delete("/sizes/:id", deleteSize);

module.exports = router;
