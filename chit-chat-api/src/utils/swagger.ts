import swaggerUi from 'swagger-ui-express';
import { Express, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/admin';
import { AdminRole } from '../constants/roles';

const getSwaggerCookie = (req: Request): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').reduce((acc: any, cookie: string) => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    const value = parts.slice(1).join('=');
    acc[name] = value;
    return acc;
  }, {});
  return cookies['swagger_session'] || null;
};

const swaggerAuth = (req: Request, res: Response, next: NextFunction) => {
  // Allow the login POST request to pass through to the handler
  if ((req.path === '/login' || req.originalUrl.endsWith('/login')) && req.method === 'POST') {
    return next();
  }

  const session = getSwaggerCookie(req);
  console.log(`[Swagger Auth] Path: ${req.path}, Has Session: ${!!session}`);

  if (session) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET as string;
      const decoded: any = jwt.verify(session, JWT_SECRET);
      console.log(`[Swagger Auth] Decoded role: ${decoded?.role}`);
      if (decoded && (decoded.role === AdminRole.SUPER_ADMIN || decoded.role === AdminRole.DEVELOPER)) {
        return next();
      }
    } catch (error: any) {
      console.log(`[Swagger Auth] Token verify failed: ${error.message}`);
      // Invalid or expired token, proceed to login page
    }
  }

  // Serve a beautiful glassmorphic login page for GET requests
  if (req.method === 'GET') {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign In - Chit-Chat API Docs</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Outfit', sans-serif;
            background: linear-gradient(135deg, #0b0f19 0%, #111827 100%);
            color: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
          }
          .login-card {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 40px;
            border-radius: 24px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            width: 100%;
            max-width: 440px;
            text-align: center;
            animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .logo {
            font-size: 2.2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
            letter-spacing: -0.02em;
          }
          .subtitle {
            color: #9ca3af;
            font-size: 0.95rem;
            margin-bottom: 32px;
          }
          .form-group {
            margin-bottom: 20px;
            text-align: left;
          }
          label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 8px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          input {
            width: 100%;
            background: rgba(31, 41, 55, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 14px 16px;
            border-radius: 12px;
            color: #fff;
            font-size: 1rem;
            transition: all 0.3s ease;
          }
          input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
            background: rgba(31, 41, 55, 0.8);
          }
          .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            margin-top: 10px;
          }
          .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
            background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
          }
          .btn-submit:active {
            transform: translateY(0);
          }
          .error-msg {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #f87171;
            padding: 12px;
            border-radius: 12px;
            font-size: 0.9rem;
            margin-bottom: 20px;
            display: none;
            animation: shake 0.4s ease;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-6px); }
            75% { transform: translateX(6px); }
          }
        </style>
      </head>
      <body>
        <div class="login-card">
          <div class="logo">Chit-Chat Docs</div>
          <p class="subtitle">Enter Admin / Developer credentials to unlock</p>
          <div class="error-msg" id="errorBlock">Access denied. Please check your credentials and role permissions.</div>
          <form id="loginForm">
            <div class="form-group">
              <label for="email">Admin Email</label>
              <input type="email" id="email" required placeholder="admin@example.com" autocomplete="email">
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" required placeholder="••••••••" autocomplete="current-password">
            </div>
            <button type="submit" class="btn-submit">Access Docs</button>
          </form>
        </div>
        <script>
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailVal = document.getElementById('email').value;
            const passwordVal = document.getElementById('password').value;
            const errorBlock = document.getElementById('errorBlock');
            errorBlock.style.display = 'none';

            try {
              const res = await fetch('/api-docs/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailVal, password: passwordVal })
              });
              
              if (res.ok) {
                window.location.reload();
              } else {
                const errData = await res.json();
                errorBlock.textContent = errData.error || 'Invalid credentials';
                errorBlock.style.display = 'block';
              }
            } catch (err) {
              errorBlock.textContent = 'Connection error. Please try again.';
              errorBlock.style.display = 'block';
            }
          });
        </script>
      </body>
      </html>
    `);
    return;
  }

  res.status(401).send('Unauthorized access.');
};

export const setupSwagger = (app: Express) => {
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

  // Define the POST login endpoint for Swagger UI's custom login page
  app.post('/api-docs/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const admin = await Admin.findOne({ email });

      if (!admin || !admin.isActive) {
        res.status(401).json({ error: 'Invalid credentials or inactive account' });
        return;
      }

      const isMatch = await bcrypt.compare(password, admin.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check permissions: only SUPER_ADMIN and DEVELOPER roles can access Swagger UI
      if (admin.role !== AdminRole.SUPER_ADMIN && admin.role !== AdminRole.DEVELOPER) {
        res.status(403).json({ error: 'Access denied. You do not have permissions to access Swagger docs.' });
        return;
      }

      const JWT_SECRET = process.env.JWT_SECRET as string;
      const sessionToken = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });

      // Set cookie for 7 days, scoped to root '/' to avoid path problems
      res.setHeader('Set-Cookie', `swagger_session=${sessionToken}; Path=/; HttpOnly; Max-Age=604800; SameSite=Lax`);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Server error during authentication' });
    }
  });

  // Protect Swagger UI route with the custom login page middleware
  app.use('/api-docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
};
