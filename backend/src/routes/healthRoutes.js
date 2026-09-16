const express = require('express');
const { getDatabaseStatus } = require('../config/database');

const router = express.Router();

router.get('/', (req, res) => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    success: true,
    status: 'ok',
    message: 'P2G API is running.',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
