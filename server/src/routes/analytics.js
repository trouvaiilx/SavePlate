// src/routes/analytics.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getStats } = require('../controllers/analyticsController');

const router = express.Router();
router.use(authenticate);

router.get('/', getStats);

module.exports = router;
