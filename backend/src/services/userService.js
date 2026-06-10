const User = require('../models/User');

/**
 * Fetch all users and return public-safe JSON (no passwords).
 */
const getAllUsersPublic = async () => {
  const users = await User.find().select('-password').sort({ name: 1 });
  return users.map((user) => user.toPublicJSON());
};

module.exports = {
  getAllUsersPublic,
};
