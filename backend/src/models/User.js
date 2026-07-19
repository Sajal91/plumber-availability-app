const mongoose = require('mongoose');

const STATUS_VALUES = ['available', 'working', 'offline'];
const ROLE_VALUES = ['admin', 'plumber'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: 'plumber',
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'offline',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    phoneNumber: this.phoneNumber,
    role: this.role,
    status: this.status,
    lastUpdated: this.lastUpdated,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.STATUS_VALUES = STATUS_VALUES;
module.exports.ROLE_VALUES = ROLE_VALUES;
