"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

const EXPERIENCE_LEVELS = [
  { value: "less_than_1", label: "Less than 1 year" },
  { value: "1_2", label: "1–2 years" },
  { value: "3_5", label: "3–5 years" },
  { value: "6_10", label: "6–10 years" },
  { value: "10_plus", label: "10+ years" },
];

const AVAILABILITY = [
  { value: "available", label: "Available now" },
  { value: "limited", label: "Limited availability" },
  { value: "part_time", label: "Available part-time" },
  { value: "fully_booked", label: "Fully booked" },
];

const PROJECT_TYPES = ["short", "long_term", "one_off", "recurring", "milestone_based", "consulting", "training"];

type Category = { id: number; name: string };
type Skill = { id: number; category_id: number; name: string };

export default function CapabilityProfilePage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [strongestSkills, setStrongestSkills] = useState<number[]>([]);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [availability, setAvailability] = useState("available");
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: cats } = await supabase.from("solution_categories").select("id, name").order("display_order");
    setCategories(cats || []);
    const { data: skl } = await supabase.from("solution_skills").select("id, category_id, name");
    setSkills(skl || []);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("expert_capability_profiles").select("*").eq("expert_id", user.id).maybeSingle();
    if (profile) {
      setSelectedCategories(profile.category_ids || []);
      setSelectedSkills(profile.skill_ids || []);
      setStrongestSkills(profile.strongest_skill_ids || []);
      setExperienceLevel(profile.experience_level || "");
      setAvailability(profile.availability || "available");
      setProjectTypes(profile.preferred_project_types || []);
      setNotes(profile.project_experience_notes || "");
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(arr: number[], setArr: (v: number[]) => void, id: number) {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }
  function toggleStr(arr: string[], setArr: (v: string[]) => void, v: string) {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function save() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("expert_capability_profiles").upsert({
      expert_id: user.id,
      category_ids: selectedCategories,
      skill_ids: selectedSkills,
      strongest_skill_ids: strongestSkills,
      experience_level: experienceLevel || null,
      availability,
      preferred_project_types: projectTypes,
      project_experience_notes: notes || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    alert("Capability profile saved.");
  }

  const availableSkills = skills.filter((s) => selectedCategories.includes(s.category_id));

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/expert" backLabel="Back to Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
          Capability Profile
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          This helps Eduxellence match you to the right projects automatically.
        </p>

        <Section title="1. Which solution areas can you deliver?">
          <CheckGrid>
            {categories.map((c) => (
              <Check key={c.id} checked={selectedCategories.includes(c.id)} onChange={() => toggle(selectedCategories, setSelectedCategories, c.id)} label={c.name} />
            ))}
          </CheckGrid>
        </Section>

        <Section title="2. What specific skills can you deliver?">
          {availableSkills.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Select a solution area above first.</p>
          ) : (
            <CheckGrid>
              {availableSkills.map((s) => (
                <Check key={s.id} checked={selectedSkills.includes(s.id)} onChange={() => toggle(selectedSkills, setSelectedSkills, s.id)} label={s.name} />
              ))}
            </CheckGrid>
          )}
        </Section>

        <Section title="3. What are your strongest 3–5 skills?">
          <CheckGrid>
            {skills.filter((s) => selectedSkills.includes(s.id)).map((s) => (
              <Check key={s.id} checked={strongestSkills.includes(s.id)} onChange={() => toggle(strongestSkills, setStrongestSkills, s.id)} label={s.name} />
            ))}
          </CheckGrid>
        </Section>

        <Section title="4. Years of experience">
          <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} style={inputStyle}>
            <option value="">Select...</option>
            {EXPERIENCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </Section>

        <Section title="5. Current availability">
          <select value={availability} onChange={(e) => setAvailability(e.target.value)} style={inputStyle}>
            {AVAILABILITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </Section>

        <Section title="6. Preferred project types">
          <CheckGrid>
            {PROJECT_TYPES.map((t) => (
              <Check key={t} checked={projectTypes.includes(t)} onChange={() => toggleStr(projectTypes, setProjectTypes, t)} label={t.replace("_", " ")} />
            ))}
          </CheckGrid>
        </Section>

        <Section title="7. Notable projects you've delivered (optional)">
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