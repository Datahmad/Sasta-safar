const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fuel_route_planner';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout to fall back gracefully if no local mongo daemon
    });
    isConnected = true;
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB Notice] Could not connect to MongoDB at ${uri} (${error.message}).`);
    console.warn(`[MongoDB Notice] The server will operate with high-performance in-memory fallback for trip storage so all app features work smoothly.`);
  }
};

const getStatus = () => isConnected;

module.exports = { connectDB, getStatus };
