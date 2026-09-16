const mongoose = require('mongoose');

let connectionPromise = null;
let isDisconnecting = false;

/**
 * Retrieves and validates the MongoDB connection URI from environment variables.
 * Never uses fallback or hardcoded credentials.
 */
function getMongoUri() {
  const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';

  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is required but missing from environment variables. ' +
      'Please configure MONGODB_URI in backend/.env before starting the application.'
    );
  }

  return mongoUri;
}

/**
 * Establishes a singleton Mongoose connection to MongoDB Atlas.
 * Prevents duplicate connection attempts by checking existing state and caching in-flight promise.
 */
async function connectDatabase() {
  // Return existing active connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Return ongoing connection attempt to prevent duplicate connections
  if (connectionPromise) {
    return connectionPromise;
  }

  const mongoUri = getMongoUri();

  // Attach connection event listeners for runtime monitoring (only once)
  if (mongoose.connection.listenerCount('error') === 0) {
    mongoose.connection.on('error', (error) => {
      console.error(`MongoDB runtime connection error: ${error.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB connection lost. Attempting auto-reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.info('MongoDB reconnected successfully.');
    });
  }

  connectionPromise = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: process.env.NODE_ENV !== 'production',
    })
    .then((m) => {
      console.info(`MongoDB connected successfully to host: ${m.connection.host} [database: ${m.connection.name}]`);
      connectionPromise = null;
      return m.connection;
    })
    .catch((error) => {
      connectionPromise = null;
      console.error(`MongoDB initial connection failed: ${error.message}`);
      throw error;
    });

  return connectionPromise;
}

/**
 * Gracefully disconnects Mongoose from MongoDB.
 */
async function disconnectDatabase() {
  if (isDisconnecting || mongoose.connection.readyState === 0) {
    return;
  }

  isDisconnecting = true;

  try {
    await mongoose.disconnect();
    console.info('MongoDB disconnected gracefully.');
  } catch (error) {
    console.error(`Error during MongoDB disconnection: ${error.message}`);
    throw error;
  } finally {
    isDisconnecting = false;
    connectionPromise = null;
  }
}

/**
 * Returns current database connection health and state metadata.
 */
function getDatabaseStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;

  return {
    status: states[readyState] || 'unknown',
    connected: readyState === 1,
    host: readyState === 1 ? mongoose.connection.host : null,
    name: readyState === 1 ? mongoose.connection.name : null,
  };
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
};
