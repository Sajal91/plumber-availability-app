const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const STATUS_VALUES = ['available', 'working', 'offline'];

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
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
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
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare plain-text password with hashed password
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Return user data safe for API responses (no password)
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    phoneNumber: this.phoneNumber,
    status: this.status,
    lastUpdated: this.lastUpdated,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.STATUS_VALUES = STATUS_VALUES;
