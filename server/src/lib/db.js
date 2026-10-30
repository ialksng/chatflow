import mongoose from "mongoose";

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI is not set in environment variables");
    return null;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "chatflow",
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};
