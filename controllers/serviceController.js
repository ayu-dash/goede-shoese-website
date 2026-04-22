const Service = require("../models/Service");

exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.find();
        res.status(200).json({ status: "success", data: { services } });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Gagal mengambil layanan" });
    }
};

exports.createService = async (req, res) => {
    try {
        const newService = await Service.create(req.body);
        res.status(201).json({ status: "success", data: { service: newService } });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateService = async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!service) return res.status(404).json({ status: "fail", message: "Layanan tidak ditemukan" });
        res.status(200).json({ status: "success", data: { service } });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) return res.status(404).json({ status: "fail", message: "Layanan tidak ditemukan" });
        res.status(204).json({ status: "success", data: null });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};
