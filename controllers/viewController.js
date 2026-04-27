const Order = require("../models/Order");
const User = require("../models/User");
const Service = require("../models/Service");
const Settings = require("../models/Settings");

exports.renderIndex = (req, res) => res.render("index");

exports.renderLogin = (req, res) => res.render("auth/login");

exports.renderRegister = (req, res) => res.render("auth/register");

exports.renderVerify = (req, res) => res.render("auth/verify");

exports.renderForgotPassword = (req, res) => res.render("auth/forgot-password");

exports.renderResetPassword = (req, res) => res.render("auth/reset-password");

exports.renderCustomerDashboard = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          activeOrders: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["pending", "pickup", "in-progress", "delivery"],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const recentOrders = await Order.find({ user: req.user._id })
      .sort("-createdAt")
      .limit(3);

    const userStats = stats[0] || { totalOrders: 0, activeOrders: 0 };
    res.render("customer/dashboard", {
      activePage: "dashboard",
      userStats,
      recentOrders,
    });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat dashboard." });
  }
};

exports.renderCustomerCreateOrder = async (req, res) => {
  try {
    const services = await Service.find().sort("name");
    const settings = await Settings.findOne() || { shippingRatePerKm: 5000 };

    const mainServices = services.filter(
      (s) => s.category !== "Additional Cost",
    );
    const addOns = services.filter((s) => s.category === "Additional Cost");

    res.render("customer/create-order", {
      activePage: "dashboard",
      mainServices,
      addOns,
      settings,
    });
  } catch (err) {
    console.error("Create Order Error:", err);
    res
      .status(500)
      .render("error", { message: "Gagal memuat form pemesanan." });
  }
};

exports.renderCustomerMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort("-createdAt");
    res.render("customer/my-orders", { activePage: "my-orders", orders });
  } catch (err) {
    res
      .status(500)
      .render("error", { message: "Gagal mengambil data pesanan." });
  }
};

exports.renderCustomerOrderDetail = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.query.id,
      user: req.user._id,
    }).populate("user");

    const settings = await Settings.findOne() || { shippingRatePerKm: 5000 };

    res.render("customer/order-detail", { activePage: "my-orders", order, settings });
  } catch (err) {
    res
      .status(500)
      .render("error", { message: "Gagal memuat detail pesanan." });
  }
};

exports.renderCustomerProfile = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          activeOrders: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["pending", "pickup", "in-progress", "delivery"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$totalPrice"],
            },
          },
        },
      },
    ]);

    const userStats = stats[0] || {
      totalOrders: 0,
      activeOrders: 0,
      totalSpent: 0,
    };
    res.render("customer/profile", { activePage: "profile", userStats });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat profil." });
  }
};

exports.renderStaffDashboard = async (req, res) => {
  try {
    const stats = {
      pendingPayment: await Order.countDocuments({ "payment.status": "pending" }),
      pendingPickup: await Order.countDocuments({ status: "pickup" }),
      inProgress: await Order.countDocuments({ status: { $in: ["received", "validating-in", "in-progress", "quality-check"] } }),
      pendingDelivery: await Order.countDocuments({ status: "delivery" }),
    };

    const recentActivities = await Order.find()
      .sort("-updatedAt")
      .limit(5)
      .populate("user", "name");

    res.render("staff/dashboard", {
      activePage: "dashboard",
      stats,
      recentActivities,
    });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat dashboard staff." });
  }
};

exports.renderStaffLogistics = async (req, res) => {
  try {
    const filter = req.query.filter || "all";
    let query = { 
      $or: [
        { status: "pending", "logistics.pickupMethod": "pickup" },
        { status: { $in: ["pickup", "quality-check", "delivery"] } }
      ]
    };
    
    if (filter === "pickup") {
      query = { 
        $or: [
          { status: "pending", "logistics.pickupMethod": "pickup" },
          { status: "pickup" }
        ]
      };
    }
    if (filter === "delivery") {
      query = { status: { $in: ["quality-check", "delivery"] } };
    }

    const orders = await Order.find(query)
      .sort("-updatedAt")
      .populate("user", "name");

    res.render("staff/logistics", { activePage: "logistics", orders, filter });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat data logistik." });
  }
};

exports.renderStaffWashing = async (req, res) => {
  try {
    const orders = await Order.find({ 
      $or: [
        { status: "pending", "logistics.pickupMethod": "self" },
        { status: { $in: ["received", "validating-in", "in-progress"] } }
      ]
    })
      .sort("-updatedAt")
      .populate("user", "name");
    res.render("staff/washing", { activePage: "washing", orders });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat antrian cuci." });
  }
};
exports.renderStaffOperations = async (req, res) => {
  try {
    const orders = await Order.find({ 
      status: { $nin: ["completed", "cancelled"] } 
    })
      .sort("-updatedAt")
      .populate("user", "name");
    res.render("staff/operations", { activePage: "operations", orders });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat operasional staff." });
  }
};
exports.renderStaffHistory = async (req, res) => {
  try {
    const orders = await Order.find({ 
      status: { $in: ["completed", "cancelled"] } 
    })
      .sort("-updatedAt")
      .populate("user", "name");
    res.render("staff/history", { activePage: "history", orders });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat riwayat staff." });
  }
};

exports.renderStaffOrderDetail = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user");
    if (!order) {
      return res.status(404).render("error", { message: "Pesanan tidak ditemukan." });
    }
    const settings = await Settings.findOne() || { shippingRatePerKm: 5000 };
    res.render("staff/order-detail", { activePage: "washing", order, settings });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat detail pesanan." });
  }
};

