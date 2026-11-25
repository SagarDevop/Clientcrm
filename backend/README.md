# BizCRM Dedicated Backend

Production-ready Node.js + Express + Socket.IO backend for BizCRM.

## Deploying to Render (Step-by-Step)

1. Create a new **Web Service** on [Render.com](https://render.com).
2. Connect your GitHub repository (`SagarDevop/Clientcrm`).
3. Set the configuration:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Set **Environment Variables** in Render:
   - `PORT`: `5000` (or leave default, Render sets `PORT` automatically)
   - `MONGODB_URI`: `<your_mongodb_atlas_connection_string>`
   - `JWT_SECRET`: `<your_secure_jwt_secret>`
   - `CORS_ORIGIN`: `https://crm.jugarr.in,http://localhost:5173`
   - `NODE_ENV`: `production`
5. Click **Deploy Web Service**.
6. Render will assign a live URL (e.g., `https://bizcrm-backend.onrender.com`).
7. Update `VITE_API_URL` and `VITE_SOCKET_URL` in your frontend environment variables to point to your Render backend URL.
