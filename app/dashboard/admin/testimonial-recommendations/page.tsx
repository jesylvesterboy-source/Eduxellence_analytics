"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

const SERVICE_CATEGORIES = [
  "Research & Academic Services", "Data, AI & Analytics", "Software & Digital Solutions",
  "Mobile App Development", "Website Services", "Business & Consulting",
  "Agriculture & Food Systems", "GIS & Engineering", "Health & Medical Research",
  "Creative & Digital Media", "Professional Support Services",
];

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  testimonial_display_text: string | null;
  testimonial_status: string;
  testimonial_category: string | null;
  published_homepage: boolean;
  published_solutions: boolean;
  client_consent: boolean | null;
  project_title: string | null;
  client_name: string | null;
};

const TABS = ["recommended", "published", "rejected", "archived"] as const;

export default function TestimonialRecommendationsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("recommended");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editHomepage, setEditHomepage] = useState(false);
  const [editSolutions, setEditSolutions] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment, testimonial_display_text, testimonial_status, testimonial_category, published_homepage, published_solutions, client_consent, projects(title), profiles(full_name)")
      .eq("testimonial_status", tab)
      .order("created_at", { ascending: false });

    setRows(
      (data || []).map((r: any) => ({
        ...r,
        project_title: r.projects?.title ?? null,
        client_name: r.profiles?.full_name ?? null,
      }))
    );
  }, [supabase, tab]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(r: ReviewRow) {
    setEditingId(r.id);
    setEditText(r.testimonial_display_text || r.comment || "");
    setEditCategory(r.testimonial_category || "");
    setEditHomepage(r.published_homepage);
    setEditSolutions(r.published_solutions);
  }

  async function publish(r: ReviewRow) {
    const displayText = editingId === r.id ? editText : r.comment;
    const category = editingId === r.id ? editCategory : r.testimonial_category;
    const homepage = editingId === r.id ? editHomepage : true;
    const solutions = editingId === r.id ? editSolutions : !!category;

    const { error } = await supabase
      .from("reviews")
      .update({
        testimonial_status: "published",
        testimonial_display_text: displayText !== r.comment ? displayText : null,
        testimonial_category: category || null,
        published_homepage: homepage,
        published_solutions: solutions,
      })
      .eq("id", r.id);

    if (error) {
      alert("Failed: " + error.message);
      return;
    }
    setEditingId(null);
    load();
  }

  async function reject(id: string) {
    await supabase.from("reviews").update({ testimonial_status: "rejected" }).eq("id", id);
    load();
  }

  async function archive(id: string) {
    await supabase.from("reviews").update({ testimonial_status: "archived", published_homepage: false, published_solutions: false }).eq("id", id);
    load();
  }

  async function askPermission(r: ReviewRow) {
    const { data: clientRow } = await supabase.from("reviews").select("client_id").eq("id", r.id).single();
    if (!clientRow?.client_id) return;
    await supabase.from("notifications").insert({
      user_id: clientRow.client_id,
      title: "Permission Requested",
      body: "Eduxellence would like to feature your review as a public testimonial. Please revisit your project to update your preference.",
      link: "/dashboard/client",
    });
    await supabase.from("reviews").update({ consent_requested_at: new Date().toISOString() }).eq("id", r.id);
    alert("Permission request sent to client.");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1rem" }}>
          Testimonial Recommendations
        </h1>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                textTransform: "capitalize",
                background: tab === t ? "var(--gold)" : "var(--white)",
                border: "1px solid var(--border)",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No reviews in this category.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {rows.map((r) => (
              <div key={r.id} style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <strong>{r.client_name || "Unknown Client"}</strong>
                  <span style={{ color: "var(--gold)" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.5rem" }}>{r.project_title}</p>
                <p style={{ fontSize: "0.85rem", marginBottom: "0.6rem" }}>&ldquo;{r.testimonial_display_text || r.comment}&rdquo;</p>
                {r.client_consent === false && (
                  <p style={{ fontSize: "0.75rem", color: "#c0392b", marginBottom: "0.5rem" }}>⚠ Client did not consent to public use.</p>
                )}

                {tab === "recommended" && (
                  <>
                    {editingId === r.id ? (
                      <div style={{ marginTop: "0.5rem" }}>
                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.5rem" }} />
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.5rem", width: "100%" }}>
                          <option value="">No category</option>
                          {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem", fontSize: "0.8rem" }}>
                          <label><input type="checkbox" checked={editHomepage} onChange={(e) => setEditHomepage(e.target.checked)} /> Homepage</label>
                          <label><input type="checkbox" checked={editSolutions} onChange={(e) => setEditSolutions(e.target.checked)} /> Solutions Page</label>
                        </div>
                      </div>
                    ) : null}
                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                      {editingId !== r.id && (
                        <button onClick={() => startEdit(r)} style={btnStyle("var(--cream-dark)", "var(--ink)")}>Edit/Shorten</button>
                      )}
                      <button
                        onClick={() => publish(r)}
                        disabled={r.client_consent === false}
                        style={btnStyle(r.client_consent === false ? "var(--border)" : "var(--gold)", "var(--ink)")}
                      >
                        Publish
                      </button>
                      {r.client_consent !== true && (
                        <button onClick={() => askPermission(r)} style={btnStyle("var(--cream-dark)", "var(--ink)")}>Ask for Permission</button>
                      )}
                      <button onClick={() => reject(r.id)} style={btnStyle("transparent", "#c0392b", true)}>Reject</button>
                    </div>
                  </>
                )}

                {tab === "published" && (
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {r.published_homepage && "Homepage "} {r.published_solutions && `· ${r.testimonial_category || "Solutions"}`}
                    </span>
                    <button onClick={() => archive(r.id)} style={btnStyle("var(--cream-dark)", "var(--ink)")}>Archive</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string, outline = false): React.CSSProperties {
  return { background: bg, color, border: outline ? `1px solid ${color}` : "none", padding: "0.4rem 0.9rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" };
}