exports.renderStaffProfile = async (req, res) => {
  try {
    res.render("staff/profile", { activePage: "profile" });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat profil staff." });
  }
};
exports.renderAdminDashboard = async (req, res) => {
  try {
    const revenueResult = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = revenueResult[0] ? revenueResult[0].total : 0;

    const totalOrders = await Order.countDocuments();
    const activeTreatments = await Order.countDocuments({
      status: { $in: ["pending", "pickup", "in-progress", "delivery"] },
    });
    const totalCustomers = await User.countDocuments({ role: "customer" });
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newCustomersThisMonth = await User.countDocuments({
      role: "customer",
      createdAt: { $gte: startOfMonth }
    });

    const recentOrders = await Order.find()
      .sort("-createdAt")
      .limit(5)
      .populate("user", "name");

    const serviceStatsResult = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.serviceType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const totalServices = serviceStatsResult.reduce(
      (acc, curr) => acc + curr.count,
      0,
    );

    const availableYearsResult = await Order.aggregate([
      { $group: { _id: { $year: "$createdAt" } } },
      { $sort: { _id: -1 } },
    ]);
    const availableYears = availableYearsResult.map((y) => y._id);
    if (availableYears.length === 0)
      availableYears.push(new Date().getFullYear());

    const targetYear = parseInt(req.query.year) || new Date().getFullYear();
    const monthlyOrdersResult = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(targetYear, 0, 1),
            $lt: new Date(targetYear + 1, 0, 1),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlyOrders = Array(12).fill(0);
    monthlyOrdersResult.forEach((item) => {
      monthlyOrders[item._id - 1] = item.count;
    });
    const maxMonthlyOrder = Math.max(...monthlyOrders, 1);

    // FETCH STAFF ACTIVITY
    const activitiesResult = await Order.aggregate([
      { $unwind: "$statusHistory" },
      { $sort: { "statusHistory.updatedAt": -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "users",
          localField: "statusHistory.updatedBy",
          foreignField: "_id",
          as: "staff",
        },
      },
      { $unwind: "$staff" },
    ]);

    const staffActivities = activitiesResult.map(a => ({
      staffName: a.staff.name,
      action: a.statusHistory.status.toUpperCase(),
      shoeName: a.items[0]?.shoeName || 'Item',
      timeAgo: a.statusHistory.updatedAt
    }));

    res.render("admin/dashboard", {
      activePage: "dashboard",
      stats: {
        totalRevenue,
        totalOrders,
        activeTreatments,
        totalCustomers,
        newCustomersThisMonth,
      },
      recentOrders,
      serviceStats: serviceStatsResult,
      totalServices,
      monthlyOrders,
      maxMonthlyOrder,
      targetYear,
      availableYears,
      staffActivities
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res
      .status(500)
      .render("error", { message: "Gagal memuat dashboard admin." });
  }
};

exports.renderAdminServices = async (req, res) => {
  try {
    const services = await Service.find().sort("-createdAt");

    // Prepare counts per category
    const categories = {
      "Menu Treatment": 0,
      "Reglue & Repair": 0,
      "Helmet Treatment": 0,
      "Bag & Luggage": 0,
      Repaint: 0,
      "Additional Cost": 0,
    };

    services.forEach((service) => {
      if (categories[service.category] !== undefined) {
        categories[service.category]++;
      }
    });

    res.render("admin/services", {
      activePage: "services",
      services,
      categories,
    });
  } catch (err) {
    console.error("Services Error:", err);
    res
      .render("error", { message: "Gagal memuat halaman layanan." });
  }
};

exports.renderAdminCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: "customer" }).sort("-createdAt");

    const stats = {
      total: customers.length,
      active: customers.filter((c) => c.isActive).length,
      inactive: customers.filter((c) => !c.isActive).length,
    };

    res.render("admin/customers", {
      activePage: "customer",
      customers,
      stats,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.renderAdminEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: "staff" }).sort("-createdAt");

    const stats = {
      total: employees.length,
      active: employees.filter((e) => e.isActive).length,
      inactive: employees.filter((e) => !e.isActive).length,
    };

    res.render("admin/employees", {
      activePage: "karyawan",
      employees,
      stats,
    });
  } catch (err) {
    console.error("Employees Error:", err);
    res
      .status(500)
      .render("error", { message: "Gagal memuat halaman karyawan." });
  }
};

exports.renderAdminOperations = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        bankAccounts: [
          {
            bankName: "BCA",
            accountNumber: "8820 4419 2201",
            accountHolder: "PT. GOEDE SHOES",
          },
        ],
        shippingRatePerKm: 10000,
        storeInfo: {
          name: "Goede HQ - Senopati",
          address:
            "Jl. Senopati No.41, RT.6/RW.3, Selong, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12110",
          openTime: "09:00",
          closeTime: "21:00",
          phone: "+62 811-2345-6789",
          email: "hq.senopati@goede.com",
        },
      });
    }

    res.render("admin/operations", {
      activePage: "operasional",
      settings,
    });
  } catch (err) {
    res.status(500).render("error", { message: err.message });
  }
};

exports.renderAdminProfile = async (req, res) => {
  try {
    res.render("admin/profile", {
      activePage: "profile",
    });
  } catch (err) {
    res.status(500).render("error", { message: "Gagal memuat profil admin." });
  }
};
