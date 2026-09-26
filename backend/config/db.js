const mongoose = require('mongoose');

let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  const ATLAS_URI =
    'mongodb+srv://sastasafar:Aszx1209@cluster0.ad6caa1.mongodb.net/fuel_route_planner?retryWrites=true&w=majority&appName=Cluster0';

  const isEnvValid =
    uri &&
    !uri.includes('127.0.0.1') &&
    !uri.includes('localhost') &&
    !uri.includes('<') &&
    !uri.includes('db_password') &&
    !uri.includes('password');

  const finalUri = isEnvValid ? uri : ATLAS_URI;

  if (connectionPromise) {
    try {
      return await connectionPromise;
    } catch {
      connectionPromise = null;
    }
  }

  try {
    connectionPromise = mongoose.connect(finalUri, {
      serverSelectionTimeoutMS: 10000,
      bufferCommands: false,
    });
    const conn = await connectionPromise;
    isConnected = true;
    lastError = null;
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    // If custom env failed due to bad authentication, fallback to verified Atlas URI
    if (finalUri !== ATLAS_URI && (error.message.includes('auth') || error.message.includes('password'))) {
      try {
        console.log('[MongoDB] Retrying with verified Atlas connection string...');
        connectionPromise = mongoose.connect(ATLAS_URI, {
          serverSelectionTimeoutMS: 10000,
          bufferCommands: false,
        });
        const conn = await connectionPromise;
        isConnected = true;
        lastError = null;
        console.log(`[MongoDB] Fallback Connected: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      } catch (fallbackErr) {
        lastError = fallbackErr.message;
      }
    }

    isConnected = false;
    connectionPromise = null;
    lastError = error.message;
    console.warn(`[MongoDB Notice] Could not connect to MongoDB (${error.message}).`);
    return null;
  }
};

let lastError = null;

const getStatus = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);
const getLastError = () => lastError;

module.exports = { connectDB, getStatus, getLastError };
