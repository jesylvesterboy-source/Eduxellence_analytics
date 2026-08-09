"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "expert">("client");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          ...(role === "expert" ? { bio, expertise } : {}),
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          Eduxellence <span>Solutions</span>
        </div>
        <h1>Create your account</h1>
        <p className="auth-sub">Join as a client to request a project, or as an expert to work with us.</p>

        {success ? (
          <p className="auth-success">Account created! Check your email to confirm, then redirecting to login...</p>
        ) : (
          <form onSubmit={handleSignup} className="auth-form">
            <div className="role-toggle">
              <button
                type="button"
                className={role === "client" ? "active" : ""}
                onClick={() => setRole("client")}
              >
                I&apos;m a Client
              </button>
              <button
                type="button"
                className={role === "expert" ? "active" : ""}
                onClick={() => setRole("expert")}
              >
                I&apos;m an Expert
              </button>
            </div>

            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />

            {role === "expert" && (
              <>
                <textarea
                  placeholder="Brief professional bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  required
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    fontFamily: "DM Sans, sans-serif",
                    resize: "vertical",
                  }}
                />
                <input
                  type="text"
                  placeholder="Areas of expertise (comma-separated, e.g. Data Analysis, GIS)"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  required
                />
              </>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <p className="auth-footer-link">
          Already have an account? <Link href="/login">Log in</Link>
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
        .role-toggle {
          display: flex;
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }
        .role-toggle button {
          flex: 1;
          padding: 0.65rem;
          border: none;
          background: var(--cream);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          color: var(--muted);
        }
        .role-toggle button.active {
          background: var(--gold);
          color: var(--ink);
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
        .auth-success {
          color: #1e8449;
          font-size: 0.9rem;
          text-align: center;
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