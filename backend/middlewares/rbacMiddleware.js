export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access Denied: Insufficient authorization level." });
    }
    next();
  };
};

export const enforceBaseScope = (req, res, next) => {
  // Admins can see all bases; Commanders are scoped to their assigned base.
  // We attach it to query so that any fetch operations filter by it automatically.
  if (req.user && req.user.role === 'BASE_COMMANDER') {
    req.query.baseId = String(req.user.baseId);
    
    // Also if baseId is present in req.body, enforce that it matches their assigned base
    if (req.body && req.body.baseId !== undefined) {
      req.body.baseId = req.user.baseId;
    }
    if (req.body && req.body.sourceBaseId !== undefined && req.body.sourceBaseId !== req.user.baseId) {
      return res.status(403).json({ message: "Access Denied: You cannot transfer assets out of another base." });
    }
  }
  next();
};
