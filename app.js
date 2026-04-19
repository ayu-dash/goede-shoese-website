const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const viewRoutes = require("./routes/viewRoutes");
const authRoutes = require("./routes/authRoutes");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", viewRoutes);
app.use("/api/auth", authRoutes);

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Goede Shoes running on port ${PORT}`));
