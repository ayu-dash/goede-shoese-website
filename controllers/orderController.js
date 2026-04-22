const Order = require("../models/Order");

const Service = require("../models/Service");

const LOGISTICS_FEE = 15000;

exports.createOrder = async (req, res) => {
    try {
        const { items, logistics, payment } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                status: "fail",
                message: "Please provide at least one shoe item",
            });
        }

        // Fetch dynamic prices from DB
        const dbServices = await Service.find({ isActive: true });
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

        const subtotal = processedItems.reduce((acc, item) => acc + item.price, 0);
        const totalLogistics = (logistics.pickupMethod === "pickup" || logistics.deliveryMethod === "delivery") ? LOGISTICS_FEE : 0;
        const totalPrice = subtotal + totalLogistics;

        const newOrder = await Order.create({
            user: req.user.id,
            items: processedItems,
            logistics: {
                pickupMethod: logistics.pickupMethod,
                deliveryMethod: logistics.deliveryMethod,
                pickupAddress: logistics.pickupAddress,
                deliveryAddress: logistics.deliveryAddress,
            },
            payment,
            totalPrice,
        });

        res.status(201).json({
            status: "success",
            data: {
                order: newOrder,
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
