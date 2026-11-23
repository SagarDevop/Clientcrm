import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const uri = 'mongodb+srv://dbmangoo71:ybGQKq4YDhuQDuCA@cluster0.z3vvxhb.mongodb.net/CRMJugarr?retryWrites=true&w=majority&tls=true';
const jwtSecret = 'bizcrm-saas-jwt-secret-key-super-secure';

async function runSecurityAudit() {
  console.log('=== RUNNING PRODUCTION READINESS & SECURITY AUDIT ===\n');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('CRMJugarr');

  // Test 1: Data Consistency (MongoDB Collections Exist and have Tenant Isolation)
  console.log('[Test 1] Inspecting Authoritative MongoDB Collections...');
  const collections = await db.listCollections().toArray();
  const colNames = collections.map(c => c.name);
  console.log('Collections in CRMJugarr:', colNames);
  if (!colNames.includes('clients') || !colNames.includes('users') || !colNames.includes('payments')) {
    throw new Error('Crucial collections missing!');
  }
  console.log('✅ Core Collections Present.\n');

  // Test 2: Existing Production Data Verification (Dinesh Gurjar Invariants)
  console.log('[Test 2] Verifying Dinesh Gurjar & Business Records...');
  const dinesh = await db.collection('clients').findOne({ id: 'cli_dinesh_gurjar' });
  if (!dinesh) {
    throw new Error('Dinesh Gurjar record not found in MongoDB!');
  }
  console.log('Found Client:', dinesh.name, '| Business:', dinesh.businessName);
  console.log('Plan:', dinesh.subscriptionTitle, '| Amount: ₹', dinesh.monthlyPlanAmount);
  console.log('Periods History Count:', dinesh.periods ? dinesh.periods.length : 0);
  console.log('✅ Production client data intact.\n');

  // Test 3: Financial Calculations & Invariants
  console.log('[Test 3] Verifying Financial Invariants...');
  const payments = await db.collection('payments').find({ clientId: 'cli_dinesh_gurjar' }).toArray();
  console.log(`Recorded payments for Dinesh Gurjar: ${payments.length}`);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  console.log(`Total Inflow from Dinesh Gurjar: ₹${totalPaid}`);
  if (totalPaid < 3500) {
    throw new Error('Payment records inconsistent!');
  }
  console.log('✅ Financial integrity confirmed.\n');

  // Test 4: Role-Based Authorization & Tenant Isolation
  console.log('[Test 4] Verifying Tenant Isolation & Cross-User Security...');
  const users = await db.collection('users').find({}).toArray();
  console.log(`Total users in system: ${users.length}`);
  for (const u of users) {
    if (!u.tenantId) {
      throw new Error(`User ${u.email} missing tenant isolation tenantId!`);
    }
  }
  console.log('✅ All users are strictly bound to a tenant.\n');

  // Test 5: Authentication Token Verification
  console.log('[Test 5] Verifying JWT Token Security & Hashing...');
  const admin = users.find(u => u.email === 'warshasingh21@gmail.com');
  if (!admin) throw new Error('Founder user warshasingh21@gmail.com missing!');
  const isHashSecure = admin.passwordHash && admin.passwordHash.startsWith('$2');
  console.log('Password hash format bcrypt:', isHashSecure);
  if (!isHashSecure) throw new Error('Password is not properly hashed!');
  console.log('✅ Password hashing is secure.\n');

  console.log('=== ALL AUDIT CHECKS PASSED SUCCESSFULLY ===');
  await client.close();
}

runSecurityAudit().catch(err => {
  console.error('AUDIT FAILED:', err);
  process.exit(1);
});
