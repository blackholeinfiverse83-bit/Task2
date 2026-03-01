async function runTests() {
    const BASE_URL = 'http://localhost:3001/api/auth';
    const email = `test.user.${Date.now()}@example.com`;
    const password = 'securepassword123';
    let token = null;

    console.log('--- STARTING AUTHENTICATION TESTS ---');

    // 1. Signup
    console.log(`\n1. Testing Signup for ${email}...`);
    try {
        const signupRes = await fetch(`${BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: 'Test User' })
        });
        const signupData = await signupRes.json();
        console.log('Signup Response:', JSON.stringify(signupData, null, 2));
        if (!signupData.success) throw new Error('Signup failed');
        console.log('✅ Signup successful');
    } catch (e) {
        console.error('❌ Signup error:', e.message);
        return;
    }

    // 2. Login
    console.log(`\n2. Testing Login for ${email}...`);
    try {
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        console.log('Login Response:', JSON.stringify(loginData, null, 2));
        if (!loginData.success) throw new Error('Login failed');
        token = loginData.data.token;
        console.log('✅ Login successful, token:', token);
    } catch (e) {
        console.error('❌ Login error:', e.message);
        return;
    }

    // 3. Verify Session (GET /api/auth/login)
    console.log(`\n3. Verifying Session Token...`);
    try {
        const verifyRes = await fetch(`${BASE_URL}/login`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const verifyData = await verifyRes.json();
        console.log('Verify Response:', JSON.stringify(verifyData, null, 2));
        if (!verifyData.valid) throw new Error('Session verification failed');
        console.log('✅ Session verified');
    } catch (e) {
        console.error('❌ Session verify error:', e.message);
        return;
    }

    // 4. Logout
    console.log(`\n4. Testing Logout...`);
    try {
        const logoutRes = await fetch(`${BASE_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const logoutData = await logoutRes.json();
        console.log('Logout Response:', JSON.stringify(logoutData, null, 2));
        if (!logoutData.success) throw new Error('Logout failed');
        console.log('✅ Logout successful');
    } catch (e) {
        console.error('❌ Logout error:', e.message);
        return;
    }

    // 5. Verify Session (GET /api/auth/login) POST-LOGOUT
    console.log(`\n5. Verifying Session is invalid post-logout...`);
    try {
        const verifyRes2 = await fetch(`${BASE_URL}/login`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const verifyData2 = await verifyRes2.json();
        console.log('Verify Response 2:', JSON.stringify(verifyData2, null, 2));
        if (verifyData2.valid) throw new Error('Session is still valid after logout!');
        console.log('✅ Session properly invalidated');
    } catch (e) {
        console.error('❌ Post-logout verify error:', e.message);
        return;
    }

    console.log('\n--- ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY! ---');
}

runTests();
