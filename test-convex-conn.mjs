// Database connectivity verification script for Convex Cloud
// Run with: node test-convex-conn.mjs

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://formal-hummingbird-972.convex.cloud';

async function checkDatabase() {
  console.log('==================================================');
  console.log('1. Checking Convex Cloud Database Connection...');
  console.log('Target URL:', CONVEX_URL);
  console.log('==================================================');

  try {
    const res = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'users:listUsers', args: {} }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('✔ Convex Cloud Status:', data.status);
    console.log('✔ Total Users in Database:', Array.isArray(data.value) ? data.value.length : 0);

    if (Array.isArray(data.value) && data.value.length > 0) {
      console.log('\nExisting Accounts:');
      data.value.forEach((u) => {
        console.log(`- [${u.role.toUpperCase()}] ID: ${u.studentId || 'N/A'} | Subject: ${u.subject || u.batch || 'N/A'} | Email: ${u.email}`);
      });
    } else {
      console.log('Notice: Database currently has 0 records. Seeding default demo accounts...');
      
      const seedRes = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'users:upsertUser',
          args: {
            userId: 'usr_std_001',
            name: 'Alex Morgan',
            email: 'alex.morgan@testportal.com',
            studentId: 'STD-001',
            subject: 'Computer Science',
            batch: 'Computer Science',
            role: 'student',
            passwordHash: '$2b$10$sqEIFWLJAffDZi9NCY7lg./r2bikFGvzp9pt4kTQSphpVZW5JEAMS',
            plainPassword: 'Student@Alex2025',
            status: 'active',
            createdAt: new Date().toISOString(),
          },
        }),
      });

      const seedData = await seedRes.json();
      console.log('✔ Seed STD-001 result:', seedData.status);
    }

    console.log('\n==================================================');
    console.log('DATABASE CONNECTION IS FULLY OPERATIONAL (200 OK)');
    console.log('==================================================');
  } catch (err) {
    console.error('✘ Connection error:', err.message);
  }
}

checkDatabase();
