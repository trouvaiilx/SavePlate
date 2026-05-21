// src/routes/meals.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getWeekPlan, addSlot, removeSlot, getSuggestions } = require('../controllers/mealController');

const router = express.Router();
router.use(authenticate);

router.get ('/',              getWeekPlan);
router.get ('/suggestions',   getSuggestions);
router.post('/slots',         addSlot);
router.delete('/slots/:id',   removeSlot);

module.exports = router;
