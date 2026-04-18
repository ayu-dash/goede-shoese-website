const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const viewRoutes = require("./routes/viewRoutes");
const authRoutes = require("./routes/authRoutes");
const connectDB = require("./config/db");


const app = express();


// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set Routes
app.use("/", viewRoutes);
app.use("/api/auth", authRoutes);


// Database connection
connectDB();



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Goede Shoes running on port ${PORT}`));
