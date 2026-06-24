import { Request, Response } from 'express';
import { Role } from '../models/role';
import { successResponse, errorResponse } from '../utils/response';
import { executePaginatedQuery } from '../utils/queryParser';
import { cache } from '../utils/cache';
import logger from '../utils/logger';

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, permissions, description } = req.body;

    if (!name) {
      errorResponse(res, 400, 'Role name is required');
      return;
    }

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      errorResponse(res, 400, 'Role already exists');
      return;
    }

    const newRole = await Role.create({
      name,
      permissions: permissions || [],
      description
    });

    successResponse(res, 201, 'Role created successfully', { role: newRole });
  } catch (error) {
    logger.error(`Create Role error: ${error}`);
    errorResponse(res, 500, 'Failed to create role', error);
  }
};

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const paginatedRoles = await executePaginatedQuery(Role, req.query);
    successResponse(res, 200, 'Roles retrieved successfully', paginatedRoles);
  } catch (error) {
    logger.error(`Get Roles error: ${error}`);
    errorResponse(res, 500, 'Failed to retrieve roles', error);
  }
};

export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);

    if (!role) {
      errorResponse(res, 404, 'Role not found');
      return;
    }

    successResponse(res, 200, 'Role retrieved successfully', { role });
  } catch (error) {
    logger.error(`Get Role by ID error: ${error}`);
    errorResponse(res, 500, 'Failed to retrieve role', error);
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
      errorResponse(res, 404, 'Role not found');
      return;
    }

    // Invalidate cached role
    cache.delete(`role:${role.name}`);

    successResponse(res, 200, 'Role updated successfully', { role });
  } catch (error) {
    logger.error(`Update Role error: ${error}`);
    errorResponse(res, 500, 'Failed to update role', error);
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = await Role.findByIdAndDelete(id);

    if (!role) {
      errorResponse(res, 404, 'Role not found');
      return;
    }

    // Invalidate cached role
    cache.delete(`role:${role.name}`);

    successResponse(res, 200, 'Role deleted successfully');
  } catch (error) {
    logger.error(`Delete Role error: ${error}`);
    errorResponse(res, 500, 'Failed to delete role', error);
  }
};
