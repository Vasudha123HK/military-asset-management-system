import express from 'express';
import { createPurchase, getPurchases } from '../controllers/purchaseController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

// Logistics Officers and Admins can log purchases
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'LOGISTICS_OFFICER'), enforceBaseScope, createPurchase);

// All authenticated roles can view purchase history, subject to base scope filtering
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'LOGISTICS_OFFICER', 'BASE_COMMANDER'), enforceBaseScope, getPurchases);

export default router;
