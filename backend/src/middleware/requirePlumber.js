/**
 * Require authenticated user with plumber role.
 */
const requirePlumber = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Access denied. Not authenticated.' });
  }

  if (req.user.role !== 'plumber') {
    return res.status(403).json({ message: 'Access denied. Plumbers only.' });
  }

  next();
};

module.exports = requirePlumber;
