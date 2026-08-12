import express from 'express';
import { createTransfer, getTransfers } from '../controllers/transferController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

// Logistics Officers and Admins can initiate transfers
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'LOGISTICS_OFFICER'), enforceBaseScope, createTransfer);

// All roles can view transfers, subject to base scope filtering
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'LOGISTICS_OFFICER', 'BASE_COMMANDER'), enforceBaseScope, getTransfers);

export default router;
