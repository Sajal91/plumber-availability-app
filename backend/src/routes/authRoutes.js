const express = require('express');
const { body } = require('express-validator');
const { sendOtp, verifyOtp } = require('../controllers/authController');
const validate = require('../middleware/validate');

const router = express.Router();

const phoneValidation = body('phoneNumber')
  .trim()
  .notEmpty()
  .withMessage('Phone number is required')
  .matches(/^[0-9+\-\s()]{7,15}$/)
  .withMessage('Enter a valid phone number');

const sendOtpValidation = [phoneValidation];

const verifyOtpValidation = [
  phoneValidation,
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
];

router.post('/send-otp', sendOtpValidation, validate, sendOtp);
router.post('/verify-otp', verifyOtpValidation, validate, verifyOtp);

module.exports = router;
