"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type PendingProfile = {
  id: string;
  expert_id: string;
  account_name: string;
  bank_name: string | null;
  account_number: string;
  currency: string;
  method: string;
  created_at: string;
  expert_name: string | null;
};

function mask(num: string) {
  return num.length > 4 ? "****" + num.slice(-4) : num;
}

export default function AdminPayoutProfilesPage() {
  const supabase = createClient();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingProfile[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setAdminId(user?.id ?? null);

    const { data } = await supabase
      .from("payout_profiles")
      .select("id, expert_id, account_name, bank_name, account_number, currency, method, created_at, profiles!payout_profiles_expert_id_fkey(full_name)")
      .eq("status", "pending_verification")
      .order("created_at", { ascending: true });

    setPending((data || []).map((r: any) => ({ ...r, expert_name: r.profiles?.full_name ?? null })));
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(profileId: string, decision: "verified" | "rejected") {
    if (!adminId) return;
    let reason: string | null = null;
    if (decision === "rejected") {
      reason = prompt("Reason for rejecting:") ?? null;
      if (reason === null) return;
    } else if (!confirm("Verify this payout account? It becomes the expert's active payout destination.")) {
      return;
    }
    setActingId(profileId);
    const { error } = await supabase.rpc("fn_verify_payout_profile", {
      p_profile_id: profileId,
      p_admin_id: adminId,
      p_decision: decision,
      p_reason: reason,
    });
    setActingId(null);
    if (error) {
      alert("Failed: " + error.message);
      return;
    }
    load();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          Payout Profile Verification ({pending.length})
        </h1>

        {pending.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No pending payout submissions.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pending.map((p) => (
              <div key={p.id} style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem" }}>
                <strong>{p.expert_name || "Unknown"}</strong>
                <p style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>{p.account_name} — {p.bank_name || p.method}</p>
                <p style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{mask(p.account_number)} · {p.currency}</p>
                <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem" }}>
                  <button onClick={() => decide(p.id, "verified")} disabled={actingId === p.id} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.4rem 1rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
                    Verify
                  </button>
                  <button onClick={() => decide(p.id, "rejected")} disabled={actingId === p.id} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
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