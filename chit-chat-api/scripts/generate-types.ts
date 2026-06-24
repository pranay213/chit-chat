import * as fs from 'fs';
import * as path from 'path';
import m2s from 'mongoose-to-swagger';

// Dynamically read models
const modelsDir = path.join(process.cwd(), 'src/models');
const modelFiles = fs.readdirSync(modelsDir).filter((file: string) => file.endsWith('.ts') && file !== 'index.ts');

const generateDocsAndTypes = () => {
  const swaggerSchemas: Record<string, any> = {};
  
  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), 'src/generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  modelFiles.forEach((file: string) => {
    const filePath = path.join(modelsDir, file);
    // dynamically require the model file
    const module = require(filePath);
    
    // Find the exported mongoose model
    // Convert 'user' to 'User'
    const modelName = file.replace('.ts', '');
    const exportName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    const model = module[exportName];

    if (!model || !model.schema) {
      console.warn(`⚠️ Could not find a valid Mongoose model in ${file}. Expected export name: ${exportName}`);
      return;
    }

    // 1. Generate Swagger Schema
    const swaggerSchema = m2s(model);
    swaggerSchemas[modelName] = swaggerSchema;

    // 2. Generate TypeScript Interface
    let tsTypes = `/**\n * Auto-generated TypeScript DTO for ${modelName}\n */\n\n`;
    tsTypes += `export interface ${modelName}DTO {\n`;
    
    const schemaPaths = model.schema.paths;
    for (const [pathName, pathType] of Object.entries(schemaPaths)) {
      if (pathName === '__v') continue;

      const pType = pathType as any;
      const isOptional = !pType.isRequired;
      const typeStr = mapMongooseToTs(pType.instance, pType.options?.type);
      
      tsTypes += `  ${pathName}${isOptional ? '?' : ''}: ${typeStr};\n`;
    }
    tsTypes += `}\n\n`;

    // 3. Write individual smaller case text file (e.g., user.dto.ts)
    const lowerCaseFileName = `${modelName.toLowerCase()}.dto.ts`;
    fs.writeFileSync(path.join(outputDir, lowerCaseFileName), tsTypes);
    console.log(`✅ Generated DTO at src/generated/${lowerCaseFileName}`);
  });

  // Write Swagger JSON
  const swaggerDocs = {
    components: {
      schemas: swaggerSchemas,
    },
  };
  fs.writeFileSync(path.join(outputDir, 'swagger-schemas.json'), JSON.stringify(swaggerDocs, null, 2));
  console.log('✅ Generated Swagger Schemas at src/generated/swagger-schemas.json');
};

const mapMongooseToTs = (instance: string, typeOptions: any): string => {
  switch (instance) {
    case 'String':
    case 'ObjectID':
    case 'ObjectId':
      return 'string';
    case 'Number':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'Date | string';
    case 'Array':
      // Basic array inference
      return 'any[]';
    default:
      return 'any';
  }
};

generateDocsAndTypes();
