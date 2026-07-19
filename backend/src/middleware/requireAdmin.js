/**
 * Require authenticated user with admin role.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Access denied. Not authenticated.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }

  next();
};

module.exports = requireAdmin;
