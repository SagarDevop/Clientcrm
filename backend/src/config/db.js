import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import { MongoClient } from 'mongodb';

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'bizcrm-saas-jwt-secret-key-super-secure',
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DB_NAME || 'CRMJugarr',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,https://crm.jugarr.in').split(','),
};

let cachedClient = null;
let cachedDb = null;

export async function connectMongo() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  const client = new MongoClient(config.mongoUri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 8000,
  });
  await client.connect();
  const db = client.db(config.dbName);
  cachedClient = client;
  cachedDb = db;
  console.log(`[Database] Connected to MongoDB Atlas (${config.dbName})`);
  return { client, db };
}
