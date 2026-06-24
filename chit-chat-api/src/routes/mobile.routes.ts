import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { sendOtp, verifyOtp, updateProfile, loginWithPassword, checkUsernameAvailability, getProfile } from '../controllers/auth.controller';
import { getUserChats, getChatMessages, createGroupChat, updateChatDetails, updateMessage, createOrGetChat, deleteChat, deleteMultipleChats } from '../controllers/chat.controller';
import { getUsers } from '../controllers/user.controller';
import { getMySessionsMobile, revokeSession, revokeOtherSessionsMobile } from '../controllers/session.controller';
import { getCountries, getLanguages } from '../controllers/metadata.controller';
import { createStatus, getStatuses, deleteStatus } from '../controllers/status.controller';
import { getCallLogs, createCallLog } from '../controllers/callLog.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'media-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

const router = Router();

// Auth Routes
router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);
router.post('/auth/login', loginWithPassword);
router.get('/auth/check-username/:username', authenticateUser, checkUsernameAvailability);
router.get('/auth/profile/:userId', authenticateUser, getProfile);
router.put('/auth/profile/:userId', authenticateUser, updateProfile);
router.get('/users', authenticateUser, getUsers);

// Chat Routes
router.get('/chats/user/:userId', authenticateUser, getUserChats);
router.get('/chats/:chatId/messages', authenticateUser, getChatMessages);
router.post('/chats', authenticateUser, createOrGetChat);
router.post('/chats/group', authenticateUser, createGroupChat);
router.put('/chats/:chatId', authenticateUser, updateChatDetails);
router.put('/chats/messages/:messageId', authenticateUser, updateMessage);
router.delete('/chats/:chatId', authenticateUser, deleteChat);
router.delete('/chats', authenticateUser, deleteMultipleChats);

// Mobile Session Management
router.get('/sessions', authenticateUser, getMySessionsMobile);
router.delete('/sessions/other', authenticateUser, revokeOtherSessionsMobile);
router.delete('/sessions/:id', authenticateUser, revokeSession);

// Status / Stories Routes
router.post('/statuses', authenticateUser, createStatus);
router.get('/statuses', authenticateUser, getStatuses);
router.delete('/statuses/:statusId', authenticateUser, deleteStatus);

// Call History Logs Routes
router.get('/calls', authenticateUser, getCallLogs);
router.post('/calls', authenticateUser, createCallLog);

// Media Upload Routes
router.post('/media/upload', authenticateUser, upload.single('file'), (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      url: fileUrl
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Metadata Routes (Public)
router.get('/metadata/countries', getCountries);
router.get('/metadata/languages', getLanguages);

export default router;
