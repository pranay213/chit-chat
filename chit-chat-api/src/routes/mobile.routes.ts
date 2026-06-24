import { Router } from 'express';
import { sendOtp, verifyOtp, updateProfile } from '../controllers/auth.controller';
import { getUserChats, getChatMessages, createGroupChat } from '../controllers/chat.controller';
import { getMySessionsMobile, revokeSession, revokeOtherSessionsMobile } from '../controllers/session.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

const router = Router();

// Auth Routes
router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);
router.put('/auth/profile/:userId', authenticateUser, updateProfile);

// Chat Routes
router.get('/chats/user/:userId', authenticateUser, getUserChats);
router.get('/chats/:chatId/messages', authenticateUser, getChatMessages);
router.post('/chats/group', authenticateUser, createGroupChat);

// Mobile Session Management
router.get('/sessions', authenticateUser, getMySessionsMobile);
router.delete('/sessions/other', authenticateUser, revokeOtherSessionsMobile);
router.delete('/sessions/:id', authenticateUser, revokeSession);

export default router;
