import { Request, Response } from 'express';
import { User } from '../models/user';
import { successResponse, errorResponse } from '../utils/response';
import { executePaginatedQuery } from '../utils/queryParser';
import logger from '../utils/logger';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobileNumber, email, displayName, username, gender, slogan, country, defaultLanguage, accountStatus } = req.body;

    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser) {
      errorResponse(res, 400, 'USER_EXISTS');
      return;
    }

    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        errorResponse(res, 400, 'USER_EXISTS');
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

    successResponse(res, 201, 'USER_CREATED', { user: newUser });
  } catch (error) {
    logger.error(`Create User error: ${error}`);
    errorResponse(res, 500, 'USER_CREATED_FAILED', error);
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
    successResponse(res, 200, 'USER_RETRIEVED', paginatedUsers);
  } catch (error) {
    logger.error(`Get Users error: ${error}`);
    errorResponse(res, 500, 'USER_RETRIEVED_FAILED', error);
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate('country');

    if (!user) {
      errorResponse(res, 404, 'USER_NOT_FOUND');
      return;
    }

    successResponse(res, 200, 'USER_RETRIEVED', { user });
  } catch (error) {
    logger.error(`Get User by ID error: ${error}`);
    errorResponse(res, 500, 'USER_RETRIEVED_FAILED', error);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('country');

    if (!user) {
      errorResponse(res, 404, 'USER_NOT_FOUND');
      return;
    }

    successResponse(res, 200, 'USER_UPDATED', { user });
  } catch (error) {
    logger.error(`Update User error: ${error}`);
    errorResponse(res, 500, 'USER_UPDATED_FAILED', error);
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      errorResponse(res, 404, 'USER_NOT_FOUND');
      return;
    }

    successResponse(res, 200, 'USER_DELETED');
  } catch (error) {
    logger.error(`Delete User error: ${error}`);
    errorResponse(res, 500, 'USER_DELETED_FAILED', error);
  }
};
