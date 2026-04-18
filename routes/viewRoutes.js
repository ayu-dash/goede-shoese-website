const express = require("express");
const router = express.Router();

router.get("/", (req, res) => res.render("index"));
router.get("/login", (req, res) => res.render("auth/login"));
router.get("/register", (req, res) => res.render("auth/register"));
router.get("/verify", (req, res) => res.render("auth/verify"));
router.get("/forgot-password", (req, res) => res.render("auth/forgot-password"));
router.get("/reset-password", (req, res) => res.render("auth/reset-password"));

module.exports = router;
