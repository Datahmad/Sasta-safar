const mongoose = require('mongoose');

let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;

  // On Vercel / serverless, don't attempt to connect to localhost 127.0.0.1 (it doesn't exist)
  if (process.env.VERCEL && (!uri || uri.includes('127.0.0.1') || uri.includes('localhost'))) {
    isConnected = false;
    return null;
  }

  const finalUri = uri || 'mongodb://127.0.0.1:27017/fuel_route_planner';

  if (connectionPromise) {
    try {
      return await connectionPromise;
    } catch {
      connectionPromise = null;
    }
  }

  try {
    connectionPromise = mongoose.connect(finalUri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    });
    const conn = await connectionPromise;
    isConnected = true;
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    isConnected = false;
    connectionPromise = null;
    console.warn(`[MongoDB Notice] Could not connect to MongoDB (${error.message}).`);
    console.warn(`[MongoDB Notice] Operating with persistent storage fallback.`);
    return null;
  }
};

const getStatus = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);

module.exports = { connectDB, getStatus };
