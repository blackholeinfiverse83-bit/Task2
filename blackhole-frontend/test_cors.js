async function testCors() {
  const res = await fetch("https://ai-being-ecwj.onrender.com/api/auth/me", {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization"
    }
  });
  console.log("CORS Headers:");
  console.log("Allow-Origin:", res.headers.get("access-control-allow-origin"));
  console.log("Allow-Headers:", res.headers.get("access-control-allow-headers"));
}
testCors();
