const express = require("express");
const router = express.Router();
const { getShippingRates } = require("../controllers/shippingRatesController");

router.get("/", getShippingRates);

module.exports = router;
