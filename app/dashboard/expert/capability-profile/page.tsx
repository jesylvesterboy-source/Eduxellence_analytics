"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

const AVAILABILITY = [
  { value: "available", label: "Available now" },
  { value: "limited", label: "Limited availability" },
  { value: "part_time", label: "Available part-time" },
  { value: "fully_booked", label: "Fully booked" },
];
const PROJECT_TYPES = ["short", "long_term", "one_off", "recurring", "milestone_based", "consulting", "training"];
const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

type Category = { id: number; name: string };
type Skill = { id: number; category_id: number; name: string };
type SkillDetail = { skill_id: number; years_experience: string; proficiency_level: string };

export default function CapabilityProfilePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [skillDetails, setSkillDetails] = useState<Record<number, SkillDetail>>({});
  const [skillSearch, setSkillSearch] = useState("");
  const [availability, setAvailability] = useState("available");
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: cats } = await supabase.from("solution_categories").select("id, name").eq("is_active", true).order("display_order");
    setCategories(cats || []);
    const { data: skl } = await supabase.from("solution_skills").select("id, category_id, name").eq("is_active", true).order("name");
    setSkills(skl || []);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: profile } = await supabase.from("expert_capability_profiles").select("*").eq("expert_id", user.id).maybeSingle();
    if (profile) {
      setSelectedCategories(profile.category_ids || []);
      setAvailability(profile.availability || "available");
      setProjectTypes(profile.preferred_project_types || []);
      setNotes(profile.project_experience_notes || "");
    }

    const { data: details } = await supabase.from("expert_skill_details").select("skill_id, years_experience, proficiency_level").eq("expert_capability_profile_id", user.id);
    if (details) {
      const map: Record<number, SkillDetail> = {};
      details.forEach((d) => {
        map[d.skill_id] = { skill_id: d.skill_id, years_experience: String(d.years_experience), proficiency_level: d.proficiency_level };
      });
      setSkillDetails(map);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleCategory(id: number) {
    setSelectedCategories((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes(id)) {
        const categorySkillIds = skills.filter((s) => s.category_id === id).map((s) => s.id);
        setSkillDetails((prevDetails) => {
          const copy = { ...prevDetails };
          categorySkillIds.forEach((sid) => delete copy[sid]);
          return copy;
        });
      }
      return next;
    });
  }

  function toggleSkill(id: number) {
    setSkillDetails((prev) => {
      const copy = { ...prev };
      if (copy[id]) delete copy[id];
      else copy[id] = { skill_id: id, years_experience: "", proficiency_level: "" };
      return copy;
    });
  }

  function updateSkillDetail(id: number, field: "years_experience" | "proficiency_level", value: string) {
    setSkillDetails((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function toggleStr(arr: string[], setArr: (v: string[]) => void, v: string) {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function save() {
    if (!userId) return;
    const details = Object.values(skillDetails);
    for (const d of details) {
      if (!d.years_experience || !d.proficiency_level) {
        alert("Please enter years of experience and proficiency for every selected skill.");
        return;
      }
    }
    setSaving(true);

    const { error: capError } = await supabase.rpc("fn_save_capability_profile", {
      p_expert_id: userId,
      p_category_ids: selectedCategories,
      p_skill_details: details.map((d) => ({ skill_id: d.skill_id, years_experience: parseFloat(d.years_experience), proficiency_level: d.proficiency_level })),
    });
    if (capError) {
      setSaving(false);
      alert("Save failed: " + capError.message);
      return;
    }

    const { error } = await supabase.from("expert_capability_profiles").update({
      availability,
      preferred_project_types: projectTypes,
      project_experience_notes: notes || null,
      updated_at: new Date().toISOString(),
    }).eq("expert_id", userId);

    setSaving(false);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    alert("Capability profile saved.");
  }

  const availableSkills = skills.filter(
    (s) => selectedCategories.includes(s.category_id) && (!skillSearch.trim() || s.name.toLowerCase().includes(skillSearch.toLowerCase()))
  );
  const selectedSkillObjs = skills.filter((s) => skillDetails[s.id]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/expert" backLabel="Back to Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>Capability Profile</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>This helps Eduxellence match you to the right projects automatically.</p>

        <Section title="1. Which solution areas can you deliver?">
          <CheckGrid>
            {categories.map((c) => (
              <Check key={c.id} checked={selectedCategories.includes(c.id)} onChange={() => toggleCategory(c.id)} label={c.name} />
            ))}
          </CheckGrid>
        </Section>

        <Section title="2. What specific skills can you deliver?">
          {selectedCategories.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Select a solution area above first.</p>
          ) : (
            <>
              <input placeholder="Search skills..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} style={{ ...inputStyle, marginBottom: "0.75rem" }} />
              <CheckGrid>
                {availableSkills.map((s) => (
                  <Check key={s.id} checked={!!skillDetails[s.id]} onChange={() => toggleSkill(s.id)} label={s.name} />
                ))}
              </CheckGrid>
            </>
          )}
        </Section>

        {selectedSkillObjs.length > 0 && (
          <Section title="3. Experience for each skill">
            {selectedSkillObjs.map((s) => (
              <div key={s.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.82rem", flex: 1 }}>{s.name}</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Years"
                  value={skillDetails[s.id]?.years_experience || ""}
                  onChange={(e) => updateSkillDetail(s.id, "years_experience", e.target.value)}
                  style={{ width: "80px", padding: "0.4rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem" }}
                />
                <select
                  value={skillDetails[s.id]?.proficiency_level || ""}
                  onChange={(e) => updateSkillDetail(s.id, "proficiency_level", e.target.value)}
                  style={{ padding: "0.4rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem" }}
                >
                  <option value="">Level...</option>
                  {PROFICIENCY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button onClick={() => toggleSkill(s.id)} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: "0.9rem" }}>×</button>
              </div>
            ))}
          </Section>
        )}

        <Section title="4. Current availability">
          <select value={availability} onChange={(e) => setAvailability(e.target.value)} style={inputStyle}>
            {AVAILABILITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </Section>

        <Section title="5. Preferred project types">
          <CheckGrid>
            {PROJECT_TYPES.map((t) => (
              <Check key={t} checked={projectTypes.includes(t)} onChange={() => toggleStr(projectTypes, setProjectTypes, t)} label={t.replace("_", " ")} />
            ))}
          </CheckGrid>
        </Section>

        <Section title="6. Notable projects you've delivered (optional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Briefly describe relevant past work..." />
        </Section>

        <button onClick={save} disabled={saving} style={{ width: "100%", background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.85rem", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
          {saving ? "Saving..." : "Save Capability Profile"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1rem" }}>
      <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem" }}>{title}</div>
      {children}
    </div>
  );
}
function CheckGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.5rem" }}>{children}</div>;
}
function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", textTransform: "capitalize" }}>
      <input type="checkbox" checked={checked} onChange={onChange} /> {label}
    </label>
  );
}
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" };