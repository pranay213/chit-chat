import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import fs from 'fs';
import path from 'path';

export const setupSwagger = (app: Express) => {
  // Read auto-generated swagger documentation (which contains both paths and schemas)
  const docsPath = path.join(process.cwd(), 'src/generated/swagger-docs.json');
  let swaggerDocument = {};
  if (fs.existsSync(docsPath)) {
    swaggerDocument = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
  }

  const customJsStr = `
    window.addEventListener('load', function() {
      const originalFetch = window.fetch;
      window.fetch = async function() {
        const response = await originalFetch.apply(this, arguments);
        const clonedResponse = response.clone();
        try {
          const url = arguments[0];
          if (url && (url.includes('/admin/login') || url.includes('/mobile/auth/verify-otp')) && arguments[1] && arguments[1].method === 'POST') {
            const data = await clonedResponse.json();
            const token = data?.data?.token || data?.token;
            if (token && window.ui) {
              window.ui.authActions.authorize({
                bearerAuth: {
                  name: 'bearerAuth',
                  schema: { type: 'http', in: 'header', name: 'Authorization' },
                  value: token
                }
              });
              alert('✨ JWT Token intercepted and automatically applied to Swagger Authorization!');
            }
          }
        } catch (e) {
          console.error('Auto-auth interceptor failed', e);
        }
        return response;
      };
    });
  `;

  const options = {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customJsStr,
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
};
