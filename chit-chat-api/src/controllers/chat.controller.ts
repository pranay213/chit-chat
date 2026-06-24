import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Chat } from '../models/chat';
import { Message } from '../models/message';
import { successResponse, errorResponse } from '../utils/response';
import { executePaginatedQuery } from '../utils/queryParser';

export const getUserChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const query = {
      ...req.query,
      participants: new mongoose.Types.ObjectId(userId as string)
    };
    const populate = [
      { path: 'participants', select: 'displayName profileImage status lastSeen' },
      { path: 'lastMessage' }
    ];
    const paginatedChats = await executePaginatedQuery(Chat, query, populate);
    successResponse(res, 200, 'Chats fetched successfully', paginatedChats);
  } catch (error) {
    errorResponse(res, 500, 'Failed to fetch chats', error);
  }
};

export const getChatMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const query = {
      ...req.query,
      chatId: new mongoose.Types.ObjectId(chatId as string)
    };
    const populate = [
      { path: 'senderId', select: 'displayName profileImage' }
    ];
    // Default messages sorting to oldest first (createdAt ascending) if no sort query parameter is supplied
    const finalQuery = { sort: 'createdAt', ...req.query };
    const paginatedMessages = await executePaginatedQuery(Message, { ...query, ...finalQuery }, populate);
    successResponse(res, 200, 'Messages fetched successfully', paginatedMessages);
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
