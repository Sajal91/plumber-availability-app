const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const requirePlumber = require('../middleware/requirePlumber');
const validate = require('../middleware/validate');
const { getAllPlumbers, getMe, updateStatus } = require('../controllers/userController');
const { STATUS_VALUES } = require('../models/User');

const router = express.Router();

const statusValidation = [
  body('status')
    .isIn(STATUS_VALUES)
    .withMessage(`Status must be one of: ${STATUS_VALUES.join(', ')}`),
];

router.get('/me', authMiddleware, getMe);
router.get('/plumbers', authMiddleware, requireAdmin, getAllPlumbers);
router.put('/status', authMiddleware, requirePlumber, statusValidation, validate, updateStatus);

module.exports = router;
