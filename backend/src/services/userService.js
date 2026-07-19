const User = require('../models/User');

/**
 * Fetch all plumbers and return public-safe JSON.
 */
const getAllPlumbersPublic = async () => {
  const users = await User.find({ role: 'plumber' }).sort({ name: 1 });
  return users.map((user) => user.toPublicJSON());
};

module.exports = {
  getAllPlumbersPublic,
};
