const User = require('../models/User');
const { STATUS_VALUES } = require('../models/User');
const { getAllPlumbersPublic } = require('../services/userService');

/**
 * GET /api/users/plumbers — admin only
 */
const getAllPlumbers = async (req, res, next) => {
  try {
    const plumbers = await getAllPlumbersPublic();
    res.json({ plumbers });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/me — current user profile
 */
const getMe = async (req, res, next) => {
  try {
    res.json({ user: req.user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/status — plumbers only
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${STATUS_VALUES.join(', ')}`,
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    user.lastUpdated = new Date();
    await user.save();

    const updatedUser = user.toPublicJSON();
    const allPlumbers = await getAllPlumbersPublic();

    const io = req.app.get('io');
    if (io) {
      io.emit('statusUpdated', { user: updatedUser, plumbers: allPlumbers });
    }

    res.json({
      message: 'Status updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPlumbers,
  getMe,
  updateStatus,
};
