const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            unique: true,
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Order must belong to a user"],
            index: true,
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
                notes: String,
                photosBefore: [String],
                photosAfter: [String],
            },
        ],

        // =========================================================================
        // NEW DECOUPLED STATE MACHINE FIELDS (INDIAN) - FOR SCALABILITY & CLEAN DB
        // =========================================================================
        statusOrder: {
            type: String,
            enum: ["menunggu_konfirmasi", "terkonfirmasi", "diproses", "siap_dikembalikan", "selesai", "dibatalkan"],
            default: "menunggu_konfirmasi",
            index: true,
        },
        statusOperasionalWorkshop: {
            type: String,
            enum: ["belum_mulai", "pengecekan_awal", "pencucian", "pengeringan", "pemeriksaan_qc", "pengemasan"],
            default: "belum_mulai",
        },
        infoPenjemputan: {
            metode: {
                type: String,
                enum: ["antar_sendiri", "jemput_kurir"],
                default: "jemput_kurir",
            },
            status: {
                type: String,
                enum: ["tidak_berlaku", "menunggu_antar_mandiri", "menunggu_penjemputan", "sedang_dijemput", "telah_diambil", "diterima_di_workshop", "dibatalkan"],
                default: "menunggu_penjemputan",
            },
            alamat: String,
            telepon: String,
            kurir: {
                type: mongoose.Schema.ObjectId,
                ref: "User",
            },
            biaya: {
                type: Number,
                default: 0,
            },
            catatan: String,
            waktuDijemput: Date,
            waktuDiterimaWorkshop: Date,
        },
        infoPengantaran: {
            metode: {
                type: String,
                enum: ["ambil_sendiri", "antar_kurir"],
                default: "antar_kurir",
            },
            status: {
                type: String,
                enum: ["tidak_berlaku", "menunggu_ambil_mandiri", "menunggu_pengantaran", "sedang_diantar", "telah_diterima", "diambil_oleh_pelanggan", "dibatalkan"],
                default: "menunggu_pengantaran",
            },
            alamat: String,
            telepon: String,
            kurir: {
                type: mongoose.Schema.ObjectId,
                ref: "User",
            },
            biaya: {
                type: Number,
                default: 0,
            },
            catatan: String,
            waktuDiantar: Date,
            waktuDiterimaPelanggan: Date,
        },
        infoPembayaran: {
            metode: {
                type: String,
                enum: ["bank", "cod"],
                default: "bank",
                index: true,
            },
            status: {
                type: String,
                enum: ["belum_dibayar", "menunggu_pembayaran", "lunas", "gagal", "dikembalikan"],
                default: "belum_dibayar",
                index: true,
            },
            snapToken: String,
            snapRedirectUrl: String,
            transactionId: String,
            paymentType: String,
            waktuLunas: Date,
            waktuRefund: Date,
        },
        riwayatStatus: [
            {
                kategori: {
                    type: String,
                    enum: ["order", "pembayaran", "penjemputan", "pengantaran", "operasional"],
                    required: true,
                },
                dariStatus: String,
                keStatus: String,
                waktuUpdate: { type: Date, default: Date.now },
                diupdateOleh: { type: mongoose.Schema.ObjectId, ref: "User" },
                catatan: String,
                fotoBukti: [String],
            },
        ],

        // =========================================================================
        // OLD DATABASE FIELDS - RETAINED FOR ABSOLUTE BACKWARD COMPATIBILITY
        // =========================================================================
        status: {
            type: String,
            enum: ["pending", "payment", "pickup", "received", "validating-in", "in-progress", "quality-check", "delivery", "completed", "cancelled"],
            default: "pending",
        },
        payment: {
            method: {
                type: String,
                enum: ["bank", "cod"],
                default: "bank",
            },
            status: {
                type: String,
                enum: ["pending", "paid", "failed"],
                default: "pending",
            },
            snapToken: String,
        },
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
            pickupAddress: String,
            pickupPhone: String,
            deliveryAddress: String,
            deliveryPhone: String,
            pickupFee: {
                type: Number,
                default: 0,
            },
            deliveryFee: {
                type: Number,
                default: 0,
            },
        },
        statusHistory: [
            {
                status: String,
                updatedAt: { type: Date, default: Date.now },
                updatedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
                note: String,
                photos: [String],
            },
        ],

        totalPrice: {
            type: Number,
            required: [true, "Order must have a total price"],
        },
    },
    {
        timestamps: true,
    }
);

