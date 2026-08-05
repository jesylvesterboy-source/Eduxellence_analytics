"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
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

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account does not have admin access.");
      return;
    }

    router.push("/dashboard/admin");
    router.refresh();
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          Eduxellence <span>Admin</span>
        </div>
        <h1>Admin Access</h1>
        <p className="admin-login-sub">Restricted area. Authorized personnel only.</p>

        <form onSubmit={handleLogin} className="admin-login-form">
          <input
            type="email"
            placeholder="Admin email"
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

          {error && <p className="admin-login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Log In"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .admin-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0d0d0d;
          padding: 2rem 1rem;
        }
        .admin-login-card {
          background: #171717;
          border: 1px solid rgba(200, 150, 12, 0.25);
          border-radius: 12px;
          padding: 2.5rem;
          max-width: 400px;
          width: 100%;
        }
        .admin-login-logo {
          font-family: "Playfair Display", serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 1.5rem;
        }
        .admin-login-logo span {
          color: #c8960c;
        }
        .admin-login-card h1 {
          font-family: "Playfair Display", serif;
          font-size: 1.5rem;
          color: #fff;
          margin-bottom: 0.4rem;
        }
        .admin-login-sub {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
          margin-bottom: 1.75rem;
        }
        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .admin-login-form input {
          padding: 0.75rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          font-size: 0.9rem;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .admin-login-form input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .admin-login-form button {
          background: #c8960c;
          color: #0d0d0d;
          border: none;
          padding: 0.8rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .admin-login-form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .admin-login-error {
          color: #ff6b6b;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
