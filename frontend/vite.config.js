import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function localEmailPlugin(env) {
  return {
    name: 'bizcrm-local-email-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'ok',
              service: 'BizCRM Local Email Dispatcher',
              provider: env.BREVO_API_KEY ? 'brevo' : 'unconfigured',
              isConfigured: Boolean(env.BREVO_API_KEY),
              timezone: env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
            })
          );
          return;
        }

        if (url === '/api/send-email' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { toEmail, toName, subject, htmlContent } = JSON.parse(body || '{}');
              if (!toEmail) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Recipient email is required' }));
                return;
              }

              if (!env.BREVO_API_KEY) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'BREVO_API_KEY not configured in .env.local' }));
                return;
              }

              const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                  'api-key': env.BREVO_API_KEY,
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: JSON.stringify({
                  sender: {
                    name: env.SENDER_NAME || 'Jugarr Agency',
                    email: env.SENDER_EMAIL || 'warshasingh21@gmail.com',
                  },
                  to: [{ email: toEmail, name: toName || toEmail }],
                  subject: subject || 'BizCRM Notification',
                  htmlContent: htmlContent || `<p>${subject}</p>`,
                }),
              });

              const data = await brevoRes.json();
              res.statusCode = brevoRes.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: brevoRes.ok, ...data }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      localEmailPlugin(env),
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Personal Business CRM',
        short_name: 'BizCRM',
        description: 'Mobile-first Personal Business CRM Progressive Web App for solo operators',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/test/**/*.{test,spec}.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    pool: 'threads',
  },
  };
});

