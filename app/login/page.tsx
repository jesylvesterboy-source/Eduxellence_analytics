"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          Eduxellence <span>Solutions</span>
        </div>
        <h1>Welcome back</h1>
        <p className="auth-sub">Log in to your dashboard.</p>

        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="auth-footer-link">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cream);
          padding: 2rem 1rem;
        }
        .auth-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 2.5rem;
          max-width: 420px;
          width: 100%;
          box-shadow: var(--shadow);
        }
        .auth-logo {
          font-family: "Playfair Display", serif;
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
        }
        .auth-logo span {
          color: var(--gold);
        }
        .auth-card h1 {
          font-family: "Playfair Display", serif;
          font-size: 1.6rem;
          margin-bottom: 0.5rem;
        }
        .auth-sub {
          color: var(--muted);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .auth-form input {
          padding: 0.75rem 1rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 0.9rem;
          font-family: "DM Sans", sans-serif;
        }
        .auth-submit {
          background: var(--gold);
          color: var(--ink);
          border: none;
          padding: 0.8rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-error {
          color: #c0392b;
          font-size: 0.85rem;
        }
        .auth-footer-link {
          text-align: center;
          font-size: 0.85rem;
          margin-top: 1.5rem;
          color: var(--muted);
        }
        .auth-footer-link a {
          color: var(--gold);
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
