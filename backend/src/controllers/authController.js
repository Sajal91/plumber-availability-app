const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  generateOtp,
  getOtpExpiry,
  isOtpExpired,
  sendOtpSms,
} = require('../services/otpService');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const exposeDevOtp = () => process.env.OTP_DEV_MODE === 'true';

/**
 * POST /api/auth/send-otp
 */
const sendOtp = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    const user = await User.findOne({ phoneNumber }).select('+otp +otpExpires');
    if (!user) {
      console.log('Phone number not registered. Contact admin')
      return res.status(404).json({ message: 'Phone number not registered. Contact admin.' });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = getOtpExpiry();
    await user.save();

    await sendOtpSms(phoneNumber, otp);

    const response = {
      message: 'OTP sent successfully',
    };

    if (exposeDevOtp()) {
      response.devOtp = otp;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;

    const user = await User.findOne({ phoneNumber }).select('+otp +otpExpires');
    if (!user) {
      return res.status(401).json({ message: 'Invalid phone number or OTP' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(401).json({ message: 'Invalid phone number or OTP' });
    }

    if (isOtpExpired(user.otpExpires)) {
      return res.status(401).json({ message: 'OTP expired. Please request a new one.' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
};
