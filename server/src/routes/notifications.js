// src/routes/notifications.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getAll, markRead, markAllRead } = require('../controllers/notificationController');

const router = express.Router();
router.use(authenticate);

router.get ('/',              getAll);
router.patch('/read-all',     markAllRead);   // must come before /:id/read
router.patch('/:id/read',     markRead);

module.exports = router;
