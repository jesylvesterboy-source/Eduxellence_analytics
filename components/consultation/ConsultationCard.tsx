"use client";

import { useState } from "react";

type ConsultationStatus = "requested" | "active" | "closed" | "reopened" | "declined" | null;

export default function ConsultationCard({
  projectId,
  consultationId,
  status,
  viewerRole, // "admin" | "client" | "expert"
  hasExpertAssigned,
  onOpenRoom,
  onRefresh,
}: {
  projectId: string;
  consultationId: string | null;
  status: ConsultationStatus;
  viewerRole: "admin" | "client" | "expert";
  hasExpertAssigned: boolean;
  onOpenRoom: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);

  async function requestConsultation() {
    setLoading(true);
    const res = await fetch("/api/consultations/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, reason }),
    });
    setLoading(false);
    if (res.ok) onRefresh();
    else alert((await res.json()).error ?? "Could not request consultation");
  }

  async function connect() {
    if (!consultationId) return;
    setLoading(true);
    const res = await fetch(`/api/consultations/${consultationId}/connect`, { method: "POST" });
    setLoading(false);
    if (res.ok) onRefresh();
    else alert((await res.json()).error ?? "Could not connect");
  }

  async function decline() {
    if (!consultationId) return;
    const declineReason = prompt("Reason for declining (optional):") ?? "";
    setLoading(true);
    const res = await fetch(`/api/consultations/${consultationId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: declineReason }),
    });
    setLoading(false);
    if (res.ok) onRefresh();
    else alert((await res.json()).error ?? "Could not decline");
  }

  async function reopen() {
    if (!consultationId) return;
    setLoading(true);
    const res = await fetch(`/api/consultations/${consultationId}/reopen`, { method: "POST" });
    setLoading(false);
    if (res.ok) onRefresh();
    else alert((await res.json()).error ?? "Could not reopen");
  }

  const boxStyle: React.CSSProperties = {
    background: "var(--white, #fff)",
    border: "1px solid var(--border, #e2e8f0)",
    borderRadius: "10px",
    padding: "1.25rem",
    marginBottom: "1rem",
  };

  // ── No consultation yet ──
  if (!status) {
    if (viewerRole === "client") {
      return (
        <div style={boxStyle}>
          <h3 style={{ fontWeight: 700, marginBottom: "0.4rem" }}>💬 Speak with Your Assigned Expert</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--muted, #64748B)", marginBottom: "0.75rem" }}>
            Need to clarify something about your project? Request a secure consultation with your assigned expert.
          </p>
          {!hasExpertAssigned ? (
            <p style={{ fontSize: "0.8rem", color: "var(--muted, #64748B)" }}>An expert hasn't been assigned to this project yet.</p>
          ) : showReasonInput ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <textarea
                placeholder="Briefly explain what you need to discuss..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border, #e2e8f0)" }}
              />
              <button onClick={requestConsultation} disabled={loading} style={btnPrimary}>
                {loading ? "Sending..." : "Send Request"}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowReasonInput(true)} style={btnPrimary}>Request Consultation</button>
          )}
        </div>
      );
    }
    if (viewerRole === "admin") {
      return (
        <div style={boxStyle}>
          <h3 style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Consultation</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--muted, #64748B)" }}>Not yet initiated.</p>
        </div>
      );
    }
    return null; // expert sees nothing until a consultation exists
  }

  // ── Requested, awaiting admin action ──
  if (status === "requested") {
    return (
      <div style={boxStyle}>
        <h3 style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Consultation Requested</h3>
        {viewerRole === "admin" ? (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button onClick={connect} disabled={loading} style={btnPrimary}>Approve & Connect</button>
            <button onClick={decline} disabled={loading} style={btnOutline}>Decline</button>
          </div>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "var(--muted, #64748B)" }}>Awaiting admin approval.</p>
        )}
      </div>
    );
  }

  // ── Declined ──
  if (status === "declined") {
    return (
      <div style={boxStyle}>
        <h3 style={{ fontWeight: 700 }}>Consultation Declined</h3>
        {viewerRole === "client" && (
          <button onClick={() => setShowReasonInput(true)} style={{ ...btnOutline, marginTop: "0.5rem" }}>
            Request Again
          </button>
        )}
      </div>
    );
  }

  // ── Active or reopened ──
  if (status === "active" || status === "reopened") {
    return (
      <div style={boxStyle}>
        <h3 style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Consultation <span style={{ color: "#16A34A" }}>🟢 Connected</span></h3>
        <button onClick={onOpenRoom} style={btnPrimary}>Open Consultation</button>
      </div>
    );
  }

  // ── Closed ──
  if (status === "closed") {
    return (
      <div style={boxStyle}>
        <h3 style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Consultation Closed</h3>
        <button onClick={onOpenRoom} style={{ ...btnOutline, marginRight: "0.5rem" }}>View History</button>
        {viewerRole === "admin" && (
          <button onClick={reopen} disabled={loading} style={btnOutline}>Reopen</button>
        )}
      </div>
    );
  }

  return null;
}

const btnPrimary: React.CSSProperties = {
  background: "var(--gold, #C8960C)", color: "#111", border: "none",
  padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer",
};
const btnOutline: React.CSSProperties = {
  background: "transparent", color: "var(--gold-dark, #8B6508)", border: "1px solid var(--gold, #C8960C)",
  padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer",
};