const db = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

exports.register = (req, res) => {
  // const { username, email, password } = req.body;
  const { username, email, password, role = "user" } = req.body;

  const checkSql = "SELECT * FROM users WHERE email = ?";
  db.query(checkSql, [email], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length)
      return res.status(400).json({ message: "Email sudah terdaftar" });

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const insertSql =
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";
    db.query(
      insertSql,
      [username, email, hashedPassword, role],
      (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ message: "Registrasi berhasil" });
      }
    );
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0)
      return res.status(404).json({ message: "User tidak ditemukan" });

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Password salah" });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  });
};
