import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { Admin } from '../models/admin';
import { Country } from '../models/country';
import { User } from '../models/user';
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
    const countriesFilePath = path.join(__dirname, '../constants/countries.json');
    const fileData = fs.readFileSync(countriesFilePath, 'utf8');
    const countriesList = JSON.parse(fileData);

    const count = await Country.countDocuments();
    const hasFlags = await Country.findOne({ flagUrl: { $exists: true } });

    if (count !== countriesList.length || !hasFlags) {
      await Country.deleteMany({});
      await Country.insertMany(countriesList);
      logger.info(`Re-seeded ${countriesList.length} default countries with flag URLs and emojis into database.`);
    }
  } catch (error) {
    logger.error(`Failed to seed countries: ${error}`);
  }
};

export const seedChatBotUser = async () => {
  try {
    const botMobile = '9999999999';
    const botExists = await User.findOne({ mobileNumber: botMobile });
    if (!botExists) {
      await User.create({
        displayName: 'Ollama AI Bot',
        mobileNumber: botMobile,
        username: 'ollama_bot',
        slogan: 'Powered by Ollama Local AI service 🤖',
        status: 'online',
        accountStatus: 'active',
        profileImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        lastSeen: new Date(),
      });
      logger.info(`Seeded Ollama AI Bot user successfully!`);
    }
  } catch (error) {
    logger.error(`Failed to seed Ollama AI Bot user: ${error}`);
  }
};
