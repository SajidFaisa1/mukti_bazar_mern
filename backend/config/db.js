const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Attempting MongoDB connection...');
    console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Call connectDB immediately when this module is required
connectDB();

module.exports = connectDB;
