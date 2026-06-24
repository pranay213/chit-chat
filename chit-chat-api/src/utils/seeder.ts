import bcrypt from 'bcryptjs';
import { Admin } from '../models/admin';
import { AdminRole } from '../constants/roles';
import logger from './logger';

export const seedDefaultAdmins = async () => {
  try {
    const superAdminEmail = 'superadmin@example.com';
    const developerEmail = 'developer@example.com';

    const superAdminExists = await Admin.findOne({ email: superAdminEmail });
    if (!superAdminExists) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password123', salt);
      await Admin.create({
        email: superAdminEmail,
        passwordHash,
        role: AdminRole.SUPER_ADMIN,
        isActive: true
      });
      logger.info(`Seeded default Super Admin: ${superAdminEmail} / password123`);
    }

    const developerExists = await Admin.findOne({ email: developerEmail });
    if (!developerExists) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password123', salt);
      await Admin.create({
        email: developerEmail,
        passwordHash,
        role: AdminRole.DEVELOPER,
        isActive: true
      });
      logger.info(`Seeded default Developer Admin: ${developerEmail} / password123`);
    }
  } catch (error) {
    logger.error(`Failed to seed default admins: ${error}`);
  }
};
