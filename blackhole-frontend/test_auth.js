async function test() {
  try {
    const email = `test${Date.now()}@example.com`;
    const signupRes = await fetch("https://ai-being-ecwj.onrender.com/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123", name: "Test User" })
    });
    
    if (!signupRes.ok) throw new Error("Signup failed");
    const signupData = await signupRes.json();
    console.log("Signup Token:", signupData.token?.substring(0, 10) + "...");

    const meRes = await fetch("https://ai-being-ecwj.onrender.com/api/auth/me", {
      method: "GET",
      headers: { "Authorization": `Bearer ${signupData.token}` }
    });
    
    console.log("Me Status:", meRes.status);
    const text = await meRes.text();
    console.log("Me Response body:", text);
  } catch(e) {
    console.error("Test failed:", e.message);
  }
}
test();
