// src/routes/food.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getAll, getOne, create, update, updateStatus, remove } = require('../controllers/foodController');

const router = express.Router();
router.use(authenticate);

router.get ('/',           getAll);
router.get ('/:id',        getOne);
router.post('/',           create);
router.put ('/:id',        update);
router.patch('/:id/status',updateStatus);
router.delete('/:id',     remove);

module.exports = router;
