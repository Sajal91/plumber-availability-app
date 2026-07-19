const crypto = require('crypto');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000;

const generateOtp = () => {
  const max = 10 ** OTP_LENGTH;
  const otp = crypto.randomInt(0, max).toString().padStart(OTP_LENGTH, '0');
  return otp;
};

const getOtpExpiry = () => new Date(Date.now() + OTP_EXPIRY_MS);

const isOtpExpired = (otpExpires) => !otpExpires || otpExpires < new Date();

const sendOtpSms = async (phoneNumber, otp) => {
  console.log(`[OTP] ${phoneNumber}: ${otp}`);
};

module.exports = {
  OTP_LENGTH,
  OTP_EXPIRY_MS,
  generateOtp,
  getOtpExpiry,
  isOtpExpired,
  sendOtpSms,
};
