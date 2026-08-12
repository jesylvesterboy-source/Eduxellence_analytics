"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Category = { id: number; name: string; description: string | null; is_active: boolean; display_order: number };
type Skill = { id: number; category_id: number; name: string; description: string | null; is_active: boolean };

export default function AdminSkillsPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [expertCounts, setExpertCounts] = useState<Record<number, number>>({});
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Add Category form
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Add Skill form
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillDesc, setSkillDesc] = useState("");

  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: cats } = await supabase.from("solution_categories").select("id, name, description, is_active, display_order").order("display_order");
    setCategories(cats || []);

    const { data: skl } = await supabase.from("solution_skills").select("id, category_id, name, description, is_active").order("name");
    setSkills(skl || []);

    const { data: profiles } = await supabase.from("expert_capability_profiles").select("skill_ids");
    const counts: Record<number, number> = {};
    (profiles || []).forEach((p) => {
      (p.skill_ids || []).forEach((id: number) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    setExpertCounts(counts);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createCategory() {
    if (!catName.trim()) return alert("Category name is required.");
    const { error } = await supabase.rpc("fn_create_category", { p_name: catName.trim(), p_description: catDesc.trim() || null });
    if (error) return alert(error.message);
    setCatName("");
    setCatDesc("");
    setShowAddCategory(false);
    load();
  }

  async function createSkill() {
    if (!skillName.trim() || !activeCategory) return alert("Skill name is required.");
    const { error } = await supabase.rpc("fn_create_skill", { p_category_id: activeCategory, p_name: skillName.trim(), p_description: skillDesc.trim() || null });
    if (error) return alert(error.message);
    setSkillName("");
    setSkillDesc("");
    setShowAddSkill(false);
    load();
  }

  async function toggleCategoryActive(id: number, active: boolean) {
    const { error } = await supabase.rpc("fn_set_category_active", { p_category_id: id, p_active: active });
    if (error) return alert(error.message);
    load();
  }

  async function toggleSkillActive(id: number, active: boolean) {
    const { error } = await supabase.rpc("fn_set_skill_active", { p_skill_id: id, p_active: active });
    if (error) return alert(error.message);
    load();
  }

  async function loadRecommended() {
    if (!confirm("This will add the recommended Eduxellence categories and skills. Existing categories and skills will not be duplicated.")) return;
    setSeeding(true);
    const { error } = await supabase.rpc("fn_load_recommended_skills");
    setSeeding(false);
    if (error) return alert(error.message);
    load();
  }

  const selectedCat = categories.find((c) => c.id === activeCategory);
  const categorySkills = skills
    .filter((s) => s.category_id === activeCategory)
    .filter((s) => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
          Skills &amp; Categories
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem", maxWidth: "640px" }}>
          Manage the service categories and expert skills used throughout Eduxellence. These selections appear during Expert application and capability profiles, and are used to help match Experts with suitable client projects.
        </p>

        {!activeCategory ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <button onClick={() => setShowAddCategory((p) => !p)} style={{ background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
                + Create Category
              </button>
              <button onClick={loadRecommended} disabled={seeding} style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
                {seeding ? "Loading..." : "Load Recommended Eduxellence Skills"}
              </button>
            </div>

            {showAddCategory && (
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
                <input placeholder="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} style={inputStyle} />
                <textarea placeholder="Description" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button onClick={createCategory} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>Create Category</button>
                  <button onClick={() => setShowAddCategory(false)} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.5rem 1.25rem", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {categories.map((c) => {
                const count = skills.filter((s) => s.category_id === c.id).length;
                return (
                  <div key={c.id} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: c.is_active ? 1 : 0.55, flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        {c.name}
                        {!c.is_active && <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem", fontWeight: 700, color: "#c0392b", textTransform: "uppercase" }}>Disabled</span>}
                      </div>
                      {c.description && <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.15rem" }}>{c.description}</div>}
                      <div style={{ fontSize: "0.78rem", color: "var(--gold-dark)", fontWeight: 600, marginTop: "0.3rem" }}>{count} skill{count !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => toggleCategoryActive(c.id, !c.is_active)} style={{ background: "var(--white)", border: "1px solid var(--border)", padding: "0.4rem 0.9rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>
                        {c.is_active ? "Disable" : "Reactivate"}
                      </button>
                      <button onClick={() => setActiveCategory(c.id)} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.4rem 0.9rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}>
                        Manage Skills
                      </button>
                    </div>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                  No categories yet. Create one above, or load the recommended Eduxellence set.
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setActiveCategory(null)} style={{ background: "none", border: "none", color: "var(--gold-dark)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", marginBottom: "1rem", padding: 0 }}>
              ← Back to Categories
            </button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", marginBottom: "0.25rem" }}>{selectedCat?.name}</h2>
            {selectedCat?.description && <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>{selectedCat.description}</p>}

            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
              <input placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: "200px", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" }} />
              <button onClick={() => setShowAddSkill((p) => !p)} style={{ background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                + Add Skill
              </button>
            </div>

            {showAddSkill && (
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.5rem" }}>Category: <strong>{selectedCat?.name}</strong></div>
                <input placeholder="Skill Name" value={skillName} onChange={(e) => setSkillName(e.target.value)} style={inputStyle} />
                <textarea placeholder="Description (optional)" value={skillDesc} onChange={(e) => setSkillDesc(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button onClick={createSkill} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>Save Skill</button>
                  <button onClick={() => setShowAddSkill(false)} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.5rem 1.25rem", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 1fr", gap: "0.5rem", padding: "0.6rem 1rem", background: "var(--cream-dark)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
                <span>Skill</span>
                <span>Active</span>
                <span>Experts</span>
                <span>Projects</span>
                <span>Action</span>
              </div>
              {categorySkills.map((s) => (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 1fr", gap: "0.5rem", padding: "0.7rem 1rem", borderTop: "1px solid var(--border)", fontSize: "0.85rem", alignItems: "center", opacity: s.is_active ? 1 : 0.55 }}>
                  <span>{s.name}</span>
                  <span>{s.is_active ? "✓" : "—"}</span>
                  <span>{expertCounts[s.id] || 0}</span>
                  <span title="Project-skill linking not yet implemented">—</span>
                  <button onClick={() => toggleSkillActive(s.id, !s.is_active)} style={{ background: "var(--white)", border: "1px solid var(--border)", padding: "0.3rem 0.7rem", borderRadius: "5px", fontSize: "0.72rem", cursor: "pointer", justifySelf: "start" }}>
                    {s.is_active ? "Disable" : "Reactivate"}
                  </button>
                </div>
              ))}
              {categorySkills.length === 0 && (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                  {search ? "No skills match your search." : "No skills yet in this category."}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.6rem" };