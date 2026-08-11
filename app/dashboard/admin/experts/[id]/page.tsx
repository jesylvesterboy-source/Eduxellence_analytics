"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../../_components/back-home-bar";

type Overview = {
  full_name: string | null;
  email: string | null;
  bio: string | null;
  expertise: string[] | null;
  application_status: string;
  level_name: string | null;
  badge: string | null;
  revenue_share: number | null;
};

type CapabilityProfile = {
  category_ids: number[];
  skill_ids: number[];
  experience_level: string | null;
  availability: string | null;
  preferred_project_types: string[] | null;
};

type DocRow = { id: string; doc_type: string; label: string | null; file_path: string; verification_status: string; lifecycle_status: string; expiry_date: string | null; no_expiry: boolean; is_required: boolean; replaces_document_id: string | null };

type EarningsSummary = { pending: number; available: number; paid: number; lifetime: number };

type ProjectRow = { id: string; title: string; status: string };

type OfferRow = { id: string; status: string; project_id: string; project_title: string | null };

const statusColor: Record<string, string> = {
  verified: "#1e8449",
  pending_verification: "var(--gold-dark)",
  rejected: "#c0392b",
  expired: "#c0392b",
};

export default function AdminExpertProfilePage() {
  const params = useParams();
  const expertId = params.id as string;
  const supabase = createClient();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [capability, setCapability] = useState<CapabilityProfile | null>(null);
  const [categoryNames, setCategoryNames] = useState<Record<number, string>>({});
  const [skillNames, setSkillNames] = useState<Record<number, string>>({});
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<{ projects_count: number; reviews_count: number; avg_rating: number | null; on_time_pct: number | null }>({ projects_count: 0, reviews_count: 0, avg_rating: null, on_time_pct: null });
  const [revisionCount, setRevisionCount] = useState(0);
  const [nextLevel, setNextLevel] = useState<{ level_name: string; revenue_share: number; min_projects: number; min_reviews: number; min_rating: number; min_on_time_pct: number } | null>(null);
  const [promotionStatus, setPromotionStatus] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary>({ pending: 0, available: 0, paid: 0, lifetime: 0 });
  const [payoutHistory, setPayoutHistory] = useState<{ period_label: string | null; amount: number; status: string }[]>([]);
  const [currentProjects, setCurrentProjects] = useState<ProjectRow[]>([]);
  const [pastProjects, setPastProjects] = useState<ProjectRow[]>([]);
  const [declinedOffers, setDeclinedOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setAdminId(user?.id ?? null);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, bio, expertise, application_status, expert_level_id, expert_levels!profiles_expert_level_id_fkey(level_name, badge, revenue_share, level_order)")
      .eq("id", expertId)
      .single();

    const currentLevel: any = profile?.expert_levels;
    setOverview({
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      bio: profile?.bio ?? null,
      expertise: profile?.expertise ?? null,
      application_status: profile?.application_status ?? "draft",
      level_name: currentLevel?.level_name ?? null,
      badge: currentLevel?.badge ?? null,
      revenue_share: currentLevel?.revenue_share ?? null,
    });

    const { data: cap } = await supabase.from("expert_capability_profiles").select("*").eq("expert_id", expertId).maybeSingle();
    setCapability(cap);

    if (cap) {
      const { data: cats } = await supabase.from("solution_categories").select("id, name");
      const catMap: Record<number, string> = {};
      (cats || []).forEach((c) => (catMap[c.id] = c.name));
      setCategoryNames(catMap);

      const { data: skls } = await supabase.from("solution_skills").select("id, name");
      const skMap: Record<number, string> = {};
      (skls || []).forEach((s) => (skMap[s.id] = s.name));
      setSkillNames(skMap);
    }

    const { data: docRows } = await supabase
      .from("expert_documents")
      .select("id, doc_type, label, file_path, verification_status, lifecycle_status, expiry_date, no_expiry, is_required, replaces_document_id")
      .eq("expert_id", expertId);
    setDocs(docRows || []);

    // FIXED: Added lifecycle_status === "current" filter to pick the active photo
    const photoDoc = (docRows || []).find((d) => d.doc_type === "profile_photo" && d.lifecycle_status === "current");
    if (photoDoc) {
      const { data: signed } = await supabase.storage.from("expert-applications").createSignedUrl(photoDoc.file_path, 600);
      setPhotoUrl(signed?.signedUrl ?? null);
    }

    const { data: statRows } = await supabase.rpc("fn_expert_stats", { p_expert_id: expertId });
    setStats(statRows?.[0] ?? { projects_count: 0, reviews_count: 0, avg_rating: null, on_time_pct: null });

    const { data: revRows } = await supabase
      .from("revision_requests")
      .select("id, projects!inner(expert_id)")
      .eq("projects.expert_id", expertId);
    setRevisionCount(revRows?.length ?? 0);

    if (currentLevel) {
      const { data: nl } = await supabase
        .from("expert_levels")
        .select("level_name, revenue_share, min_projects, min_reviews, min_rating, min_on_time_pct")
        .eq("level_order", currentLevel.level_order + 1)
        .maybeSingle();
      setNextLevel(nl);
    }

    const { data: promoRow } = await supabase
      .from("expert_promotion_reviews")
      .select("status")
      .eq("expert_id", expertId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPromotionStatus(promoRow?.status ?? null);

    const { data: earnRows } = await supabase.from("expert_earnings").select("expert_earnings, status").eq("expert_id", expertId);
    const sum = (status: string) => (earnRows || []).filter((e) => e.status === status).reduce((s, e) => s + Number(e.expert_earnings), 0);
    setEarnings({
      pending: sum("pending"),
      available: sum("available"),
      paid: sum("paid"),
      lifetime: (earnRows || []).reduce((s, e) => s + Number(e.expert_earnings), 0),
    });

    const { data: payoutRows } = await supabase
      .from("payout_batch_items")
      .select("amount, status, payout_batches(period_label)")
      .eq("expert_id", expertId)
      .order("created_at", { ascending: false })
      .limit(10);
    setPayoutHistory((payoutRows || []).map((p: any) => ({ period_label: p.payout_batches?.period_label ?? null, amount: p.amount, status: p.status })));

    const { data: projRows } = await supabase.from("projects").select("id, title, status").eq("expert_id", expertId).order("created_at", { ascending: false });
    setCurrentProjects((projRows || []).filter((p) => !["completed", "cancelled", "declined"].includes(p.status)));
    setPastProjects((projRows || []).filter((p) => ["completed", "cancelled"].includes(p.status)));

    const { data: offerRows } = await supabase
      .from("project_offers")
      .select("id, status, project_id, projects(title)")
      .eq("expert_id", expertId)
      .eq("status", "declined")
      .order("offered_at", { ascending: false });
    setDeclinedOffers((offerRows || []).map((o: any) => ({ id: o.id, status: o.status, project_id: o.project_id, project_title: o.projects?.title ?? null })));

    setLoading(false);
  }, [expertId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function viewDoc(doc: DocRow) {
    const { data } = await supabase.storage.from("expert-applications").createSignedUrl(doc.file_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function verify(docId: string, decision: "verified" | "rejected") {
    if (!adminId) return;
    let reason: string | null = null;
    if (decision === "rejected") {
      reason = prompt("Reason:") ?? null;
      if (reason === null) return;
    }
    const { error } = await supabase.rpc("fn_verify_document", {
      p_document_id: docId,
      p_admin_id: adminId,
      p_decision: decision,
      p_reason: reason,
      p_override_expiry_date: null,
      p_override_no_expiry: null,
    });
    if (error) return alert(error.message);
    load();
  }

  async function decideRemoval(docId: string, approve: boolean) {
    if (!adminId) return;
    const { error } = await supabase.rpc("fn_decide_document_removal", {
      p_document_id: docId,
      p_admin_id: adminId,
      p_approve: approve,
    });
    if (error) return alert(error.message);
    load();
  }

  async function decideReplacement(newDocId: string, approve: boolean) {
    if (!adminId) return;
    let reason: string | null = null;
    if (!approve) {
      reason = prompt("Reason for rejecting this replacement:") ?? null;
      if (reason === null) return;
    }
    const { error } = await supabase.rpc("fn_decide_document_replacement", {
      p_new_document_id: newDocId,
      p_admin_id: adminId,
      p_approve: approve,
      p_reason: reason,
    });
    if (error) return alert(error.message);
    load();
  }

  async function toggleRequired(docId: string, required: boolean) {
    const { error } = await supabase.rpc("fn_set_document_required", {
      p_document_id: docId,
      p_required: required,
    });
    if (error) return alert(error.message);
    load();
  }

  if (loading || !overview) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  const growthMet = nextLevel
    ? stats.projects_count >= nextLevel.min_projects &&
      stats.reviews_count >= nextLevel.min_reviews &&
      (stats.avg_rating ?? 0) >= nextLevel.min_rating &&
      (stats.on_time_pct ?? 0) >= nextLevel.min_on_time_pct
    : false;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin/experts" backLabel="Back to Experts" />

        {/* OVERVIEW */}
        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.5rem", display: "flex", gap: "1.5rem" }}>
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: "90px", height: "90px", borderRadius: "10px", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "90px", height: "90px", borderRadius: "10px", background: "var(--cream-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--muted)" }}>
              {overview.full_name?.[0] ?? "?"}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem" }}>{overview.full_name}</h1>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{overview.email}</p>
              </div>
              {overview.badge && (
                <span style={{ background: "var(--gold-light)", padding: "0.3rem 0.8rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                  {overview.badge} · {Math.round((overview.revenue_share ?? 0) * 100)}%
                </span>
              )}
            </div>
            {overview.bio && <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>{overview.bio}</p>}
            {capability && (
              <div style={{ marginTop: "0.75rem", fontSize: "0.8rem" }}>
                <div><strong>Solution areas:</strong> {capability.category_ids.map((id) => categoryNames[id]).filter(Boolean).join(", ") || "—"}</div>
                <div><strong>Skills:</strong> {capability.skill_ids.map((id) => skillNames[id]).filter(Boolean).join(", ") || "—"}</div>
                <div><strong>Experience:</strong> {capability.experience_level?.replace("_", "–") || "—"} · <strong>Availability:</strong> {capability.availability || "—"}</div>
              </div>
            )}
          </div>
        </div>

        {/* PROFILE PHOTO SECTION - FIXED: added lifecycle_status === "current" filter */}
        {(() => {
          const photoDoc = docs.find((d) => d.doc_type === "profile_photo" && d.lifecycle_status === "current");
          if (!photoDoc) return null;
          return (
            <Section title="Profile Photo">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                <span style={{ color: statusColor[photoDoc.verification_status] || "var(--muted)", fontWeight: 600 }}>
                  {photoDoc.verification_status.replace("_", " ")}
                  {photoDoc.lifecycle_status === "removal_requested" && " · Removal Requested"}
                </span>
                {photoDoc.lifecycle_status === "removal_requested" && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => decideRemoval(photoDoc.id, true)} style={{ background: "#c0392b", color: "white", border: "none", borderRadius: "4px", padding: "0.3rem 0.7rem", fontSize: "0.75rem", cursor: "pointer" }}>
                      Approve Removal
                    </button>
                    <button onClick={() => decideRemoval(photoDoc.id, false)} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.3rem 0.7rem", fontSize: "0.75rem", cursor: "pointer" }}>
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </Section>
          );
        })()}

        {/* PENDING REPLACEMENTS SECTION */}
        {(() => {
          const pendingReplacements = docs.filter((d) => d.lifecycle_status === "pending_replacement");
          if (pendingReplacements.length === 0) return null;
          return (
            <Section title="Pending Replacements">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {pendingReplacements.map((newDoc) => {
                  const oldDoc = docs.find((d) => d.id === newDoc.replaces_document_id);
                  const isPhoto = newDoc.doc_type === "profile_photo";
                  return (
                    <div key={newDoc.id} style={{ background: "var(--cream-dark)", borderRadius: "8px", padding: "0.9rem" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.6rem", textTransform: "capitalize" }}>
                        {isPhoto ? "Profile Photo Replacement" : (newDoc.label || newDoc.doc_type.replace("_", " ")) + " — Replacement"}
                      </div>
                      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.7rem", fontSize: "0.78rem" }}>
                        <div>
                          <div style={{ color: "var(--muted)", marginBottom: "0.2rem" }}>Current</div>
                          {oldDoc ? (
                            <button onClick={() => viewDoc(oldDoc)} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.2rem 0.6rem", fontSize: "0.72rem", cursor: "pointer" }}>View Current</button>
                          ) : <span style={{ color: "var(--muted)" }}>—</span>}
                        </div>
                        <div>
                          <div style={{ color: "var(--muted)", marginBottom: "0.2rem" }}>Replacement</div>
                          <button onClick={() => viewDoc(newDoc)} style={{ background: "var(--gold)", border: "none", borderRadius: "4px", padding: "0.2rem 0.6rem", fontSize: "0.72rem", cursor: "pointer" }}>View New</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => decideReplacement(newDoc.id, true)} style={{ background: "#1e8449", color: "white", border: "none", borderRadius: "4px", padding: "0.3rem 0.8rem", fontSize: "0.75rem", cursor: "pointer" }}>
                          Approve Replacement
                        </button>
                        <button onClick={() => decideReplacement(newDoc.id, false)} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", borderRadius: "4px", padding: "0.3rem 0.8rem", fontSize: "0.75rem", cursor: "pointer" }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          );
        })()}

        {/* CREDENTIALS - filtered to exclude profile_photo and pending_replacement */}
        <Section title="Credentials & Documents">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {docs.filter((d) => d.doc_type !== "profile_photo" && d.lifecycle_status !== "pending_replacement").map((d) => (
              <div key={d.id} style={{ background: "var(--cream-dark)", borderRadius: "8px", padding: "0.5rem 0.8rem", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ textTransform: "capitalize" }}>
                  {d.label || d.doc_type.replace("_", " ")}
                  {d.is_required && (
                    <span style={{ marginLeft: "0.4rem", fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", background: "var(--gold-light)", padding: "0.1rem 0.35rem", borderRadius: "3px", textTransform: "uppercase" }}>
                      Required
                    </span>
                  )}
                </span>
                <span style={{ color: statusColor[d.verification_status] || "var(--muted)", fontWeight: 600, textTransform: "capitalize" }}>
                  {d.verification_status.replace("_", " ")}
                  {d.lifecycle_status === "removal_requested" && " · Removal Pending"}
                  {d.lifecycle_status === "superseded" && " · Superseded"}
                </span>
                {d.expiry_date && !d.no_expiry && <span style={{ color: "var(--muted)" }}>· exp {new Date(d.expiry_date).toLocaleDateString()}</span>}
                <button onClick={() => viewDoc(d)} style={{ background: "var(--gold)", border: "none", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.7rem", cursor: "pointer" }}>
                  View
                </button>
                <button onClick={() => toggleRequired(d.id, !d.is_required)} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.68rem", cursor: "pointer" }}>
                  {d.is_required ? "Unmark Required" : "Mark as Required"}
                </button>
                {d.verification_status === "pending_verification" && (
                  <>
                    <button onClick={() => verify(d.id, "verified")} style={{ background: "#1e8449", color: "white", border: "none", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.7rem", cursor: "pointer" }}>
                      ✓
                    </button>
                    <button onClick={() => verify(d.id, "rejected")} style={{ background: "#c0392b", color: "white", border: "none", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.7rem", cursor: "pointer" }}>
                      ✗
                    </button>
                  </>
                )}
                {d.lifecycle_status === "removal_requested" && (
                  <>
                    <button onClick={() => decideRemoval(d.id, true)} style={{ background: "#c0392b", color: "white", border: "none", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.7rem", cursor: "pointer" }}>
                      Approve Removal
                    </button>
                    <button onClick={() => decideRemoval(d.id, false)} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.7rem", cursor: "pointer" }}>
                      Decline
                    </button>
                  </>
                )}
              </div>
            ))}
            {docs.filter((d) => d.doc_type !== "profile_photo" && d.lifecycle_status !== "pending_replacement").length === 0 && <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No documents uploaded.</p>}
          </div>
        </Section>

        {/* PERFORMANCE */}
        <Section title="Performance">
          <StatGrid>
            <Stat label="Projects Completed" value={stats.projects_count} />
            <Stat label="Reviews" value={stats.reviews_count} />
            <Stat label="Avg Rating" value={stats.avg_rating ?? "—"} />
            <Stat label="On-Time Delivery" value={stats.on_time_pct !== null ? `${stats.on_time_pct}%` : "—"} />
            <Stat label="Revision Requests" value={revisionCount} />
          </StatGrid>
        </Section>

        {/* GROWTH */}
        <Section title="Growth">
          <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            <strong>{overview.level_name}</strong> ({Math.round((overview.revenue_share ?? 0) * 100)}% share)
            {nextLevel && <> → Next: <strong>{nextLevel.level_name}</strong> ({Math.round(nextLevel.revenue_share * 100)}%)</>}
          </div>
          {promotionStatus === "eligible" && (
            <p style={{ fontSize: "0.8rem", color: "#1e8449", fontWeight: 600 }}>🎯 Eligible for promotion — awaiting review</p>
          )}
          {nextLevel && !growthMet && (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Progressing toward {nextLevel.level_name}</p>
          )}
        </Section>

        {/* FINANCIAL */}
        <Section title="Financial">
          <StatGrid>
            <Stat label="Pending" value={`$${earnings.pending.toLocaleString()}`} />
            <Stat label="Available" value={`$${earnings.available.toLocaleString()}`} />
            <Stat label="Paid" value={`$${earnings.paid.toLocaleString()}`} />
            <Stat label="Lifetime" value={`$${earnings.lifetime.toLocaleString()}`} />
          </StatGrid>
          {payoutHistory.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              {payoutHistory.map((p, i) => (
                <div key={i} style={{ fontSize: "0.78rem", display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid var(--border)" }}>
                  <span>{p.period_label}</span>
                  <span>${p.amount} — {p.status}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ASSIGNMENT */}
        <Section title="Assignment">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.4rem" }}>Current</div>
              {currentProjects.map((p) => <ProjectLine key={p.id} p={p} />)}
              {currentProjects.length === 0 && <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>None</p>}
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.4rem" }}>Past</div>
              {pastProjects.map((p) => <ProjectLine key={p.id} p={p} />)}
              {pastProjects.length === 0 && <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>None</p>}
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.4rem" }}>Declined Offers</div>
              {declinedOffers.map((o) => <div key={o.id} style={{ fontSize: "0.75rem", padding: "0.2rem 0" }}>{o.project_title}</div>)}
              {declinedOffers.length === 0 && <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>None</p>}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem" }}>{title}</div>
      {children}
    </div>
  );
}
function StatGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem" }}>{children}</div>;
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "var(--cream-dark)", borderRadius: "8px", padding: "0.75rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--gold-dark)" }}>{value}</div>
      <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{label}</div>
    </div>
  );
}
function ProjectLine({ p }: { p: { id: string; title: string; status: string } }) {
  return (
    <a href={`/dashboard/admin/${p.id}`} style={{ display: "block", fontSize: "0.75rem", padding: "0.2rem 0", color: "var(--ink)", textDecoration: "none" }}>
      {p.title} <span style={{ color: "var(--muted)" }}>({p.status})</span>
    </a>
  );
}