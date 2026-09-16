const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');

const port = Number(process.env.PORT) || 5000;
let server;
let isShuttingDown = false;

async function startServer() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error(`Fatal: Failed to connect to database. Server startup aborted: ${error.message}`);
    process.exit(1);
  }

  server = app.listen(port, () => {
    console.info(`P2G API listening on port ${port} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.info(`${signal} received. Shutting down gracefully.`);

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    console.info('HTTP server closed.');
  }

  try {
    await disconnectDatabase();
  } catch (error) {
    console.error(`Error during database disconnect: ${error.message}`);
  }
}

process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)).catch((error) => {
  console.error('Graceful shutdown failed:', error);
  process.exit(1);
}));

process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)).catch((error) => {
  console.error('Graceful shutdown failed:', error);
  process.exit(1);
}));

startServer().catch((error) => {
  console.error(`API failed to start: ${error.message}`);
  process.exit(1);
});
