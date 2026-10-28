import mongoose from 'mongoose';

/**
 * Connect to MongoDB using the configured MONGODB_URI.
 * Validates connection at startup.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('FATAL: MONGODB_URI is not defined in server environment variables.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true // Ensure unique indexes like email & rollNumber are created
    });

    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    throw err;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Warning: Database connection lost.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Database reconnected.');
});
