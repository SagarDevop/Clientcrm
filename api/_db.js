import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dbmangoo71:ybGQKq4YDhuQDuCA@cluster0.z3vvxhb.mongodb.net/CRMJugarr?retryWrites=true&w=majority&tls=true';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });

  await client.connect();
  const db = client.db('CRMJugarr');

  cachedClient = client;
  cachedDb = db;
  return { client, db };
}
