import db from '../config/db.js';

/**
 * Logs an action in the system audit logs.
 * Can be run within an existing database client transaction or on the default pool.
 */
export const logAuditAction = async (userId, action, details, client = null) => {
  const queryExecutor = client || db;
  const query = `
    INSERT INTO audit_logs (user_id, action, details)
    VALUES ($1, $2, $3)
    RETURNING id;
  `;
  try {
    const res = await queryExecutor.query(query, [userId || null, action, details]);
    return res.rows[0].id;
  } catch (error) {
    console.error('Audit logging failed:', error.message);
    // Do not crash the application if audit logging fails, but in production this might be critical
    return null;
  }
};

/**
 * Express middleware to automatically log modifications (POST, PUT, DELETE)
 */
export const apiLogger = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function (body) {
    res.send = originalSend;
    
    // Only audit successful mutations
    if (res.statusCode >= 200 && res.statusCode < 300 && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const userId = req.user ? req.user.id : null;
      let action = 'MUTATION';
      
      // Attempt to guess action from route
      if (req.originalUrl.includes('/auth/login')) action = 'LOGIN';
      else if (req.originalUrl.includes('/purchases')) action = 'PURCHASE';
      else if (req.originalUrl.includes('/transfers')) action = 'TRANSFER';
      else if (req.originalUrl.includes('/assets/assignments')) action = 'ASSIGNMENT';
      else if (req.originalUrl.includes('/assets/expenditures')) action = 'EXPENDITURE';
      
      const details = `API Method: ${req.method} | URL: ${req.originalUrl} | Status: ${res.statusCode}`;
      
      // Run audit logging asynchronously
      logAuditAction(userId, action, details).catch(err => console.error(err));
    }
    
    return originalSend.apply(this, arguments);
  };
  
  next();
};
