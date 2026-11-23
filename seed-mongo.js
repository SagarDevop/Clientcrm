import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://dbmangoo71:ybGQKq4YDhuQDuCA@cluster0.z3vvxhb.mongodb.net/CRMJugarr?retryWrites=true&w=majority&tls=true';

async function seed() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db('CRMJugarr');
    const now = new Date().toISOString();
    const tenantId = 'org_default';

    // 1. Tenant
    await db.collection('tenants').updateOne(
      { id: tenantId },
      { $set: { id: tenantId, name: 'Jugarr Agency', plan: 'pro', status: 'active', createdAt: now, updatedAt: now } },
      { upsert: true }
    );

    // 2. User
    const passwordHash = '$2b$10$karWoK7bbPDPsI4o1Oz1w.zLYpkuC7LkWhb51..5cz1qFrN7zEgy.';
    await db.collection('users').updateOne(
      { email: 'warshasingh21@gmail.com' },
      {
        $set: {
          id: 'usr_admin',
          tenantId,
          name: 'Sagar Singh (Admin)',
          email: 'warshasingh21@gmail.com',
          passwordHash,
          role: 'owner',
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // 3. Dinesh Gurjar Client
    const dineshClient = {
      id: 'cli_dinesh_gurjar',
      tenantId,
      name: 'Mr. Dinesh Gurjar',
      businessName: 'Shreedev Paint Service',
      email: 'warshasingh21@gmail.com',
      phone: '9876543210',
      whatsapp: '9876543210',
      normalizedPhone: '9876543210',
      status: 'active',
      clientType: 'content_management',
      category: 'Social Media Management',
      subscriptionTitle: '25 Instagram Reels (Editing & Graphic)',
      emailHeading: 'Welcome Onboard!',
      emailSubject: 'Welcome Onboard — Your Monthly Service Plan',
      monthlyPlanAmount: 3500,
      tokenPaid: 3500,
      additionalPaid: 0,
      totalPaid: 3500,
      remainingAmount: 0,
      paymentStatus: 'paid',
      startDate: '2026-09-20',
      completionDate: '2026-10-20',
      billingAnchorDay: 20,
      packageDescription: '• 25 Instagram Reels (Editing & Graphic Design)\n• Weekly Performance & Growth Review',
      notes: 'Active ongoing monthly retainer',
      onboardingEmailStatus: 'sent',
      completionEmailStatus: 'sent',
      periods: [
        {
          periodNumber: 1,
          startDate: '2026-09-20',
          completionDate: '2026-10-20',
          monthlyPlanAmount: 3500,
          tokenPaid: 3500,
          additionalPaid: 0,
          totalPaid: 3500,
          remainingAmount: 0,
          paymentStatus: 'paid',
        },
        {
          periodNumber: 2,
          startDate: '2026-10-20',
          completionDate: '2026-11-20',
          monthlyPlanAmount: 3500,
          tokenPaid: 3500,
          additionalPaid: 0,
          totalPaid: 3500,
          remainingAmount: 0,
          paymentStatus: 'paid',
        },
      ],
      currentPeriod: {
        periodNumber: 3,
        startDate: '2026-11-20',
        completionDate: '2026-12-20',
        monthlyPlanAmount: 3500,
        tokenPaid: 3500,
        additionalPaid: 0,
        totalPaid: 3500,
        remainingAmount: 0,
        paymentStatus: 'paid',
      },
      createdAt: '2026-09-20T10:00:00.000Z',
      updatedAt: now,
    };

    await db.collection('clients').updateOne({ id: dineshClient.id }, { $set: dineshClient }, { upsert: true });

    // 4. Payments for Sep, Oct, Nov
    const payments = [
      {
        id: 'pay_dinesh_sep',
        tenantId,
        clientId: dineshClient.id,
        amount: 3500,
        type: 'token',
        status: 'completed',
        paymentMethod: 'upi',
        paidAt: '2026-09-20T10:00:00.000Z',
        notes: 'Advance Token for Sep 20 to Oct 20',
        createdAt: '2026-09-20T10:00:00.000Z',
      },
      {
        id: 'pay_dinesh_oct',
        tenantId,
        clientId: dineshClient.id,
        amount: 3500,
        type: 'renewal',
        status: 'completed',
        paymentMethod: 'upi',
        paidAt: '2026-10-20T10:00:00.000Z',
        notes: 'Renewal payment for Oct 20 to Nov 20',
        createdAt: '2026-10-20T10:00:00.000Z',
      },
      {
        id: 'pay_dinesh_nov',
        tenantId,
        clientId: dineshClient.id,
        amount: 3500,
        type: 'renewal',
        status: 'completed',
        paymentMethod: 'upi',
        paidAt: '2026-11-20T10:00:00.000Z',
        notes: 'Renewal payment for Nov 20 to Dec 20',
        createdAt: '2026-11-20T10:00:00.000Z',
      },
    ];

    for (const p of payments) {
      await db.collection('payments').updateOne({ id: p.id }, { $set: p }, { upsert: true });
    }

    // 5. Expense
    const expense = {
      id: 'exp_hosting_nov',
      tenantId,
      description: 'Cloud hosting & domain server',
      vendor: 'Vercel / Cloudflare',
      category: 'hosting',
      amount: 1200,
      date: '2026-11-05',
      createdAt: now,
    };
    await db.collection('expenses').updateOne({ id: expense.id }, { $set: expense }, { upsert: true });

    console.log('✅ Successfully seeded MongoDB CRMJugarr database with all client, payments, and expense data!');
  } finally {
    await client.close();
  }
}

seed().catch(console.error);
