import { Router, Request, Response } from 'express';
import { successResponse } from '../utils/response';
import { loginAdmin, createAdmin, getAdmins, updateAdmin, deleteAdmin } from '../controllers/admin.controller';
import { getSettings, updateSettings } from '../controllers/setting.controller';
import { createRole, getRoles, getRoleById, updateRole, deleteRole } from '../controllers/role.controller';
import { getSessionsAdmin, revokeSession } from '../controllers/session.controller';
import { createUser, getUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/admin.middleware';

const router = Router();
import { uploadFile, uploadMiddleware } from '../controllers/upload.controller';

// Admin Dashboard Route (Placeholder)
router.get('/dashboard', (req: Request, res: Response) => {
  successResponse(res, 200, 'Admin Dashboard');
});

// Admin Authentication
router.post('/login', loginAdmin);

// Admin CRUD Operations (Protected)
router.use(authenticateAdmin);

// File Upload
router.post('/upload', uploadMiddleware, uploadFile);

// These static routes MUST be defined before /:id routes
// System Settings (Protected & SUPER_ADMIN only)
router.get('/settings', requireSuperAdmin, getSettings);
router.put('/settings', requireSuperAdmin, updateSettings);

router.post('/', requireSuperAdmin, createAdmin);
router.get('/', requireSuperAdmin, getAdmins);
router.put('/:id', requireSuperAdmin, updateAdmin);
router.delete('/:id', requireSuperAdmin, deleteAdmin);

// Mobile User Management (Protected - Admin & Super Admin)
router.post('/users', createUser);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Dynamic Role Management
router.post('/roles', requireSuperAdmin, createRole);
router.get('/roles', requireSuperAdmin, getRoles);
router.get('/roles/:id', requireSuperAdmin, getRoleById);
router.put('/roles/:id', requireSuperAdmin, updateRole);
router.delete('/roles/:id', requireSuperAdmin, deleteRole);

// System Sessions Management
router.get('/sessions', requireSuperAdmin, getSessionsAdmin);
router.delete('/sessions/:id', requireSuperAdmin, revokeSession);

export default router;
