const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the MONGO_URI from environment variables.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

module.exports = connectDB;
