"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Category = { id: number; name: string };
type Skill = { id: number; category_id: number; name: string };
type SkillDetail = { skill_id: number; years_experience: string; proficiency_level: string };

const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

export default function ExpertApplyPage() {
  const supabase = createClient();
  const router = useRouter();

  const [status, setStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [taxonomyLoadFailed, setTaxonomyLoadFailed] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [skillDetails, setSkillDetails] = useState<Record<number, SkillDetail>>({});
  const [skillSearch, setSkillSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("application_status, rejection_reason, role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "expert") {
      router.push("/dashboard");
      return;
    }
    setStatus(profile.application_status);
    setRejectionReason(profile.rejection_reason);

    const { data: cats, error: catErr } = await supabase.from("solution_categories").select("id, name").eq("is_active", true).order("display_order");
    const { data: skl, error: sklErr } = await supabase.from("solution_skills").select("id, category_id, name").eq("is_active", true).order("name");
    if (catErr || sklErr || !cats || cats.length === 0) {
      setTaxonomyLoadFailed(true);
    } else {
      setCategories(cats);
      setSkills(skl || []);
    }

    const { data: existing } = await supabase.from("expert_capability_profiles").select("category_ids").eq("expert_id", user.id).maybeSingle();
    if (existing) {
      setSelectedCategories(existing.category_ids || []);
    }
    const { data: existingDetails } = await supabase.from("expert_skill_details").select("skill_id, years_experience, proficiency_level").eq("expert_capability_profile_id", user.id);
    if (existingDetails) {
      const map: Record<number, SkillDetail> = {};
      existingDetails.forEach((d) => {
        map[d.skill_id] = { skill_id: d.skill_id, years_experience: String(d.years_experience), proficiency_level: d.proficiency_level };
      });
      setSkillDetails(map);
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

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
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = { skill_id: id, years_experience: "", proficiency_level: "" };
      }
      return copy;
    });
  }

  function updateSkillDetail(id: number, field: "years_experience" | "proficiency_level", value: string) {
    setSkillDetails((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSubmit() {
    if (!cvFile || !idFile || !photoFile) {
      alert("Please upload all three required documents.");
      return;
    }
    if (taxonomyLoadFailed) {
      alert("We couldn't load the service categories right now. Please refresh the page and try again — this isn't something on your end.");
      return;
    }
    if (selectedCategories.length === 0) {
      alert("Please select at least one service category.");
      return;
    }
    const details = Object.values(skillDetails);
    if (details.length === 0) {
      alert("Please select at least one skill.");
      return;
    }
    for (const d of details) {
      if (!d.years_experience || !d.proficiency_level) {
        alert("Please enter years of experience and proficiency for every selected skill.");
        return;
      }
    }

    setSubmitting(true);
    if (!userId) return;

    async function uploadDoc(file: File, label: string) {
      const path = `${userId}/${label}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("expert-applications").upload(path, file);
      if (error) throw new Error(`${label} upload failed: ${error.message}`);
      return path;
    }

    try {
      const [cvPath, idPath, photoPath] = await Promise.all([
        uploadDoc(cvFile!, "cv"),
        uploadDoc(idFile!, "id"),
        uploadDoc(photoFile!, "photo"),
      ]);

      const { error: capError } = await supabase.rpc("fn_save_capability_profile", {
        p_expert_id: userId,
        p_category_ids: selectedCategories,
        p_skill_details: details.map((d) => ({ skill_id: d.skill_id, years_experience: parseFloat(d.years_experience), proficiency_level: d.proficiency_level })),
      });
      if (capError) throw capError;

      const { error } = await supabase.rpc("fn_submit_expert_application", {
        p_cv_url: cvPath,
        p_government_id_url: idPath,
        p_profile_photo_url: photoPath,
      });
      if (error) throw error;

      setStatus("submitted");
    } catch (err: any) {
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const visibleSkills = skills.filter(
    (s) => selectedCategories.includes(s.category_id) && (!skillSearch.trim() || s.name.toLowerCase().includes(skillSearch.toLowerCase()))
  );
  const selectedSkillObjs = skills.filter((s) => skillDetails[s.id]);

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>;

  const showForm = status === "draft" || status === "additional_info_requested";

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <BackHomeBar backHref="/" backLabel="Back to Home" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
          Complete Your Expert Application
        </h1>

        {showForm && (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Tell us what you can deliver, then upload the required documents.
            </p>

            {status === "additional_info_requested" && rejectionReason && (
              <div style={{ background: "var(--white)", border: "1px solid #c0392b", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
                <strong style={{ color: "#c0392b" }}>Additional information needed</strong>
                <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>{rejectionReason}</p>
              </div>
            )}

            {taxonomyLoadFailed && (
              <div style={{ background: "#fdecea", border: "1px solid #c0392b", borderRadius: "8px", padding: "0.9rem", marginBottom: "1.25rem", fontSize: "0.82rem", color: "#c0392b" }}>
                We couldn't load service categories. Please refresh this page before continuing.
              </div>
            )}

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Which services can you provide?</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem" }}>
                {categories.map((c) => (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}>
                    <input type="checkbox" checked={selectedCategories.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            {selectedCategories.length > 0 && (
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Select your skills</div>
                <input placeholder="Search skills..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} style={{ width: "100%", padding: "0.55rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.75rem" }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.5rem", maxHeight: "200px", overflowY: "auto" }}>
                  {visibleSkills.map((s) => (
                    <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                      <input type="checkbox" checked={!!skillDetails[s.id]} onChange={() => toggleSkill(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {selectedSkillObjs.length > 0 && (
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Experience for each skill</div>
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
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>CV / Resume (PDF)</label>
                <input type="file" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>Government-issued ID</label>
                <input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>Professional Profile Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              </div>
              <button onClick={handleSubmit} disabled={submitting} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.75rem", borderRadius: "6px", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}>
                {submitting ? "Submitting..." : status === "additional_info_requested" ? "Resubmit" : "Submit Application"}
              </button>
            </div>
          </>
        )}

        {(status === "submitted" || status === "under_review") && (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.5rem", textAlign: "center" }}>
            <strong>Application submitted.</strong>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Our team is reviewing your application.</p>
          </div>
        )}

        {status === "rejected" && (
          <div style={{ background: "var(--white)", border: "1px solid #c0392b", borderRadius: "10px", padding: "1.5rem", textAlign: "center" }}>
            <strong style={{ color: "#c0392b" }}>Application not approved</strong>
            {rejectionReason && <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>{rejectionReason}</p>}
          </div>
        )}
      </div>
    </div>
  );
}