// =========================================================================
// BIDIRECTIONAL STATE SYNCHRONIZATION HOOK
// =========================================================================
orderSchema.pre("save", async function () {
    // 1. Generate Custom Order ID
    if (!this.orderId) {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const random = Math.floor(1000 + Math.random() * 9000);
        this.orderId = `GS-${year}${month}${random}`;
    }

    // 2. A: Sync Old Fields to New Fields if Old Fields are Modified
    if (this.isModified("status")) {
        const val = this.status;
        if (val === "cancelled") {
            this.statusOrder = "dibatalkan";
            this.infoPenjemputan.status = "dibatalkan";
            this.infoPengantaran.status = "dibatalkan";
        } else if (val === "completed") {
            this.statusOrder = "selesai";
            this.infoPengantaran.status = this.infoPengantaran.metode === "antar_kurir" ? "telah_diterima" : "diambil_oleh_pelanggan";
        } else if (val === "delivery") {
            this.statusOrder = "siap_dikembalikan";
            this.infoPengantaran.status = "menunggu_pengantaran";
        } else if (val === "quality-check") {
            this.statusOrder = "siap_dikembalikan";
            this.statusOperasionalWorkshop = "pemeriksaan_qc";
        } else if (val === "in-progress") {
            this.statusOrder = "diproses";
            this.statusOperasionalWorkshop = "pencucian";
        } else if (val === "validating-in") {
            this.statusOrder = "diproses";
            this.statusOperasionalWorkshop = "pengecekan_awal";
        } else if (val === "received") {
            this.statusOrder = "diproses";
            this.infoPenjemputan.status = "diterima_di_workshop";
        } else if (val === "pickup") {
            this.infoPenjemputan.status = "sedang_dijemput";
        } else if (val === "payment") {
            this.infoPembayaran.status = "menunggu_pembayaran";
        } else if (val === "pending") {
            this.statusOrder = "menunggu_konfirmasi";
        }
    }

    if (this.isModified("payment")) {
        if (this.payment.method) this.infoPembayaran.metode = this.payment.method;
        if (this.payment.status) {
            this.infoPembayaran.status = this.payment.status === "paid" ? "lunas" : (this.payment.status === "failed" ? "gagal" : "menunggu_pembayaran");
        }
        if (this.payment.snapToken) this.infoPembayaran.snapToken = this.payment.snapToken;
    }

    if (this.isModified("logistics")) {
        if (this.logistics.pickupMethod) {
            this.infoPenjemputan.metode = this.logistics.pickupMethod === "self" ? "antar_sendiri" : "jemput_kurir";
        }
        if (this.logistics.deliveryMethod) {
            this.infoPengantaran.metode = this.logistics.deliveryMethod === "self" ? "ambil_sendiri" : "antar_kurir";
        }
        if (this.logistics.pickupAddress !== undefined) this.infoPenjemputan.alamat = this.logistics.pickupAddress;
        if (this.logistics.pickupPhone !== undefined) this.infoPenjemputan.telepon = this.logistics.pickupPhone;
        if (this.logistics.deliveryAddress !== undefined) this.infoPengantaran.alamat = this.logistics.deliveryAddress;
        if (this.logistics.deliveryPhone !== undefined) this.infoPengantaran.telepon = this.logistics.deliveryPhone;
        if (this.logistics.pickupFee !== undefined) this.infoPenjemputan.biaya = this.logistics.pickupFee;
        if (this.logistics.deliveryFee !== undefined) this.infoPengantaran.biaya = this.logistics.deliveryFee;
    }

    if (this.isModified("statusHistory")) {
        this.riwayatStatus = this.statusHistory.map(h => ({
            kategori: "order",
            dariStatus: "menunggu_konfirmasi",
            keStatus: h.status,
            waktuUpdate: h.updatedAt || Date.now(),
            diupdateOleh: h.updatedBy,
            catatan: h.note,
            fotoBukti: h.photos || [],
        }));
    }

    // 3. B: Sync New Fields to Old Fields if New Fields are Modified (for EJS Views)
    if (this.isModified("statusOrder") || this.isModified("infoPenjemputan.status") || this.isModified("infoPengantaran.status") || this.isModified("statusOperasionalWorkshop")) {
        if (this.statusOrder === "dibatalkan") {
            this.status = "cancelled";
        } else if (this.statusOrder === "selesai") {
            this.status = "completed";
        } else if (this.statusOrder === "siap_dikembalikan") {
            this.status = this.infoPengantaran.metode === "antar_kurir" ? "delivery" : "quality-check";
        } else if (this.statusOrder === "diproses") {
            if (this.statusOperasionalWorkshop === "pengecekan_awal") this.status = "validating-in";
            else if (this.statusOperasionalWorkshop === "pemeriksaan_qc") this.status = "quality-check";
            else if (this.statusOperasionalWorkshop === "pencucian") this.status = "in-progress";
            else this.status = "received";
        } else if (this.infoPenjemputan.status === "sedang_dijemput" || this.infoPenjemputan.status === "telah_diambil") {
            this.status = "pickup";
        } else if (this.infoPenjemputan.status === "diterima_di_workshop") {
            this.status = "received";
        } else if (this.infoPembayaran.status === "menunggu_pembayaran" && this.infoPembayaran.metode === "bank") {
            this.status = "payment";
        } else {
            this.status = "pending";
        }
    }

    if (this.isModified("infoPembayaran")) {
        this.payment = {
            method: this.infoPembayaran.metode,
            status: this.infoPembayaran.status === "lunas" ? "paid" : (this.infoPembayaran.status === "gagal" ? "failed" : "pending"),
            snapToken: this.infoPembayaran.snapToken,
        };
    }

    if (this.isModified("infoPenjemputan") || this.isModified("infoPengantaran")) {
        this.logistics = {
            pickupMethod: this.infoPenjemputan.metode === "antar_sendiri" ? "self" : "pickup",
            deliveryMethod: this.infoPengantaran.metode === "ambil_sendiri" ? "self" : "delivery",
            pickupAddress: this.infoPenjemputan.alamat,
            pickupPhone: this.infoPenjemputan.telepon,
            deliveryAddress: this.infoPengantaran.alamat,
            deliveryPhone: this.infoPengantaran.telepon,
            pickupFee: this.infoPenjemputan.biaya,
            deliveryFee: this.infoPengantaran.biaya,
        };
    }

    if (this.isModified("riwayatStatus")) {
        this.statusHistory = this.riwayatStatus.map(r => ({
            status: r.keStatus,
            updatedAt: r.waktuUpdate,
            updatedBy: r.diupdateOleh,
            note: r.catatan,
            photos: r.fotoBukti,
        }));
    }

    // 4. Default Setup for Pickup and Delivery methods on initial booking
    if (this.infoPenjemputan.metode === "antar_sendiri" && this.infoPenjemputan.status === "menunggu_penjemputan") {
        this.infoPenjemputan.status = "menunggu_antar_mandiri";
    }
    if (this.infoPengantaran.metode === "ambil_sendiri" && this.infoPengantaran.status === "menunggu_pengantaran") {
        this.infoPengantaran.status = "menunggu_ambil_mandiri";
    }
});

