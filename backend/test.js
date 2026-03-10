const Database = require('./models/database');

// Test database
const testDb = new Database(':memory:');

async function runTests() {
  console.log('🧪 Running tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Create user
  try {
    const result = await testDb.run(
      'INSERT INTO users (phone, password, name, role) VALUES (?, ?, ?, ?)',
      ['+79001234567', 'hashed_password', 'Test User', 'worker']
    );
    if (result.lastID > 0) {
      console.log('✅ Test 1: Create user - PASSED');
      passed++;
    } else {
      throw new Error('No ID returned');
    }
  } catch (e) {
    console.log('❌ Test 1: Create user - FAILED:', e.message);
    failed++;
  }
  
  // Test 2: Get user
  try {
    const user = await testDb.get('SELECT * FROM users WHERE phone = ?', ['+79001234567']);
    if (user && user.name === 'Test User') {
      console.log('✅ Test 2: Get user - PASSED');
      passed++;
    } else {
      throw new Error('User not found');
    }
  } catch (e) {
    console.log('❌ Test 2: Get user - FAILED:', e.message);
    failed++;
  }
  
  // Test 3: Create job
  try {
    const result = await testDb.run(
      'INSERT INTO jobs (title, description, payment, employer_id, city) VALUES (?, ?, ?, ?, ?)',
      ['Test Job', 'Description', 1000, 1, 'Москва']
    );
    if (result.lastID > 0) {
      console.log('✅ Test 3: Create job - PASSED');
      passed++;
    } else {
      throw new Error('No ID returned');
    }
  } catch (e) {
    console.log('❌ Test 3: Create job - FAILED:', e.message);
    failed++;
  }
  
  // Test 4: Get jobs
  try {
    const jobs = await testDb.all("SELECT * FROM jobs WHERE status = 'open'");
    if (jobs.length > 0) {
      console.log('✅ Test 4: Get jobs - PASSED');
      passed++;
    } else {
      throw new Error('No jobs found');
    }
  } catch (e) {
    console.log('❌ Test 4: Get jobs - FAILED:', e.message);
    failed++;
  }
  
  // Test 5: Response
  try {
    const result = await testDb.run(
      'INSERT INTO responses (job_id, worker_id) VALUES (?, ?)',
      [1, 1]
    );
    if (result.lastID > 0) {
      console.log('✅ Test 5: Create response - PASSED');
      passed++;
    } else {
      throw new Error('No ID returned');
    }
  } catch (e) {
    console.log('❌ Test 5: Create response - FAILED:', e.message);
    failed++;
  }
  
  // Test 6: Rating
  try {
    const result = await testDb.run(
      'INSERT INTO ratings (from_user, to_user, job_id, rating) VALUES (?, ?, ?, ?)',
      [1, 1, 1, 5]
    );
    if (result.lastID > 0) {
      console.log('✅ Test 6: Create rating - PASSED');
      passed++;
    } else {
      throw new Error('No ID returned');
    }
  } catch (e) {
    console.log('❌ Test 6: Create rating - FAILED:', e.message);
    failed++;
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  testDb.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
