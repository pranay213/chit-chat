import { Request, Response } from 'express';
import { User } from '../models/user';
import { successResponse, errorResponse } from '../utils/response';
import { ErrorMessages, SuccessMessages } from '../constants/errors';
import { executePaginatedQuery } from '../utils/queryParser';
import logger from '../utils/logger';
import { LoggerMessages } from "../constants/loggerMessages";

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobileNumber, email, displayName, username, gender, slogan, country, defaultLanguage, accountStatus } = req.body;

    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser) {
      errorResponse(res, 400, ErrorMessages.USER.EXISTS);
      return;
    }

    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        errorResponse(res, 400, ErrorMessages.USER.EXISTS);
        return;
      }
    }

    const newUser = await User.create({
      mobileNumber,
      email,
      displayName,
      username,
      gender,
      slogan,
      country,
      defaultLanguage,
      accountStatus: accountStatus || 'active'
    });

    successResponse(res, 201, SuccessMessages.USER.CREATED, { user: newUser });
  } catch (error) {
    logger.error(LoggerMessages.CREATE_USER_ERROR(error));
    errorResponse(res, 500, ErrorMessages.USER.CREATED_FAILED, error);
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const populate = [{ path: 'country', select: 'name code dialCode flagUrl emoji' }];
    const query = {
      limit: 200, // Return up to 200 users by default
      ...req.query
    };
    const paginatedUsers = await executePaginatedQuery(User, query, populate);
    successResponse(res, 200, SuccessMessages.USER.RETRIEVED, paginatedUsers);
  } catch (error) {
    logger.error(LoggerMessages.GET_USERS_ERROR(error));
    errorResponse(res, 500, ErrorMessages.USER.RETRIEVED_FAILED, error);
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate('country');

    if (!user) {
      errorResponse(res, 404, ErrorMessages.USER.NOT_FOUND);
      return;
    }

    successResponse(res, 200, SuccessMessages.USER.RETRIEVED, { user });
  } catch (error) {
    logger.error(LoggerMessages.GET_USER_BY_ID_ERROR(error));
    errorResponse(res, 500, ErrorMessages.USER.RETRIEVED_FAILED, error);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('country');

    if (!user) {
      errorResponse(res, 404, ErrorMessages.USER.NOT_FOUND);
      return;
    }

    successResponse(res, 200, SuccessMessages.USER.UPDATED, { user });
  } catch (error) {
    logger.error(LoggerMessages.UPDATE_USER_ERROR(error));
    errorResponse(res, 500, ErrorMessages.USER.UPDATED_FAILED, error);
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      errorResponse(res, 404, ErrorMessages.USER.NOT_FOUND);
      return;
    }

    successResponse(res, 200, SuccessMessages.USER.DELETED);
  } catch (error) {
    logger.error(LoggerMessages.DELETE_USER_ERROR(error));
    errorResponse(res, 500, ErrorMessages.USER.DELETED_FAILED, error);
  }
};
