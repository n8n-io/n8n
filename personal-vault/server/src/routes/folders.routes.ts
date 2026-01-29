import { Router } from 'express';
import {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
} from '../controllers/folders.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getFolders);
router.get('/:id', getFolder);
router.post('/', createFolder);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

export default router;
