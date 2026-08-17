"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

const CATEGORIES = [
  "Research & Academic Services",
  "Data Analysis & Statistics",
  "Teaching & Tutoring",
  "Content Writing & Creation",
  "Digital Marketing",
  "High-Ticket Sales & Lead Generation",
  "Other",
];

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        client_id: user.id,
        title,
        service_category: category,
        description,
        budget: budget ? parseFloat(budget) : null,
        status: "new",
      })
      .select("id")
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const { data: adminIds, error: rpcError } = await supabase.rpc("get_admin_ids");
    if (rpcError) {
      console.error("Failed to fetch admin IDs:", rpcError);
    } else if (adminIds && adminIds.length > 0) {
      await supabase.from("notifications").insert(
        adminIds.map((id: string) => ({
          user_id: id,
          title: "New Project Request",
          body: `A new project "${title}" was requested and needs review.`,
          link: `/dashboard/admin/${data.id}`,
        }))
      );
    }

    router.push(`/dashboard/client/${data.id}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/client" backLabel="Back to Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
          Request a New Project
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Tell us what you need. Our team will review and start a conversation with you shortly.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem" }}>
          <div>
            <label style={labelStyle}>Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
              placeholder="e.g. Thesis data analysis using SPSS"
            />
          </div>

          <div>
            <label style={labelStyle}>Service Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Describe your project</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="What do you need done? Include any deadlines or requirements."
            />
          </div>

          <div>
            <label style={labelStyle}>Estimated Budget (optional, USD)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={inputStyle}
              placeholder="e.g. 150"
            />
          </div>

          {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "var(--gold)",
              color: "var(--ink)",
              border: "none",
              padding: "0.85rem",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: "0.35rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.9rem",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "0.9rem",
  fontFamily: "'DM Sans', sans-serif",
};