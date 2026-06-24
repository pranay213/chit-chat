import { Router, Request, Response } from 'express';
import { successResponse } from '../utils/response';
import { loginAdmin, createAdmin, getAdmins, updateAdmin, deleteAdmin } from '../controllers/admin.controller';
import { getSettings, updateSettings } from '../controllers/setting.controller';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/admin.middleware';

const router = Router();

// Admin Dashboard Route (Placeholder)
router.get('/dashboard', (req: Request, res: Response) => {
  successResponse(res, 200, 'Admin Dashboard');
});

// Admin Authentication
router.post('/login', loginAdmin);

// Admin CRUD Operations (Protected)
router.use(authenticateAdmin);

router.post('/', requireSuperAdmin, createAdmin);
router.get('/', requireSuperAdmin, getAdmins);
router.put('/:id', requireSuperAdmin, updateAdmin);
router.delete('/:id', requireSuperAdmin, deleteAdmin);

// System Settings (Protected & SUPER_ADMIN only)
router.get('/settings', requireSuperAdmin, getSettings);
router.put('/settings', requireSuperAdmin, updateSettings);

export default router;
