const Order = require("../models/Order");

const Service = require("../models/Service");
const Settings = require("../models/Settings");
const { notifyUser } = require("../utils/notificationHelper");
const User = require("../models/User");

const snap = require("../utils/midtrans");

exports.createOrder = async (req, res) => {
    try {
        const { items, logistics, payment } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                status: "fail",
                message: "Please provide at least one shoe item",
            });
        }

        // Fetch dynamic prices and settings from DB
        const dbServices = await Service.find();
        const settings = await Settings.findOne() || { shippingRatePerKm: 5000 };
        
        const SERVICE_PRICES = {};
        const ADDON_PRICES = {};
        dbServices.forEach(s => {
            if (s.category === "Additional Cost") {
                ADDON_PRICES[s.name] = s.price;
            } else {
                SERVICE_PRICES[s.name] = s.price;
            }
        });

        // Calculate prices for each item with DB validation
        const processedItems = [];
        for (const item of items) {
            if (!item.serviceType || item.serviceType === "Belum dipilih") {
               return res.status(400).json({
                   status: "fail",
                   message: "Service type cannot be empty",
               });
            }
            if (SERVICE_PRICES[item.serviceType] === undefined) {
               return res.status(400).json({
                   status: "fail",
                   message: `Invalid service type selected: ${item.serviceType}`,
               });
            }

            let itemPrice = SERVICE_PRICES[item.serviceType];
            
            if (item.addons && Array.isArray(item.addons)) {
                for (const addon of item.addons) {
                    if (ADDON_PRICES[addon] !== undefined) {
                        itemPrice += ADDON_PRICES[addon];
                    }
                }
            }

            processedItems.push({
                ...item,
                price: itemPrice,
            });
        }

        // 1. Calculate prices
        const subtotal = processedItems.reduce((acc, item) => acc + item.price, 0);
        let totalLogistics = 0;
        if (logistics.pickupMethod === "pickup") totalLogistics += (settings.shippingRatePerKm || 5000);
        if (logistics.deliveryMethod === "delivery") totalLogistics += (settings.shippingRatePerKm || 5000);
        const totalPrice = subtotal + totalLogistics;

        // 2. Prepare Order Object (But don't save to DB yet if bank payment)
        const orderId = `GS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        let snapToken = null;
        let snapRedirectUrl = null;

        if (payment.method === "bank") {
            try {
                const parameter = {
                    transaction_details: {
                        order_id: orderId,
                        gross_amount: totalPrice,
                    },
                    customer_details: {
                        first_name: req.user.name,
                        email: req.user.email,
                        phone: req.user.phone,
                    },
                    item_details: processedItems.map(item => ({
                        id: item.serviceType,
                        price: item.price,
                        quantity: 1,
                        name: `${item.shoeName} (${item.serviceType})`,
                    })).concat([
                        {
                            id: 'shipping-fee',
                            price: totalLogistics,
                            quantity: 1,
                            name: 'Biaya Penjemputan & Pengantaran'
                        }
                    ]),
                    callbacks: {
                        finish: `${req.protocol}://${req.get('host')}/customer/my-orders`,
                        error: `${req.protocol}://${req.get('host')}/customer/my-orders`,
                        pending: `${req.protocol}://${req.get('host')}/customer/my-orders`
                    }
                };

                const transaction = await snap.createTransaction(parameter);
                snapToken = transaction.token;
                snapRedirectUrl = transaction.redirect_url;
            } catch (snapError) {
                return res.status(400).json({
                    status: "fail",
                    message: "Midtrans Error: " + snapError.message,
                });
            }
        }

        // 3. Save to Database (Only if Snap token is secured or payment is COD)
        const newOrder = await Order.create({
            orderId,
            user: req.user.id,
            items: processedItems,
            logistics: {
                pickupMethod: logistics.pickupMethod,
                deliveryMethod: logistics.deliveryMethod,
                pickupAddress: logistics.pickupAddress,
                pickupPhone: logistics.pickupPhone || req.user.phone,
                deliveryAddress: logistics.deliveryAddress,
                deliveryPhone: logistics.deliveryPhone || req.user.phone,
                pickupFee: logistics.pickupMethod === "pickup" ? (settings.shippingRatePerKm || 5000) : 0,
                deliveryFee: logistics.deliveryMethod === "delivery" ? (settings.shippingRatePerKm || 5000) : 0,
            },
            payment: {
                ...payment,
                snapToken
            },
            totalPrice,
        });

        // Kirim Notifikasi Ganda (In-App & Email) ke Pelanggan
        const paymentMethodLabel = newOrder.payment.method === 'bank' ? 'Transfer Bank' : 'COD (Bayar di Tempat)';
        notifyUser({
            userId: req.user.id,
            email: req.user.email,
            title: "Pesanan Baru Berhasil Dibuat",
            emailSubject: `Goede Shoes - Pemesanan Baru ${newOrder.orderId}`,
            message: `Halo ${req.user.name},\n\nTerima kasih telah melakukan pemesanan di Goede Shoes!\n\nPesanan Anda dengan ID ${newOrder.orderId} telah berhasil dibuat.\nTotal Pembayaran: Rp ${newOrder.totalPrice.toLocaleString('id-ID')}\nMetode Pembayaran: ${paymentMethodLabel}\n\nKami akan segera memproses pesanan Anda. Anda dapat memantau status pesanan langsung melalui dashboard akun Anda.\n\nSalam hangat,\nGoede Shoes Team`,
            type: "order",
            link: "/customer/my-orders"
        });

        // Kirim Notifikasi Ganda ke Semua Staff & Admin
        try {
            const adminAndStaff = await User.find({ role: { $in: ["admin", "staff"] } });
            for (const staffMember of adminAndStaff) {
                notifyUser({
                    userId: staffMember._id,
                    email: staffMember.email,
                    title: "Pesanan Masuk Baru!",
                    emailSubject: `Goede Shoes - Pesanan Baru Masuk ${newOrder.orderId}`,
                    message: `Halo ${staffMember.name},\n\nAda pesanan masuk baru dengan ID ${newOrder.orderId} dari pelanggan ${req.user.name}.\nTotal Pembayaran: Rp ${newOrder.totalPrice.toLocaleString('id-ID')}\nMetode Pembayaran: ${paymentMethodLabel}\n\nSilakan klik notifikasi ini untuk memproses pesanan sekarang.`,
                    type: "order",
                    link: `/staff/order/${newOrder._id}`
                });
            }
        } catch (staffNotifyErr) {
            console.error("Gagal mengirim notifikasi ke staff/admin:", staffNotifyErr);
        }

        res.status(201).json({
            status: "success",
            data: {
                order: newOrder,
                snapToken,
                snapRedirectUrl
            },
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort("-createdAt");

        res.status(200).json({
            status: "success",
            results: orders.length,
            data: {
                orders,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

const multer = require("multer");
const path = require("path");

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads/orders");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, `order-${req.params.id}-${uniqueSuffix}${ext}`);
    },
});

exports.upload = multer({ storage });

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, note } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                status: "fail",
                message: "Order not found",
            });
        }

        // Check if Bank Transfer must be paid first
        if (order.payment.method === 'bank' && order.payment.status !== 'paid') {
            return res.status(400).json({
                status: "fail",
                message: "Pesanan dengan metode Transfer harus dilunasi terlebih dahulu sebelum diproses."
            });
        }

        const historyEntry = {
            status,
            updatedBy: req.user.id,
            updatedAt: Date.now(),
            note,
            photos: [],
        };

        if (req.files && req.files.length > 0) {
            historyEntry.photos = req.files.map(file => `/uploads/orders/${file.filename}`);
        } else if (req.file) {
            historyEntry.photos = [`/uploads/orders/${req.file.filename}`];
        }

        order.status = status;
        order.statusHistory.push(historyEntry);

        await order.save();

        // Kirim Notifikasi Ganda (In-App & Email)
        const populatedOrder = await order.populate("user");
        const statusTranslations = {
            pending: "Menunggu Konfirmasi",
            payment: "Menunggu Pembayaran",
            pickup: "Proses Penjemputan",
            received: "Sepatu Diterima di Workshop",
            "validating-in": "Pengecekan Sepatu",
            "in-progress": "Sedang Dicuci/Diproses",
            "quality-check": "Pemeriksaan Kualitas (QC)",
            delivery: "Sedang Diantar Kembali",
            completed: "Selesai",
            cancelled: "Dibatalkan"
        };
        const indonesianStatus = statusTranslations[status] || status;

        notifyUser({
            userId: populatedOrder.user.id,
            email: populatedOrder.user.email,
            title: `Status Pesanan: ${indonesianStatus}`,
            emailSubject: `Goede Shoes - Status Pesanan ${order.orderId} Diperbarui`,
            message: `Halo ${populatedOrder.user.name},\n\nStatus pesanan Anda dengan ID ${order.orderId} telah diperbarui menjadi: *${indonesianStatus}*.\n\nCatatan dari staff: ${note || '-'}\n\nSilakan cek dashboard Goede Shoes Anda untuk melihat detail selengkapnya.\n\nSalam hangat,\nGoede Shoes Team`,
            type: "order",
            link: "/customer/my-orders"
        });

        res.status(200).json({
            status: "success",
            data: {
                order,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.confirmPayment = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                status: "fail",
                message: "Order not found",
            });
        }

        order.payment.status = "paid";
        order.statusHistory.push({
            status: "paid",
            updatedBy: req.user.id,
            updatedAt: Date.now(),
            note: "Payment confirmed by staff",
        });

        await order.save();

        // Kirim Notifikasi Ganda (In-App & Email)
        const populatedOrder = await order.populate("user");
        notifyUser({
            userId: populatedOrder.user.id,
            email: populatedOrder.user.email,
            title: "Pembayaran Diterima & Terkonfirmasi",
            emailSubject: `Goede Shoes - Pembayaran Berhasil untuk Pesanan ${order.orderId}`,
            message: `Halo ${populatedOrder.user.name},\n\nPembayaran untuk pesanan Anda dengan ID ${order.orderId} telah berhasil kami terima dan konfirmasi!\n\nPesanan Anda akan segera dilanjutkan ke proses berikutnya.\n\nSalam hangat,\nGoede Shoes Team`,
            type: "payment",
            link: "/customer/my-orders"
        });

        res.status(200).json({
            status: "success",
            data: {
                order,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.confirmPaymentClient = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                status: "fail",
                message: "Order not found",
            });
        }

        // Check ownership (only the customer who owns the order can confirm it via client-side redirect)
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: "fail",
                message: "You are not authorized to confirm this payment",
            });
        }

        order.payment.status = "paid";
        // If pickup method is pickup, set order status to pickup. If drop-off (self), keep it pending
        order.status = order.logistics.pickupMethod === "pickup" ? "pickup" : "pending";

        order.statusHistory.push({
            status: "paid",
            updatedBy: req.user.id,
            updatedAt: Date.now(),
            note: "Payment completed successfully via Midtrans client callback",
        });

        await order.save();

        // Send double notifications (In-App & Email)
        const populatedOrder = await order.populate("user");
        notifyUser({
            userId: populatedOrder.user.id,
            email: populatedOrder.user.email,
            title: "Pembayaran Berhasil via Midtrans",
            emailSubject: `Goede Shoes - Pembayaran Berhasil untuk Pesanan ${order.orderId}`,
            message: `Halo ${populatedOrder.user.name},\n\nPembayaran untuk pesanan Anda dengan ID ${order.orderId} via Midtrans telah BERHASIL diterima!\n\nPesanan Anda sekarang masuk ke proses berikutnya.\n\nSalam hangat,\nGoede Shoes Team`,
            type: "payment",
            link: "/customer/my-orders"
        });

        res.status(200).json({
            status: "success",
            message: "Payment successfully updated on client callback",
            data: { order }
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

// 4. Handle Midtrans Notification (Webhook)
exports.handleNotification = async (req, res) => {
    try {
        const statusResponse = req.body;
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`Notification received. Order ID: ${orderId}. Status: ${transactionStatus}`);

        const order = await Order.findOne({ orderId: orderId });

        if (!order) {
            return res.status(404).json({
                status: "error",
                message: "Order not found"
            });
        }

        if (transactionStatus == 'capture') {
            if (fraudStatus == 'challenge') {
                // TODO: set transaction status on your database to 'challenge'
                // e.g: herOrder.paymentStatus = 'challenge';
            } else if (fraudStatus == 'accept') {
                order.payment.status = 'paid';
                // If pickupMethod is pickup, transition to 'pickup'. If 'self' (antar sendiri), remain 'pending'
                order.status = order.logistics.pickupMethod === 'pickup' ? 'pickup' : 'pending';
            }
        } else if (transactionStatus == 'settlement') {
            order.payment.status = 'paid';
            // If pickupMethod is pickup, transition to 'pickup'. If 'self' (antar sendiri), remain 'pending'
            order.status = order.logistics.pickupMethod === 'pickup' ? 'pickup' : 'pending';
        } else if (transactionStatus == 'cancel' ||
            transactionStatus == 'deny' ||
            transactionStatus == 'expire') {
            order.payment.status = 'failed';
        } else if (transactionStatus == 'pending') {
            order.payment.status = 'pending';
        }

        await order.save();

        // Kirim Notifikasi Ganda (In-App & Email)
        const populatedOrder = await order.populate("user");
        if (transactionStatus == 'settlement' || (transactionStatus == 'capture' && fraudStatus == 'accept')) {
            notifyUser({
                userId: populatedOrder.user.id,
                email: populatedOrder.user.email,
                title: "Pembayaran Berhasil via Midtrans",
                emailSubject: `Goede Shoes - Pembayaran Berhasil untuk Pesanan ${order.orderId}`,
                message: `Halo ${populatedOrder.user.name},\n\nPembayaran untuk pesanan Anda dengan ID ${order.orderId} via Midtrans telah BERHASIL diterima!\n\nPesanan Anda sekarang masuk ke proses penjemputan (pickup).\n\nSalam hangat,\nGoede Shoes Team`,
                type: "payment",
                link: "/customer/my-orders"
            });
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            notifyUser({
                userId: populatedOrder.user.id,
                email: populatedOrder.user.email,
                title: "Pembayaran Gagal / Kedaluwarsa",
                emailSubject: `Goede Shoes - Pembayaran Gagal / Kedaluwarsa ${order.orderId}`,
                message: `Halo ${populatedOrder.user.name},\n\nPembayaran untuk pesanan Anda dengan ID ${order.orderId} telah gagal, dibatalkan, atau kedaluwarsa.\n\nSilakan lakukan pemesanan ulang atau hubungi kami jika Anda memiliki pertanyaan.\n\nSalam hangat,\nGoede Shoes Team`,
                type: "payment",
                link: "/customer/my-orders"
            });
        }

        return res.status(200).json({
            status: "success",
            message: "OK"
        });
    } catch (err) {
        console.error("Webhook Error:", err);
        return res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                status: "fail",
                message: "Order not found",
            });
        }

        // Check ownership
        const isStaffOrAdmin = ["admin", "staff"].includes(req.user.role);
        if (order.user.toString() !== req.user._id.toString() && !isStaffOrAdmin) {
            return res.status(403).json({
                status: "fail",
                message: "You are not authorized to cancel this order",
            });
        }

        // Check if status allows cancellation (Always allow for staff/admin, check for customers)
        const allowedStatuses = ["pending", "payment", "pickup"];
        if (!isStaffOrAdmin && !allowedStatuses.includes(order.status)) {
            return res.status(400).json({
                status: "fail",
                message: `Cannot cancel order with status: ${order.status}`,
            });
        }

        // Prevent cancellation if already paid (Only for customers, staff/admin can bypass)
        if (!isStaffOrAdmin && order.payment && order.payment.status === "paid") {
            return res.status(400).json({
                status: "fail",
                message: "Paid orders cannot be cancelled automatically. Please contact admin for a refund.",
            });
        }

        // Update status
        order.status = "cancelled";
        order.statusHistory.push({
            status: "cancelled",
            updatedBy: req.user._id,
            note: "Dibatalkan oleh pelanggan",
        });

        await order.save();

        // Kirim Notifikasi Ganda (In-App & Email) ke Pelanggan
        const populatedOrder = await order.populate("user");
        notifyUser({
            userId: populatedOrder.user.id,
            email: populatedOrder.user.email,
            title: "Pesanan Dibatalkan",
            emailSubject: `Goede Shoes - Pesanan ${order.orderId} Dibatalkan`,
            message: `Halo ${populatedOrder.user.name},\n\nPesanan Anda dengan ID ${order.orderId} telah dibatalkan.\n\nJika ini adalah kekeliruan atau Anda membutuhkan bantuan lebih lanjut, silakan hubungi tim customer service kami.\n\nSalam hangat,\nGoede Shoes Team`,
            type: "order",
            link: "/customer/my-orders"
        });

        // Kirim Notifikasi Ganda ke Semua Staff & Admin
        try {
            const adminAndStaff = await User.find({ role: { $in: ["admin", "staff"] } });
            for (const staffMember of adminAndStaff) {
                notifyUser({
                    userId: staffMember._id,
                    email: staffMember.email,
                    title: "Pesanan Dibatalkan!",
                    emailSubject: `Goede Shoes - Pesanan Dibatalkan ${order.orderId}`,
                    message: `Halo ${staffMember.name},\n\nPesanan dengan ID ${order.orderId} telah dibatalkan oleh pelanggan ${populatedOrder.user.name}.\n\nSilakan periksa dashboard untuk detail pembaruan.`,
                    type: "order",
                    link: `/staff/order/${order._id}`
                });
            }
        } catch (staffNotifyErr) {
            console.error("Gagal mengirim notifikasi pembatalan ke staff/admin:", staffNotifyErr);
        }

        res.status(200).json({
            status: "success",
            message: "Order cancelled successfully",
            data: order,
        });
    } catch (err) {
        console.error("Cancel order error:", err);
        res.status(500).json({
            status: "error",
            message: "An internal server error occurred",
        });
    }
};
