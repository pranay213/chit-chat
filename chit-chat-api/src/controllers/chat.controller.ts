import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Chat } from '../models/chat';
import { Message } from '../models/message';
import { successResponse, errorResponse } from '../utils/response';
export const getUserChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params; // Or get from JWT
    // Fetch all chats where the user is a participant
    // Populate the lastMessage and other participants' info
    const chats = await Chat.find({ participants: new mongoose.Types.ObjectId(userId as string) })
      .populate('participants', 'displayName profileImage status lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    successResponse(res, 200, 'Chats fetched successfully', { chats });
  } catch (error) {
    errorResponse(res, 500, 'Failed to fetch chats', error);
  }
};
export const getChatMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chatId: new mongoose.Types.ObjectId(chatId as string) })
      .populate('senderId', 'displayName profileImage')
      .sort({ createdAt: 1 });
    successResponse(res, 200, 'Messages fetched successfully', { messages });
  } catch (error) {
    errorResponse(res, 500, 'Failed to fetch messages', error);
  }
};
export const createGroupChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupName, participants, adminId } = req.body;
    const chat = await Chat.create({
      isGroup: true,
      groupName,
      participants: [...participants, adminId],
      admins: [adminId]
    });
    successResponse(res, 201, 'Group chat created', { chat });
  } catch (error) {
    errorResponse(res, 500, 'Failed to create group chat', error);
  }
};
