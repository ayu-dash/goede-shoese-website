const express = require("express");
const router = express.Router();
// Dinonaktifkan sementara untuk frontend dev agar tidak diblock halaman login
// const { protect, restrictTo } = require("../middlewares/authMiddleware");

router.get("/", (req, res) => res.render("index"));
router.get("/login", (req, res) => res.render("auth/login"));
router.get("/register", (req, res) => res.render("auth/register"));
router.get("/verify", (req, res) => res.render("auth/verify"));
router.get("/forgot-password", (req, res) =>
  res.render("auth/forgot-password"),
);
router.get("/reset-password", (req, res) => res.render("auth/reset-password"));

// Rute Dashboard (Semua Middleware Auth sementara dinonaktifkan untuk UI dev)
router.get("/customer/dashboard", (req, res) =>
  res.render("customer/dashboard", { activePage: "dashboard" }),
);
router.get("/customer/create-order", (req, res) =>
  res.render("customer/create-order", { activePage: "dashboard" }),
);
router.get("/customer/my-orders", (req, res) =>
  res.render("customer/my-orders", { activePage: "my-orders" }),
);
router.get("/customer/order-detail", (req, res) =>
  res.render("customer/order-detail", { activePage: "my-orders" }),
);
router.get("/customer/profile", (req, res) =>
  res.render("customer/profile", { activePage: "profile" }),
);

router.get("/staff/dashboard", (req, res) => res.render("staff/dashboard"));
router.get("/admin/dashboard", (req, res) => res.render("admin/dashboard"));

module.exports = router;
