import mongoose, { Model } from 'mongoose';

export interface ParsedQuery {
  filter: any;
  sort: any;
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Parses query parameters from request URL to MongoDB query objects
 * Support for:
 * - Pagination: page, limit, skip
 * - Sorting: sort=-createdAt,email (comma separated, dash prefix for DESC)
 * - Filtering: exact matches, operators (gt, gte, lt, lte, ne, in, nin, regex, options)
 * - Case-insensitive regex searches
 * - Auto-parsing of booleans, numbers, and ISO dates
 */
export const parseQueryParams = (reqQuery: any): ParsedQuery => {
  const queryObj = { ...reqQuery };

  // Exclude standard pagination & sorting fields from filtering
  const excludedFields = ['page', 'limit', 'sort', 'fields', 'skip'];
  excludedFields.forEach(el => delete queryObj[el]);

  const filter: any = {};

  Object.keys(queryObj).forEach(key => {
    const val = queryObj[key];

    if (typeof val === 'object' && val !== null && !(val instanceof mongoose.Types.ObjectId)) {
      const fieldFilter: any = {};
      Object.keys(val).forEach(operator => {
        const opVal = val[operator];
        const mongoOp = `$${operator}`;

        if (operator === 'regex') {
          // If regex is specified, default to case-insensitive unless case-sensitive is requested
          const options = val['options'] || 'i';
          fieldFilter['$regex'] = opVal;
          fieldFilter['$options'] = options;
        } else if (operator === 'options') {
          // Skip as it's processed in regex block
          return;
        } else if (operator === 'in' || operator === 'nin') {
          if (typeof opVal === 'string') {
            fieldFilter[mongoOp] = opVal.split(',');
          } else {
            fieldFilter[mongoOp] = opVal;
          }
        } else {
          fieldFilter[mongoOp] = parseValue(opVal);
        }
      });
      if (Object.keys(fieldFilter).length > 0) {
        filter[key] = fieldFilter;
      }
    } else {
      // Direct exact match, check for booleans, numbers, dates
      filter[key] = parseValue(val);
    }
  });

  // Sorting
  let sort: any = {};
  if (reqQuery.sort) {
    const sortFields = reqQuery.sort.split(',');
    sortFields.forEach((field: string) => {
      let sortOrder = 1;
      let fieldName = field.trim();
      if (fieldName.startsWith('-')) {
        sortOrder = -1;
        fieldName = fieldName.substring(1);
      }
      sort[fieldName] = sortOrder;
    });
  } else {
    sort = { createdAt: -1 }; // Default sort
  }

  // Pagination
  const page = Math.max(1, parseInt(reqQuery.page, 10) || 1);
  const limit = Math.max(1, Math.min(1000, parseInt(reqQuery.limit, 10) || 10)); // Cap limit at 1000
  const skip = reqQuery.skip !== undefined ? Math.max(0, parseInt(reqQuery.skip, 10) || 0) : (page - 1) * limit;

  return { filter, sort, page, limit, skip };
};

/**
 * Utility function to automatically execute query parsing, database find, and pagination counts
 */
export const executePaginatedQuery = async <T>(
  model: Model<T>,
  reqQuery: any,
  populateFields: any[] = [],
  selectFields: string = '',
  lean: boolean = true
): Promise<PaginatedResult<T>> => {
  const { filter, sort, page, limit, skip } = parseQueryParams(reqQuery);

  let query = model.find(filter);

  // Sorting
  query = query.sort(sort);

  // Skip & Limit
  query = query.skip(skip).limit(limit);

  // Select fields
  if (selectFields) {
    query = query.select(selectFields);
  }

  // Populate fields
  populateFields.forEach(field => {
    query = query.populate(field);
  });

  // Use lean queries for 5-10x performance boost (raw JSON instead of full Mongoose documents)
  if (lean) {
    query = query.lean() as any;
  }

  // Run database query and counts in parallel for optimization
  const [data, totalRecords] = await Promise.all([
    query.exec(),
    model.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    data: data as any[],
    pagination: {
      totalRecords,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// Helper to parse values to correct types
const parseValue = (val: any): any => {
  if (typeof val !== 'string') return val;

  // Boolean parsing
  if (val.toLowerCase() === 'true') return true;
  if (val.toLowerCase() === 'false') return false;

  // Number parsing
  if (!isNaN(Number(val)) && val.trim() !== '') return Number(val);

  // ISO Date parsing
  if (isNaN(Number(val)) && !isNaN(Date.parse(val)) && val.includes('-')) {
    return new Date(val);
  }

  return val;
};
