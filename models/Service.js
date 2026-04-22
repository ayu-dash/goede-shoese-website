const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Layanan harus memiliki nama"],
            trim: true
        },
        category: {
            type: String,
            required: [true, "Layanan harus memiliki kategori"],
            enum: ["Menu Treatment", "Reglue & Repair", "Helmet Treatment", "Bag & Luggage", "Repaint", "Additional Cost", "Main Treatment"]
        },
        price: {
            type: Number,
            required: [true, "Layanan harus memiliki harga"]
        },
        estimatedTimeMin: {
            type: Number,
            required: [true, "Estimasi waktu minimal harus diisi"]
        },
        estimatedTimeMax: {
            type: Number,
            required: [true, "Estimasi waktu maksimal harus diisi"]
        },
        estimatedTimeUnit: {
            type: String,
            required: [true, "Satuan waktu harus diisi"],
            enum: ["Hari", "Minggu"]
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Service", serviceSchema);
