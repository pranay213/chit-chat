import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Chat } from '../models/chat';
import { Message } from '../models/message';
import { successResponse, errorResponse } from '../utils/response';
import { executePaginatedQuery } from '../utils/queryParser';
import { ErrorMessages, SuccessMessages } from '../constants/errors';

export const getAllChatsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = {
      sort: '-updatedAt',
      limit: 50,
      ...req.query
    };
    const populate = [
      { path: 'participants', select: 'displayName profileImage status lastSeen mobileNumber email' },
      { path: 'lastMessage' }
    ];
    const paginatedChats = await executePaginatedQuery(Chat, query, populate);
    successResponse(res, 200, SuccessMessages.CHAT.FETCHED, paginatedChats);
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.CHAT.FETCHED_FAILED, error);
  }
};

export const getUserChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const query = {
      sort: '-updatedAt',
      limit: 200,         // return all chat threads (not just the default 10)
      ...req.query,       // allow client to override
      participants: new mongoose.Types.ObjectId(userId as string)
    };
    const populate = [
      { path: 'participants', select: 'displayName profileImage status lastSeen mobileNumber email' },
      { path: 'lastMessage' }
    ];
    const paginatedChats = await executePaginatedQuery(Chat, query, populate);
    successResponse(res, 200, SuccessMessages.CHAT.FETCHED, paginatedChats);
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.CHAT.FETCHED_FAILED, error);
  }
};

export const getChatMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    // Force ascending chronological order and a high limit so the full history is returned.
    // Any explicit query params from the client can still override.
    const finalQuery = {
      sort: 'createdAt',  // oldest-first chronological order
      limit: 500,         // fetch up to 500 messages (covers most chat histories)
      ...req.query,       // allow client to override if needed
      chatId: new mongoose.Types.ObjectId(chatId as string)
    };
    const populate = [
      { path: 'senderId', select: 'displayName profileImage' }
    ];
    const paginatedMessages = await executePaginatedQuery(Message, finalQuery, populate);
    successResponse(res, 200, SuccessMessages.CHAT.MESSAGES_FETCHED, paginatedMessages);
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.CHAT.MESSAGES_FETCHED_FAILED, error);
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
    successResponse(res, 201, SuccessMessages.CHAT.CREATED, { chat });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.CHAT.CREATED_FAILED, error);
  }
};

export const updateChatDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { groupName, groupPhoto, participants, admins } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      errorResponse(res, 404, ErrorMessages.CHAT.CHAT_NOT_FOUND);
      return;
    }

    if (groupName !== undefined) chat.groupName = groupName;
    if (groupPhoto !== undefined) chat.groupPhoto = groupPhoto;
    if (participants !== undefined) chat.participants = participants.map((id: string) => new mongoose.Types.ObjectId(id));
    if (admins !== undefined) chat.admins = admins.map((id: string) => new mongoose.Types.ObjectId(id));

    await chat.save();
    successResponse(res, 200, SuccessMessages.CHAT.UPDATED, { chat });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.CHAT.UPDATED_FAILED, error);
  }
};

export const updateMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { text, attachments } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      errorResponse(res, 404, ErrorMessages.CHAT.MESSAGE_NOT_FOUND);
      return;
    }

    if (text !== undefined) message.text = text;
    if (attachments !== undefined) message.attachments = attachments;

    await message.save();
    successResponse(res, 200, SuccessMessages.CHAT.MESSAGE_UPDATED, { message });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.CHAT.MESSAGE_UPDATED_FAILED, error);
  }
};

export const createOrGetChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participantId, currentUserId } = req.body;
    if (!participantId || !currentUserId) {
      errorResponse(res, 400, ErrorMessages.CHAT.CREATED_FAILED);
      return;
    }

    // Find if a 1-to-1 chat already exists between these two users
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [currentUserId, participantId], $size: 2 }
    });

    if (!chat) {
      chat = await Chat.create({
        isGroup: false,
        participants: [currentUserId, participantId]
      });
    }

    // Populate participants and lastMessage
    const populatedChat = await Chat.findById(chat._id).populate([
      { path: 'participants', select: 'displayName profileImage status lastSeen mobileNumber email' },
      { path: 'lastMessage' }
    ]);

    successResponse(res, 201, SuccessMessages.CHAT.CREATED, { chat: populatedChat });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.CHAT.CREATED_FAILED, error);
  }
};

export const deleteChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      errorResponse(res, 404, ErrorMessages.CHAT.CHAT_NOT_FOUND);
      return;
    }

    // Delete all messages in the chat
    await Message.deleteMany({ chatId: new mongoose.Types.ObjectId(chatId as string) });

    // Delete the chat itself
    await Chat.findByIdAndDelete(chatId);

    successResponse(res, 200, SuccessMessages.CHAT.DELETED);
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.CHAT.DELETED_FAILED, error);
  }
};

export const deleteMultipleChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatIds } = req.body;
    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      errorResponse(res, 400, ErrorMessages.CHAT.INVALID_CHAT_IDS);
      return;
    }

    const objectIds = chatIds.map((id: string) => new mongoose.Types.ObjectId(id));

    // Delete all messages for these chats
    await Message.deleteMany({ chatId: { $in: objectIds } });

    // Delete the chats
    await Chat.deleteMany({ _id: { $in: objectIds } });

    successResponse(res, 200, SuccessMessages.CHAT.DELETED);
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.CHAT.DELETED_FAILED, error);
  }
};
