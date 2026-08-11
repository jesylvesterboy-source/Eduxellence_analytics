"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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

type Doc = {
  id: string;
  doc_type: string;
  label: string | null;
  file_path: string;
  verification_status: string;
  expiry_date: string | null;
  no_expiry: boolean;
  issuing_organization: string | null;
  issue_date: string | null;
  lifecycle_status: string;
};

const statusColor: Record<string, string> = {
  verified: "#1e8449",
  pending_verification: "var(--gold-dark)",
  rejected: "#c0392b",
  expired: "var(--muted)",
};

export default function AdminExpertsPage() {
  const supabase = createClient();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [docLinks, setDocLinks] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);
  const [expertDocs, setExpertDocs] = useState<Record<string, Doc[]>>({});

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

    const { data: docRows } = await supabase
      .from("expert_documents")
      .select("id, expert_id, doc_type, label, file_path, verification_status, expiry_date, no_expiry, issuing_organization, issue_date, lifecycle_status");
    const grouped: Record<string, Doc[]> = {};
    (docRows || []).forEach((d: any) => {
      if (!grouped[d.expert_id]) grouped[d.expert_id] = [];
      grouped[d.expert_id].push(d);
    });
    setExpertDocs(grouped);
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

    const { data: applicantRow } = await supabase.from("profiles").select("email").eq("id", expertId).single();
    if (applicantRow?.email) {
      const subject =
        decision === "approved"
          ? "Application Approved — Welcome to Eduxellence!"
          : decision === "rejected"
          ? "Application Update — Eduxellence"
          : "Additional Information Needed — Eduxellence";
      const body =
        decision === "approved"
          ? "Congratulations! Your expert application has been approved. Log in to access your dashboard."
          : decision === "rejected"
          ? `Your application was not approved at this time.${reason ? " Reason: " + reason : ""}`
          : `Please provide additional information for your application.${reason ? " Details: " + reason : ""}`;
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: applicantRow.email, subject, html: `<p>${body}</p>` }),
      });
    }

    loadApplicants();
  }

  async function viewAndDecideDocument(doc: Doc) {
    const { data } = await supabase.storage.from("expert-applications").createSignedUrl(doc.file_path, 60 * 10);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function decideDocument(docId: string, decision: "verified" | "rejected") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    let reason: string | null = null;
    let overrideExpiry: string | null = null;
    let overrideNoExpiry: boolean | null = null;

    if (decision === "rejected") {
      reason = prompt("Reason:") ?? null;
      if (reason === null) return;
    } else {
      const useOverride = confirm("Override the expiry date shown on the actual document? (Cancel = keep as submitted)");
      if (useOverride) {
        const noExp = confirm("Does this document have no expiry? (Cancel = it does expire)");
        if (noExp) {
          overrideNoExpiry = true;
        } else {
          const dateStr = prompt("Enter the correct expiry date (YYYY-MM-DD):");
          if (dateStr) overrideExpiry = dateStr;
        }
      }
    }

    const { error } = await supabase.rpc("fn_verify_document", {
      p_document_id: docId,
      p_admin_id: user.id,
      p_decision: decision,
      p_reason: reason,
      p_override_expiry_date: overrideExpiry,
      p_override_no_expiry: overrideNoExpiry,
    });
    if (error) {
      alert(error.message);
      return;
    }
    loadApplicants();
  }

  async function decideRemoval(docId: string, approve: boolean) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.rpc("fn_decide_document_removal", {
      p_document_id: docId,
      p_admin_id: user.id,
      p_approve: approve,
    });
    if (error) {
      alert(error.message);
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
                    <Link href={`/dashboard/admin/experts/${a.id}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 600 }}>
                      {a.full_name || "Unknown"}
                    </Link>
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

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
                  {(expertDocs[a.id] || []).map((d) => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", background: "var(--cream-dark)", padding: "0.4rem 0.7rem", borderRadius: "6px" }}>
                      <div>
                        <span style={{ textTransform: "capitalize" }}>{d.label || d.doc_type.replace("_", " ")}</span>
                        {d.issuing_organization && (
                          <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: "0.4rem" }}>
                            · {d.issuing_organization}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: statusColor[d.verification_status] || "var(--muted)" }}>
                          {d.verification_status.replace("_", " ")}
                          {d.expiry_date && !d.no_expiry && ` · Expires ${new Date(d.expiry_date).toLocaleDateString()}`}
                          {d.no_expiry && " · No Expiry"}
                          {d.lifecycle_status === "removal_requested" && " · Removal Pending"}
                          {d.lifecycle_status === "superseded" && " · Superseded"}
                          {d.lifecycle_status === "removed" && " · Removed"}
                        </span>
                        <button onClick={() => viewAndDecideDocument(d)} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>View</button>
                        {d.verification_status === "pending_verification" && (
                          <>
                            <button onClick={() => decideDocument(d.id, "verified")} style={{ background: "#1e8449", color: "white", border: "none", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>✓</button>
                            <button onClick={() => decideDocument(d.id, "rejected")} style={{ background: "#c0392b", color: "white", border: "none", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>✗</button>
                          </>
                        )}
                        {d.lifecycle_status === "removal_requested" && (
                          <>
                            <button onClick={() => decideRemoval(d.id, true)} style={{ background: "#c0392b", color: "white", border: "none", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>Approve Removal</button>
                            <button onClick={() => decideRemoval(d.id, false)} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>Decline</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
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