// =========================================================================
// LOCALIZED LABELS FOR EJS VIEWS (INDONESIAN)
// =========================================================================

// 1. Localized Status Label
orderSchema.virtual("statusLabel").get(function () {
    const statusTranslations = {
        pending: "Menunggu Konfirmasi",
        payment: "Menunggu Pembayaran",
        pickup: "Sedang Dijemput",
        received: "Diterima di Workshop",
        "validating-in": "Pengecekan Awal",
        "in-progress": "Sedang Dicuci",
        "quality-check": "Pemeriksaan Kualitas (QC)",
        delivery: "Sedang Diantar",
        completed: "Selesai",
        cancelled: "Dibatalkan",
    };
    return statusTranslations[this.status] || (this.status || "").toUpperCase();
});

// 2. Localized Payment Status Label
orderSchema.virtual("paymentStatusLabel").get(function () {
    const paymentStatusTranslations = {
        pending: "Belum Bayar",
        paid: "Sudah Lunas",
        failed: "Gagal / Kedaluwarsa",
    };
    return paymentStatusTranslations[this.payment.status] || (this.payment.status || "").toUpperCase();
});

// 3. Localized Payment Method Label
orderSchema.virtual("paymentMethodLabel").get(function () {
    return this.payment.method === "bank" ? "Transfer Online" : "COD (Bayar di Tempat)";
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
