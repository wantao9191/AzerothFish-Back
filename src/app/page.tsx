export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>AzerothFish Backend API</h1>
      <p>Status: Running</p>
      <ul>
        <li>POST /api/auth/login - WeChat Login</li>
        <li>POST /api/upload - File Upload</li>
      </ul>
    </main>
  );
}
