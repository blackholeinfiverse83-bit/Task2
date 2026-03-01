async function test() {
    const req = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'testuser@blackhole.com', password: 'password123' })
    });
    console.log('Status:', req.status);
    const json = await req.json();
    console.log('Response:', json);
}
test();
