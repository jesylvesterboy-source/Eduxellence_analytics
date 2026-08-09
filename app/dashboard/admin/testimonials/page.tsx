"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

const SERVICE_CATEGORIES = [
  "Research & Academic Services",
  "Data, AI & Analytics",
  "Software & Digital Solutions",
  "Mobile App Development",
  "Website Services",
  "Business & Consulting",
  "Agriculture & Food Systems",
  "GIS & Engineering",
  "Health & Medical Research",
  "Creative & Digital Media",
  "Professional Support Services",
];

type Testimonial = {
  id: string;
  client_name: string;
  project_title: string | null;
  quote: string;
  rating: number | null;
  service_category: string | null;
  show_on_homepage: boolean;
  show_on_solutions: boolean;
  approved: boolean;
};

type PromotableReview = {
  id: string;
  rating: number;
  comment: string | null;
  project_id: string;
  project_title: string | null;
  client_name: string | null;
};

const emptyForm = {
  client_name: "",
  project_title: "",
  quote: "",
  rating: "5",
  service_category: "",
  show_on_homepage: false,
  show_on_solutions: false,
  approved: true,
};

export default function AdminTestimonialsPage() {
  const supabase = createClient();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [promotable, setPromotable] = useState<PromotableReview[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    const { data: tData } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
    setTestimonials(tData || []);

    const { data: rData } = await supabase
      .from("reviews")
      .select("id, rating, comment, project_id, projects(title, client_id), profiles:projects(client_id)")
      .not("id", "in", `(select coalesce(source_review_id, '00000000-0000-0000-0000-000000000000') from testimonials where source_review_id is not null)`);

    const already = new Set(testimonials.map((t) => t.id));
    const rows: PromotableReview[] = (rData || [])
      .filter((r: any) => r.comment)
      .map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        project_id: r.project_id,
        project_title: r.projects?.title ?? null,
        client_name: null,
      }));
    setPromotable(rows);
  }, [supabase, testimonials]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(t: Testimonial) {
    setEditingId(t.id);
    setForm({
      client_name: t.client_name,
      project_title: t.project_title || "",
      quote: t.quote,
      rating: String(t.rating ?? 5),
      service_category: t.service_category || "",
      show_on_homepage: t.show_on_homepage,
      show_on_solutions: t.show_on_solutions,
      approved: t.approved,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    if (!form.client_name.trim() || !form.quote.trim()) {
      alert("Client name and quote are required.");
      return;
    }
    setSaving(true);

    const payload = {
      client_name: form.client_name,
      project_title: form.project_title || null,
      quote: form.quote,
      rating: form.rating ? parseInt(form.rating) : null,
      service_category: form.service_category || null,
      show_on_homepage: form.show_on_homepage,
      show_on_solutions: form.show_on_solutions,
      approved: form.approved,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from("testimonials").update(payload).eq("id", editingId)
      : await supabase.from("testimonials").insert(payload);

    setSaving(false);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    resetForm();
    loadAll();
  }

  async function remove(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    await supabase.from("testimonials").delete().eq("id", id);
    loadAll();
  }

  async function promoteReview(r: PromotableReview) {
    const { data: proj } = await supabase.from("projects").select("client_id, title").eq("id", r.project_id).single();
    const { data: clientProfile } = proj?.client_id
      ? await supabase.from("profiles").select("full_name").eq("id", proj.client_id).single()
      : { data: null };

    const { error } = await supabase.from("testimonials").insert({
      client_name: clientProfile?.full_name || "Anonymous Client",
      project_title: proj?.title || r.project_title,
      quote: r.comment,
      rating: r.rating,
      source_review_id: r.id,
      approved: false, // Admin still reviews before it goes live
    });

    if (error) {
      alert("Could not promote review: " + error.message);
      return;
    }
    loadAll();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          Testimonials Management
        </h1>

        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "1rem" }}>{editingId ? "Edit Testimonial" : "Add Testimonial"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <input placeholder="Client name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} style={inputStyle} />
            <input placeholder="Project title (optional)" value={form.project_title} onChange={(e) => setForm({ ...form, project_title: e.target.value })} style={inputStyle} />
          </div>
          <textarea placeholder="Testimonial quote" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} rows={3} style={{ ...inputStyle, width: "100%", marginBottom: "0.75rem", resize: "vertical" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} style={inputStyle}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
            </select>
            <select value={form.service_category} onChange={(e) => setForm({ ...form, service_category: e.target.value })} style={inputStyle}>
              <option value="">No category</option>
              {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input type="checkbox" checked={form.show_on_homepage} onChange={(e) => setForm({ ...form, show_on_homepage: e.target.checked })} /> Show on Homepage
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input type="checkbox" checked={form.show_on_solutions} onChange={(e) => setForm({ ...form, show_on_solutions: e.target.checked })} /> Show on Solutions Page
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input type="checkbox" checked={form.approved} onChange={(e) => setForm({ ...form, approved: e.target.checked })} /> Approved (live)
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={save} disabled={saving} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Saving..." : editingId ? "Update" : "Add Testimonial"}
            </button>
            {editingId && (
              <button onClick={resetForm} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.6rem 1.25rem", borderRadius: "6px", cursor: "pointer" }}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {promotable.length > 0 && (
          <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Client Reviews Available to Promote</div>
            {promotable.map((r) => (
              <div key={r.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
                <div style={{ color: "var(--gold)", marginBottom: "0.25rem" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                <p style={{ marginBottom: "0.4rem" }}>&ldquo;{r.comment}&rdquo;</p>
                <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>{r.project_title}</p>
                <button onClick={() => promoteReview(r)} style={{ background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.35rem 0.9rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                  Promote to Testimonial
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>All Testimonials ({testimonials.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {testimonials.map((t) => (
            <div key={t.id} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <strong>{t.client_name}</strong>
                <span style={{ fontSize: "0.75rem", color: t.approved ? "#1e8449" : "var(--gold-dark)" }}>{t.approved ? "Live" : "Draft"}</span>
              </div>
              <p style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}>&ldquo;{t.quote}&rdquo;</p>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
                {t.project_title} {t.service_category && `· ${t.service_category}`} {t.show_on_homepage && "· Homepage"} {t.show_on_solutions && "· Solutions"}
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => startEdit(t)} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.35rem 0.9rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Edit</button>
                <button onClick={() => remove(t.id)} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "0.35rem 0.9rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" };