import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Country } from '../models/country';
import { successResponse, errorResponse } from '../utils/response';
import { ErrorMessages, SuccessMessages } from '../constants/errors';
import { executePaginatedQuery } from '../utils/queryParser';
import { translateMessage } from '../utils/translation';

export const getCountries = async (req: Request, res: Response): Promise<void> => {
  try {
    const lang = (req.headers['accept-language'] || 'en') as string;
    const paginatedCountries = await executePaginatedQuery(Country, req.query);

    // Dynamic localization of seeded country names before returning to client
    if (paginatedCountries.data && Array.isArray(paginatedCountries.data)) {
      paginatedCountries.data = paginatedCountries.data.map((c: any) => ({
        ...c,
        name: translateMessage(c.name, lang)
      }));
    }

    successResponse(res, 200, SuccessMessages.METADATA.COUNTRY_RETRIEVED, paginatedCountries);
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.METADATA.COUNTRY_RETRIEVED_FAILED, error);
  }
};

export const getLanguages = async (req: Request, res: Response): Promise<void> => {
  try {
    const lang = (req.headers['accept-language'] || 'en') as string;
    const languagesFilePath = path.join(__dirname, '../constants/languages.json');
    const fileData = fs.readFileSync(languagesFilePath, 'utf8');
    const languagesList = JSON.parse(fileData);

    // Dynamic localization of language names before returning to client
    const localizedLanguages = languagesList.map((l: any) => ({
      ...l,
      name: translateMessage(l.name, lang)
    }));

    successResponse(res, 200, SuccessMessages.METADATA.LANGUAGE_RETRIEVED, { languages: localizedLanguages });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.METADATA.LANGUAGE_RETRIEVED_FAILED, error);
  }
};
