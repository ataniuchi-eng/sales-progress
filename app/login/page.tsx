"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ログインに失敗しました");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("通信エラーが発生しました");
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 80" width="200" height="76" style={{ marginBottom: 16 }}>
            <defs>
              <linearGradient id="la1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#0284c7", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#0ea5e9", stopOpacity: 1 }} />
              </linearGradient>
              <linearGradient id="la2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: "#0284c7", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#38bdf8", stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <rect x="4" y="10" width="60" height="60" rx="14" fill="url(#la1)" />
            <circle cx="34" cy="42" r="20" fill="none" stroke="white" strokeWidth="3" strokeDasharray="94 32" strokeOpacity={0.9} transform="rotate(-90 34 42)" />
            <line x1="34" y1="42" x2="45" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity={0.95} />
            <circle cx="34" cy="42" r="3" fill="white" opacity={0.9} />
            <text x="78" y="52" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="36" fontWeight="700" fill="#0c4a6e" letterSpacing="-1">A Dash</text>
            <rect x="78" y="58" width="50" height="3" rx="1.5" fill="url(#la2)" />
          </svg>
          <h1 style={styles.title}>営業ダッシュボード</h1>
          {/* 会社名非表示 */}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              required
              style={styles.input}
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    fontFamily: "'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif",
    padding: "20px",
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  logoArea: {
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  logo: {
    width: "64px",
    height: "64px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #1a1a2e, #0077b6)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: 800,
    marginBottom: "16px",
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#1a1a2e",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#999",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#555",
  },
  input: {
    padding: "12px 16px",
    border: "1.5px solid #e0e0e0",
    borderRadius: "10px",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
  },
  button: {
    padding: "14px",
    background: "linear-gradient(135deg, #0c4a6e, #0284c7)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 700,
    fontFamily: "inherit",
    marginTop: "8px",
    transition: "transform 0.1s",
  },
  error: {
    background: "#fff0f0",
    color: "#e63946",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    border: "1px solid #fecdd3",
  },
};
