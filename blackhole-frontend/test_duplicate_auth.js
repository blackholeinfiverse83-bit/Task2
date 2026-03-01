async function runTests() {
    const BASE_URL = 'http://localhost:3001/api/auth';
    const email = `test.duplicate.${Date.now()}@example.com`;
    const password = 'securepassword123';

    console.log('--- STARTING DUPLICATE SIGNUP TEST ---');

    // 1. Initial Signup
    console.log(`\n1. Testing Initial Signup for ${email}...`);
    try {
        const signupRes = await fetch(`${BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: 'Test Duplicate' })
        });
        const signupData = await signupRes.json();
        console.log('Signup 1 Response:', JSON.stringify(signupData, null, 2));
        if (!signupData.success) throw new Error('Initial Signup failed');
        console.log('✅ Initial Signup successful');
    } catch (e) {
        console.error('❌ Initial Signup error:', e.message);
        return;
    }

    // 2. Duplicate Signup
    console.log(`\n2. Testing Duplicate Signup for ${email}...`);
    try {
        const signupRes2 = await fetch(`${BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: 'Test Duplicate 2' })
        });

        // Check status code first
        console.log(`HTTP Status: ${signupRes2.status}`);
        if (signupRes2.status !== 409) {
            console.warn(`⚠️ Expected HTTP 409 Conflict, got ${signupRes2.status}`);
        } else {
            console.log('✅ Correct HTTP 409 status code received');
        }

        const signupData2 = await signupRes2.json();
        console.log('Signup 2 Response:', JSON.stringify(signupData2, null, 2));

        if (signupData2.success) {
            console.error('❌ BUG: Duplicate signup was successful!');
        } else {
            console.log('✅ Correctly prevented duplicate signup');
        }
    } catch (e) {
        console.error('❌ Request error:', e.message);
    }
}

runTests();
