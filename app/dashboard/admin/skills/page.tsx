"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Category = { id: number; name: string };
type Skill = { id: number; category_id: number; name: string };

export default function AdminSkillsPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [newSkill, setNewSkill] = useState("");

  const load = useCallback(async () => {
    const { data: cats } = await supabase.from("solution_categories").select("id, name").order("display_order");
    setCategories(cats || []);
    if (!activeCategory && cats && cats.length > 0) setActiveCategory(cats[0].id);
    const { data: skl } = await supabase.from("solution_skills").select("id, category_id, name").order("name");
    setSkills(skl || []);
  }, [supabase, activeCategory]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addSkill() {
    if (!newSkill.trim() || !activeCategory) return;
    const { error } = await supabase.from("solution_skills").insert({ category_id: activeCategory, name: newSkill.trim() });
    if (error) { alert(error.message); return; }
    setNewSkill("");
    load();
  }

  async function removeSkill(id: number) {
    if (!confirm("Remove this skill? Experts who selected it will keep it on their profile, but it won't be selectable for new profiles.")) return;
    await supabase.from("solution_skills").delete().eq("id", id);
    load();
  }

  const categorySkills = skills.filter((s) => s.category_id === activeCategory);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          Skills &amp; Categories
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                style={{
                  textAlign: "left",
                  padding: "0.6rem",
                  borderRadius: "6px",
                  border: activeCategory === c.id ? "1px solid var(--gold)" : "1px solid var(--border)",
                  background: activeCategory === c.id ? "var(--gold-light)" : "var(--white)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input placeholder="New skill name" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} style={{ flex: 1, padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" }} />
              <button onClick={addSkill} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>Add</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {categorySkills.map((s) => (
                <span key={s.id} style={{ background: "var(--cream-dark)", padding: "0.4rem 0.8rem", borderRadius: "999px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {s.name}
                  <button onClick={() => removeSkill(s.id)} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontWeight: 700, padding: 0 }}>×</button>
                </span>
              ))}
              {categorySkills.length === 0 && <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No skills yet in this category.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}