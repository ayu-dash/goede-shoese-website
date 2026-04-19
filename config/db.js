const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error DB: ${error.message}`);
    // process.exit(1); // Dinonaktifkan sementara untuk frontend dev agar tidak crash
  }
};

module.exports = connectDB;
