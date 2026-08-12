import express from 'express';
import {
  getDashboardMetrics,
  getAssets,
  createAssignment,
  createExpenditure,
  getAssignments,
  getExpenditures,
  getBases,
  getEquipmentTypes,
  getAuditLogs
} from '../controllers/assetController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

// General assets listing and metrics
router.get('/dashboard', authenticateToken, enforceBaseScope, getDashboardMetrics);
router.get('/', authenticateToken, enforceBaseScope, getAssets);

// Personnel assignments (Base Commanders and Admins)
router.post('/assignments', authenticateToken, authorizeRoles('ADMIN', 'BASE_COMMANDER'), enforceBaseScope, createAssignment);
router.get('/assignments', authenticateToken, enforceBaseScope, getAssignments);

// Spent assets/expenditures (Base Commanders and Admins)
router.post('/expenditures', authenticateToken, authorizeRoles('ADMIN', 'BASE_COMMANDER'), enforceBaseScope, createExpenditure);
router.get('/expenditures', authenticateToken, enforceBaseScope, getExpenditures);

// Metadata lookups
router.get('/bases', authenticateToken, getBases);
router.get('/equipment-types', authenticateToken, getEquipmentTypes);

// System Audit Logs
router.get('/audit-logs', authenticateToken, getAuditLogs);

export default router;
