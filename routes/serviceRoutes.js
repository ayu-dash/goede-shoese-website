const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// Protect all routes after this middleware
router.use(protect);
router.use(restrictTo("admin"));

router.route("/")
    .get(serviceController.getAllServices)
    .post(serviceController.createService);

router.route("/:id")
    .patch(serviceController.updateService)
    .delete(serviceController.deleteService);

module.exports = router;
