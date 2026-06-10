const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const { getAllUsers, updateStatus } = require('../controllers/userController');
const { STATUS_VALUES } = require('../models/User');

const router = express.Router();

const statusValidation = [
  body('status')
    .isIn(STATUS_VALUES)
    .withMessage(`Status must be one of: ${STATUS_VALUES.join(', ')}`),
];

router.get('/all', authMiddleware, getAllUsers);
router.put('/status', authMiddleware, statusValidation, validate, updateStatus);

module.exports = router;
