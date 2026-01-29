import { Router } from 'express';
import authRoutes from './auth.routes.js';
import entriesRoutes from './entries.routes.js';
import foldersRoutes from './folders.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/entries', entriesRoutes);
router.use('/folders', foldersRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
