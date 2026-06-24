import { Request, Response } from 'express';
import { Role } from '../models/role';
import { successResponse, errorResponse } from '../utils/response';
import { executePaginatedQuery } from '../utils/queryParser';
import { cache } from '../utils/cache';
import { ErrorMessages, SuccessMessages } from '../constants/errors';
import logger from '../utils/logger';

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, permissions, description } = req.body;

    if (!name) {
      errorResponse(res, 400, ErrorMessages.AUTH.ROLE_REQUIRED);
      return;
    }

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      errorResponse(res, 400, ErrorMessages.AUTH.ROLE_EXISTS);
      return;
    }

    const newRole = await Role.create({
      name,
      permissions: permissions || [],
      description
    });

    successResponse(res, 201, SuccessMessages.ROLE.CREATED, { role: newRole });
  } catch (error) {
    logger.error(`Create Role error: ${error}`);
    errorResponse(res, 500, ErrorMessages.ROLE.CREATED_FAILED, error);
  }
};

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const paginatedRoles = await executePaginatedQuery(Role, req.query);
    successResponse(res, 200, SuccessMessages.ROLE.RETRIEVED, paginatedRoles);
  } catch (error) {
    logger.error(`Get Roles error: ${error}`);
    errorResponse(res, 500, ErrorMessages.ROLE.RETRIEVED_FAILED, error);
  }
};

export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);

    if (!role) {
      errorResponse(res, 404, ErrorMessages.AUTH.ROLE_NOT_FOUND);
      return;
    }

    successResponse(res, 200, SuccessMessages.ROLE.RETRIEVED, { role });
  } catch (error) {
    logger.error(`Get Role by ID error: ${error}`);
    errorResponse(res, 500, ErrorMessages.ROLE.RETRIEVED_FAILED, error);
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permissions, description } = req.body;

    const role = await Role.findByIdAndUpdate(
      id,
      { permissions, description },
      { new: true }
    );

    if (!role) {
      errorResponse(res, 404, ErrorMessages.AUTH.ROLE_NOT_FOUND);
      return;
    }

    // Invalidate cached role
    cache.delete(`role:${role.name}`);

    successResponse(res, 200, SuccessMessages.ROLE.UPDATED, { role });
  } catch (error) {
    logger.error(`Update Role error: ${error}`);
    errorResponse(res, 500, ErrorMessages.ROLE.UPDATED_FAILED, error);
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = await Role.findByIdAndDelete(id);

    if (!role) {
      errorResponse(res, 404, ErrorMessages.AUTH.ROLE_NOT_FOUND);
      return;
    }

    // Invalidate cached role
    cache.delete(`role:${role.name}`);

    successResponse(res, 200, SuccessMessages.ROLE.DELETED);
  } catch (error) {
    logger.error(`Delete Role error: ${error}`);
    errorResponse(res, 500, ErrorMessages.ROLE.DELETED_FAILED, error);
  }
};
