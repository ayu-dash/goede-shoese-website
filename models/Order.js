const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Order must belong to a user"],
        },
        items: [
            {
                shoeName: {
                    type: String,
                    required: [true, "Please provide the shoe name"],
                },
                serviceType: {
                    type: String,
                    required: [true, "Please provide the service type"],
                },
                addons: [String],
                price: {
                    type: Number,
                    required: [true, "Item must have a price"],
                },
            },
        ],
        logistics: {
            pickupMethod: {
                type: String,
                enum: ["self", "pickup"],
                default: "pickup",
            },
            deliveryMethod: {
                type: String,
                enum: ["self", "delivery"],
                default: "delivery",
            },
            pickupAddress: {
                type: String,
            },
            deliveryAddress: {
                type: String,
            },
        },
        payment: {
            method: {
                type: String,
                enum: ["bank", "cod"],
                default: "bank",
            },
            status: {
                type: String,
                enum: ["pending", "paid"],
                default: "pending",
            },
        },
        status: {
            type: String,
            enum: ["pending", "pickup", "in-progress", "delivery", "completed", "cancelled"],
            default: "pending",
        },
        totalPrice: {
            type: Number,
            required: [true, "Order must have a total price"],
        },
        orderId: {
            type: String,
            unique: true,
        },
        statusHistory: [
            {
                status: String,
                updatedAt: { type: Date, default: Date.now },
                updatedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
                note: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Generate custom order ID before saving
orderSchema.pre("save", async function () {
    if (!this.orderId) {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const random = Math.floor(1000 + Math.random() * 9000);
        this.orderId = `GS-${year}${month}${random}`;
    }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
