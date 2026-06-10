const User = require('../models/User');
const { STATUS_VALUES } = require('../models/User');
const { getAllUsersPublic } = require('../services/userService');

/**
 * GET /api/users/all
 * Return all users with their current status.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await getAllUsersPublic();
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/status
 * Update the logged-in user's availability status.
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
    const allUsers = await getAllUsersPublic();

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('statusUpdated', { user: updatedUser, users: allUsers });
    }

    res.json({
      message: 'Status updated successfully',
      user: updatedUser,
      users: allUsers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  updateStatus,
};
