import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { Admin } from '../models/admin';
import { Country } from '../models/country';
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

export const seedCountries = async () => {
  try {
    const count = await Country.countDocuments();
    if (count === 0) {
      const countriesFilePath = path.join(__dirname, '../constants/countries.json');
      const fileData = fs.readFileSync(countriesFilePath, 'utf8');
      const countriesList = JSON.parse(fileData);

      await Country.insertMany(countriesList);
      logger.info(`Seeded ${countriesList.length} default countries into database.`);
    }
  } catch (error) {
    logger.error(`Failed to seed countries: ${error}`);
  }
};
