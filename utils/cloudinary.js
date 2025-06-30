const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dc5ajmn6z",
  api_key: "895786275635639",
  api_secret: process.env.CLOUDINARY_SECRET, // simpan di .env
});

module.exports = cloudinary;
