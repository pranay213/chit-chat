import { Router, Request, Response } from 'express';
import adminRoutes from './admin.routes';
import mobileRoutes from './mobile.routes';
const router = Router();
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'API is running' });
});
// Admin API Routes
router.use('/admin', adminRoutes);
// Mobile API Routes
router.use('/mobile', mobileRoutes);
export default router;
