import { Router } from 'express';
import { sendOtp, verifyOtp, updateProfile } from '../controllers/auth.controller';
import { getUserChats, getChatMessages, createGroupChat } from '../controllers/chat.controller';

const router = Router();

// Auth Routes
router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);
router.put('/auth/profile/:userId', updateProfile);

// Chat Routes
router.get('/chats/user/:userId', getUserChats);
router.get('/chats/:chatId/messages', getChatMessages);
router.post('/chats/group', createGroupChat);

export default router;
