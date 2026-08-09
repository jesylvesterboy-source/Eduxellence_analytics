"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Applicant = {
  id: string;
  full_name: string | null;
  email: string | null;
  bio: string | null;
  expertise: string[] | null;
  application_status: string;
  cv_url: string | null;
  government_id_url: string | null;
  profile_photo_url: string | null;
  submitted_at: string | null;
};

export default function AdminExpertsPage() {
  const supabase = createClient();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [docLinks, setDocLinks] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const loadApplicants = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setAdminId(user?.id ?? null);

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, bio, expertise, application_status, cv_url, government_id_url, profile_photo_url, submitted_at")
      .eq("role", "expert")
      .in("application_status", ["submitted", "under_review", "additional_info_requested"])
      .order("submitted_at", { ascending: true });

    const rows = data || [];
    setApplicants(rows);

    const links: Record<string, string> = {};
    for (const r of rows) {
      for (const [key, url] of [["cv", r.cv_url], ["id", r.government_id_url], ["photo", r.profile_photo_url]] as const) {
        if (url) {
          const { data: signed } = await supabase.storage.from("expert-applications").createSignedUrl(url, 60 * 60);
          if (signed?.signedUrl) links[`${r.id}-${key}`] = signed.signedUrl;
        }
      }
    }
    setDocLinks(links);
  }, [supabase]);

  useEffect(() => {
    loadApplicants();
  }, [loadApplicants]);

  async function decide(expertId: string, decision: "approved" | "rejected" | "additional_info_requested") {
    if (!adminId) return;
    let reason: string | null = null;
    if (decision !== "approved") {
      reason = prompt(`Reason for ${decision === "rejected" ? "rejecting" : "requesting more info"}:`) ?? null;
      if (reason === null) return; // cancelled
    } else {
      if (!confirm("Approve this expert? They'll immediately gain access to the Expert Dashboard.")) return;
    }

    setActingId(expertId);
    const { error } = await supabase.rpc("fn_decide_expert_application", {
      p_expert_id: expertId,
      p_decision: decision,
      p_admin_id: adminId,
      p_reason: reason,
    });
    setActingId(null);
    if (error) {
      alert("Failed: " + error.message);
      return;
    }
    loadApplicants();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          Expert Applications ({applicants.length})
        </h1>

        {applicants.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No pending applications.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {applicants.map((a) => (
              <div key={a.id} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <strong>{a.full_name || "Unknown"}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{a.email}</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize", color: "var(--gold-dark)" }}>
                    {a.application_status.replace("_", " ")}
                  </span>
                </div>

                {a.bio && <p style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>{a.bio}</p>}
                {a.expertise && a.expertise.length > 0 && (
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                    Expertise: {a.expertise.join(", ")}
                  </p>
                )}

                <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", marginBottom: "1rem" }}>
                  {docLinks[`${a.id}-cv`] && <a href={docLinks[`${a.id}-cv`]} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-dark)", fontWeight: 600 }}>View CV</a>}
                  {docLinks[`${a.id}-id`] && <a href={docLinks[`${a.id}-id`]} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-dark)", fontWeight: 600 }}>View ID</a>}
                  {docLinks[`${a.id}-photo`] && <a href={docLinks[`${a.id}-photo`]} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-dark)", fontWeight: 600 }}>View Photo</a>}
                </div>

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button onClick={() => decide(a.id, "approved")} disabled={actingId === a.id} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
                    Approve
                  </button>
                  <button onClick={() => decide(a.id, "additional_info_requested")} disabled={actingId === a.id} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
                    Request More Info
                  </button>
                  <button onClick={() => decide(a.id, "rejected")} disabled={actingId === a.id} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}