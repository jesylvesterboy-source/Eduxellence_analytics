"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../../_components/back-home-bar";

type Financial = {
  total_project_value: number; total_paid: number; total_held: number; total_released: number;
  milestone_id: string | null; milestone_title: string | null; milestone_amount: number | null;
  milestone_status: string | null; payment_id: string | null; payment_status: string | null;
};

type Request = { id: string; reason: string; explanation: string | null; work_commenced: boolean; status: string; created_at: string };

type LineResolution = { milestone_id: string | null; payment_id: string | null; resolution_type: string; refund_amount: string; expert_compensation_amount: string; notes: string };

export default function CancellationResolutionPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [request, setRequest] = useState<Request | null>(null);
  const [financials, setFinancials] = useState<Financial[]>([]);
  const [lines, setLines] = useState<Record<string, LineResolution>>({});
  const [adminId, setAdminId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setAdminId(user?.id ?? null);

    const { data: req } = await supabase
      .from("cancellation_requests")
      .select("id, reason, explanation, work_commenced, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRequest(req);

    const { data: fin } = await supabase.rpc("fn_cancellation_financials", { p_project_id: projectId });
    setFinancials(fin || []);

    const initialLines: Record<string, LineResolution> = {};
    (fin || []).forEach((f: Financial) => {
      const key = f.payment_id || f.milestone_id || "unlinked";
      initialLines[key] = { milestone_id: f.milestone_id, payment_id: f.payment_id, resolution_type: "no_refund", refund_amount: "0", expert_compensation_amount: "0", notes: "" };
    });
    setLines(initialLines);
  }, [supabase, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateLine(key: string, field: keyof LineResolution, value: string) {
    setLines((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  const totalRefund = Object.values(lines).reduce((s, l) => s + (parseFloat(l.refund_amount) || 0), 0);
  const totalExpertComp = Object.values(lines).reduce((s, l) => s + (parseFloat(l.expert_compensation_amount) || 0), 0);

  async function submitResolution(overallStatus: "cancelled" | "partially_approved") {
    if (!adminId || !request) return;
    if (!confirm(`Confirm resolution? Total refund: $${totalRefund}, total expert compensation: $${totalExpertComp}.`)) return;

    setSubmitting(true);
    const resolutionsPayload = Object.values(lines).map((l) => ({
      milestone_id: l.milestone_id,
      payment_id: l.payment_id,
      resolution_type: l.resolution_type,
      refund_amount: parseFloat(l.refund_amount) || 0,
      expert_compensation_amount: parseFloat(l.expert_compensation_amount) || 0,
      notes: l.notes || null,
    }));

    const { error } = await supabase.rpc("fn_resolve_cancellation", {
      p_request_id: request.id,
      p_admin_id: adminId,
      p_resolutions: resolutionsPayload,
      p_overall_status: overallStatus,
    });
    setSubmitting(false);
    if (error) {
      alert(error.message);
      return;
    }
    alert("Resolution recorded.");
    load();
  }

  async function rejectRequest() {
    if (!adminId || !request) return;
    const notes = prompt("Reason for declining the cancellation request:");
    if (notes === null) return;
    const { error } = await supabase.rpc("fn_reject_cancellation", { p_request_id: request.id, p_admin_id: adminId, p_notes: notes });
    if (error) { alert(error.message); return; }
    alert("Cancellation request rejected.");
    load();
  }

  if (!request) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <BackHomeBar backHref={`/dashboard/admin/${projectId}`} backLabel="Back to Project" />
          <p style={{ color: "var(--muted)" }}>No cancellation request found for this project.</p>
        </div>
      </div>
    );
  }

  const summary = financials[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <BackHomeBar backHref={`/dashboard/admin/${projectId}`} backLabel="Back to Project" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", marginBottom: "0.5rem" }}>Cancellation Resolution</h1>

        <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.85rem" }}><strong>Reason:</strong> {request.reason}</p>
          {request.explanation && <p style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>{request.explanation}</p>}
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.4rem" }}>
            Work commenced: {request.work_commenced ? "Yes" : "No"} · Requested {new Date(request.created_at).toLocaleString()} · Status: {request.status}
          </p>
        </div>

        {summary && (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.6rem" }}>Project Financials</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", fontSize: "0.8rem" }}>
              <div>Total Paid<br /><strong>${summary.total_paid}</strong></div>
              <div>Held<br /><strong>${summary.total_held}</strong></div>
              <div>Released<br /><strong>${summary.total_released}</strong></div>
              <div>Project Value<br /><strong>${summary.total_project_value}</strong></div>
            </div>
          </div>
        )}

        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Resolve Per Line Item</div>
          {financials.map((f) => {
            const key = f.payment_id || f.milestone_id || "unlinked";
            const line = lines[key];
            if (!line) return null;
            return (
              <div key={key} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0.9rem", marginBottom: "0.6rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  {f.milestone_title || "Project-level payment"} — ${f.milestone_amount ?? "—"}
                  <span style={{ color: "var(--muted)", fontWeight: 400 }}> · milestone: {f.milestone_status ?? "—"} · payment: {f.payment_status ?? "no payment"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <select value={line.resolution_type} onChange={(e) => updateLine(key, "resolution_type", e.target.value)} style={smallInput}>
                    <option value="no_refund">No Refund</option>
                    <option value="full_refund">Full Refund</option>
                    <option value="partial_refund">Partial Refund</option>
                    <option value="release_to_expert">Release to Expert</option>
                    <option value="partial_release">Partial Release</option>
                  </select>
                  <input type="number" placeholder="Refund $" value={line.refund_amount} onChange={(e) => updateLine(key, "refund_amount", e.target.value)} style={smallInput} />
                  <input type="number" placeholder="Expert comp $" value={line.expert_compensation_amount} onChange={(e) => updateLine(key, "expert_compensation_amount", e.target.value)} style={smallInput} />
                </div>
                <input placeholder="Notes (optional)" value={line.notes} onChange={(e) => updateLine(key, "notes", e.target.value)} style={{ ...smallInput, marginTop: "0.5rem" }} />
              </div>
            );
          })}

          <div style={{ background: "var(--cream-dark)", borderRadius: "8px", padding: "0.75rem", marginTop: "0.75rem", fontSize: "0.85rem" }}>
            <strong>Total Refund: ${totalRefund.toFixed(2)}</strong> · <strong>Total Expert Compensation: ${totalExpertComp.toFixed(2)}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button onClick={() => submitResolution("cancelled")} disabled={submitting} style={{ background: "#c0392b", color: "white", border: "none", padding: "0.7rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
            Approve Full Cancellation
          </button>
          <button onClick={() => submitResolution("partially_approved")} disabled={submitting} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.7rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
            Approve Partial Resolution
          </button>
          <button onClick={rejectRequest} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.7rem 1.25rem", borderRadius: "6px", cursor: "pointer" }}>
            Reject Request
          </button>
        </div>
      </div>
    </div>
  );
}

const smallInput: React.CSSProperties = { padding: "0.4rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem" };