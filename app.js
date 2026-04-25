const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const viewRoutes = require("./routes/viewRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const adminRoutes = require("./routes/adminRoutes");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const Settings = require("./models/Settings");
const Service = require("./models/Service");

// Global middleware to make settings available in all views (for footer, etc.)
app.use(async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default if not exists
      settings = await Settings.create({});
    }
    res.locals.settings = settings;

    // Fetch unique categories for footer
    const categories = await Service.distinct("category", { category: { $ne: "Additional Cost" } });
    res.locals.serviceCategories = categories.slice(0, 5);
    
    next();
  } catch (err) {
    console.error("Settings middleware error:", err);
    next();
  }
});

app.use("/", viewRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/admin", adminRoutes);

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Goede Shoes running on port ${PORT}`));
