const fs = require('fs');

// 1. Patch auth.controller.ts
let auth = fs.readFileSync('src/controllers/auth.controller.ts', 'utf8');
auth = auth.replace(/'Profile fetched'/g, 'SuccessMessages.AUTH.PROFILE_FETCHED');
auth = auth.replace(/'Username must be at least 3 characters long'/g, 'ErrorMessages.AUTH.USERNAME_TOO_SHORT');
auth = auth.replace(/'Username is taken'/g, 'SuccessMessages.AUTH.USERNAME_TAKEN');
auth = auth.replace(/'Username is available'/g, 'SuccessMessages.AUTH.USERNAME_AVAILABLE');
auth = auth.replace(/'Failed to check username availability'/g, 'ErrorMessages.AUTH.USERNAME_CHECK_FAILED');
fs.writeFileSync('src/controllers/auth.controller.ts', auth);

// 2. Patch chat.controller.ts
let chat = fs.readFileSync('src/controllers/chat.controller.ts', 'utf8');
chat = chat.replace(/'Invalid chatIds list'/g, 'ErrorMessages.CHAT.INVALID_CHAT_IDS');
fs.writeFileSync('src/controllers/chat.controller.ts', chat);

// 3. Patch errors.ts
let errors = fs.readFileSync('src/constants/errors.ts', 'utf8');
errors = errors.replace(/PROFILE_UPDATE_FAILED: 'AUTH_PROFILE_UPDATE_FAILED'/, "PROFILE_UPDATE_FAILED: 'AUTH_PROFILE_UPDATE_FAILED',\n    USERNAME_TOO_SHORT: 'AUTH_USERNAME_TOO_SHORT',\n    USERNAME_CHECK_FAILED: 'AUTH_USERNAME_CHECK_FAILED'");
errors = errors.replace(/DELETED_FAILED: 'CHAT_DELETED_FAILED'/, "DELETED_FAILED: 'CHAT_DELETED_FAILED',\n    INVALID_CHAT_IDS: 'CHAT_INVALID_CHAT_IDS'");
errors = errors.replace(/PROFILE_UPDATED: 'AUTH_PROFILE_UPDATED'/, "PROFILE_UPDATED: 'AUTH_PROFILE_UPDATED',\n    PROFILE_FETCHED: 'AUTH_PROFILE_FETCHED',\n    USERNAME_TAKEN: 'AUTH_USERNAME_TAKEN',\n    USERNAME_AVAILABLE: 'AUTH_USERNAME_AVAILABLE'");
fs.writeFileSync('src/constants/errors.ts', errors);

// 4. Patch translations.ts
let trans = fs.readFileSync('src/constants/translations.ts', 'utf8');
trans = trans.replace(/'AUTH_PROFILE_UPDATE_FAILED': 'Failed to update profile',/, "'AUTH_PROFILE_UPDATE_FAILED': 'Failed to update profile',\n    'AUTH_USERNAME_TOO_SHORT': 'Username must be at least 3 characters long',\n    'AUTH_USERNAME_CHECK_FAILED': 'Failed to check username availability',");
trans = trans.replace(/'MESSAGE_NOT_FOUND': 'Message not found',/, "'MESSAGE_NOT_FOUND': 'Message not found',\n    'CHAT_INVALID_CHAT_IDS': 'Invalid chatIds list',");
trans = trans.replace(/'AUTH_PROFILE_UPDATED': 'Profile updated',/, "'AUTH_PROFILE_UPDATED': 'Profile updated',\n    'AUTH_PROFILE_FETCHED': 'Profile fetched',\n    'AUTH_USERNAME_TAKEN': 'Username is taken',\n    'AUTH_USERNAME_AVAILABLE': 'Username is available',");
fs.writeFileSync('src/constants/translations.ts', trans);
console.log("Patched responses!");
