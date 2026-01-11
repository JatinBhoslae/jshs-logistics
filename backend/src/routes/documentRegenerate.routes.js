import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { regenerateAllDocuments } from '../controllers/documentRegenerateController.js';

const router = express.Router();

// Admin/Manager only - regenerate all documents
router.post('/regenerate', requireAuth, requireRole('MANAGER'), regenerateAllDocuments);

export default router;
