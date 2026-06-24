import swaggerAutogen from 'swagger-autogen';
import path from 'path';
import fs from 'fs';

const outputFile = path.join(__dirname, '../src/generated/swagger-docs.json');
const endpointsFiles = [path.join(__dirname, '../src/routes/index.ts')];

// Read existing mongoose-to-swagger schemas if they exist
const schemasPath = path.join(__dirname, '../src/generated/swagger-schemas.json');
let schemas = {};
if (fs.existsSync(schemasPath)) {
  const fileContent = fs.readFileSync(schemasPath, 'utf8');
  if (fileContent) {
    const parsed = JSON.parse(fileContent);
    schemas = parsed.components?.schemas || {};
  }
}

const doc = {
  info: {
    version: '1.0.0',
    title: 'Chit-Chat API',
    description: 'Auto-generated API documentation for Chit-Chat App',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Local server',
    },
  ],
  components: {
    schemas: schemas,
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

// Generate swagger docs
swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc).then(() => {
  console.log('✅ Swagger documentation automatically generated at src/generated/swagger-docs.json');
});
