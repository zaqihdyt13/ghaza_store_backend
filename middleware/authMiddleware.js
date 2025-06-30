const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  // Format token biasanya: Bearer <token>
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ message: "Akses ditolak. Token tidak tersedia." });

  jwt.verify(token,  process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token tidak valid." });

    req.user = user; // Simpan data user dari token
    next();
  });
};

module.exports = verifyToken;
