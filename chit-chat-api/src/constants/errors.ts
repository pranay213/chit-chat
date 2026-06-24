export const ErrorMessages = {
  AUTH: {
    TOKEN_NOT_PROVIDED: 'Authentication error: Token not provided',
    SESSION_INACTIVE: 'Authentication error: Session inactive or revoked',
    INVALID_CREDENTIALS: 'Authentication error: Invalid credentials',
    INVALID_TOKEN: 'Token is not valid',
    UNAUTHORIZED: 'Unauthorized',
    ACCESS_DENIED_ROLE: 'Access denied. Role not found.',
    ACCESS_DENIED_SUPER_ADMIN: 'Access denied. Super Admin or Developer role required.',
    INACTIVE_ACCOUNT: 'Invalid credentials or inactive account',
    ADMIN_EXISTS: 'Admin with this email already exists',
    ROLE_EXISTS: 'Role already exists',
    ROLE_REQUIRED: 'Role name is required',
    ROLE_NOT_FOUND: 'Role not found',
    SESSION_NOT_FOUND: 'Session not found',
    SESSION_REVOKE_UNAUTHORIZED: 'Unauthorized to revoke this session',
    MISSING_FIELDS: 'Please provide email or mobileNumber',
    INVALID_OTP: 'Invalid OTP',
    USER_NOT_FOUND: 'User not found',
    FAILED_USER_RESOLVE: 'Failed to resolve user account',
    CURRENT_TOKEN_MISSING: 'Current authorization token not found'
  },
  CHAT: {
    CHAT_NOT_FOUND: 'Chat not found',
    CHAT_ID_REQUIRED: 'Chat ID is required'
  },
  SYSTEM: {
    SERVER_ERROR: 'Server Error during request',
    DB_FAILED: 'Database operation failed'
  }
};

export const SuccessMessages = {
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    OTP_SENT: 'OTP sent successfully',
    OTP_VERIFIED: 'OTP verified successfully',
    PROFILE_UPDATED: 'Profile updated'
  },
  ROLE: {
    CREATED: 'Role created successfully',
    RETRIEVED: 'Roles retrieved successfully',
    UPDATED: 'Role updated successfully',
    DELETED: 'Role deleted successfully'
  },
  SESSION: {
    RETRIEVED: 'Sessions retrieved successfully',
    REVOKED: 'Session revoked successfully'
  },
  CHAT: {
    FETCHED: 'Chats fetched successfully',
    MESSAGES_FETCHED: 'Messages fetched successfully',
    CREATED: 'Group chat created'
  }
};
