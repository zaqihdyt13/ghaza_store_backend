const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const db = mysql.createConnection({
  // host: process.env.DB_HOST,
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,
  // database: process.env.DB_NAME,
  // host: process.env.MYSQLHOST,
  host: "yamabiko.proxy.rlwy.net",
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  // password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQLDATABASE,
  port: 31260,
  multipleStatements: true,
  typeCast: function (field, next) {
    if (field.type === "NEWDECIMAL" || field.type === "DECIMAL") {
      const val = field.string();
      return val === null ? null : Number(val);
    }
    return next();
  },
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL database");
});

module.exports = db;
