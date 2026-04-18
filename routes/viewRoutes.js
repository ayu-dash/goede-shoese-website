const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middlewares/authMiddleware");

router.get("/", (req, res) => res.render("index"));
router.get("/login", (req, res) => res.render("auth/login"));
router.get("/register", (req, res) => res.render("auth/register"));
router.get("/verify", (req, res) => res.render("auth/verify"));
router.get("/forgot-password", (req, res) => res.render("auth/forgot-password"));
router.get("/reset-password", (req, res) => res.render("auth/reset-password"));

router.get("/customer/dashboard", protect, restrictTo("customer"), (req, res) => res.render("customer/dashboard"));
router.get("/staff/dashboard", protect, restrictTo("staff"), (req, res) => res.render("staff/dashboard"));
router.get("/admin/dashboard", protect, restrictTo("admin"), (req, res) => res.render("admin/dashboard"));

module.exports = router;
