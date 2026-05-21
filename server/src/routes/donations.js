// src/routes/donations.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getCommunity, getMine, create, claim, cancel } = require('../controllers/donationController');

const router = express.Router();
router.use(authenticate);

router.get ('/',         getCommunity);
router.get ('/mine',     getMine);
router.post('/',         create);
router.patch('/:id/claim',  claim);
router.patch('/:id/cancel', cancel);

module.exports = router;
