const express = require("express");
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Public Routes (Accessible by Midtrans)
router.post("/notification", orderController.handleNotification);

// Protect all routes below
router.use(authMiddleware.protect);

router.post("/", orderController.createOrder);
router.get("/my-orders", orderController.getMyOrders);
router.patch("/:id/cancel", orderController.cancelOrder);
router.patch("/:id/confirm-payment-client", orderController.confirmPaymentClient);

// Staff & Admin Routes
router.patch(
    "/:id/update-status",
    authMiddleware.restrictTo("staff", "admin"),
    orderController.upload.array("photos", 5),
    orderController.updateOrderStatus
);
router.patch(
    "/:id/confirm-payment",
    authMiddleware.restrictTo("staff", "admin"),
    orderController.confirmPayment
);

module.exports = router;
