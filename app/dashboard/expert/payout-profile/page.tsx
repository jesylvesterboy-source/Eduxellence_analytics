"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Profile = {
  id: string;
  method: string;
  account_name: string;
  bank_name: string | null;
  account_number: string;
  country: string | null;
  currency: string;
  status: string;
  rejection_reason: string | null;
  is_active: boolean;
  created_at: string;
};

function mask(num: string) {
  return num.length > 4 ? "****" + num.slice(-4) : num;
}

export default function PayoutProfilePage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [method, setMethod] = useState("bank_transfer");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("payout_profiles")
      .select("*")
      .eq("expert_id", user.id)
      .order("created_at", { ascending: false });
    setProfiles(data || []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const activeProfile = profiles.find((p) => p.is_active);
  const pendingProfile = profiles.find((p) => p.status === "pending_verification");

  function openBlankForm() {
    setEditingId(null);
    setMethod("bank_transfer");
    setAccountName("");
    setBankName("");
    setAccountNumber("");
    setCountry("");
    setCurrency("USD");
    setShowForm(true);
  }

  function openEditForm(p: Profile) {
    setEditingId(p.id);
    setMethod(p.method);
    setAccountName(p.account_name);
    setBankName(p.bank_name || "");
    setAccountNumber(p.account_number);
    setCountry(p.country || "");
    setCurrency(p.currency);
    setShowForm(true);
  }

  async function submit() {
    if (!accountName.trim() || !accountNumber.trim() || !currency.trim()) {
      alert("Account name, account number, and currency are required.");
      return;
    }
    setSubmitting(true);

    if (editingId) {
      // Editing a PENDING (not yet verified) submission: safe to update in place
      const { error } = await supabase
        .from("payout_profiles")
        .update({
          method,
          account_name: accountName,
          bank_name: bankName || null,
          account_number: accountNumber,
          country: country || null,
          currency,
        })
        .eq("id", editingId);
      setSubmitting(false);
      if (error) {
        alert("Update failed: " + error.message);
        return;
      }
    } else {
      // New submission (first time, or replacing an already-verified account):
      // goes through verification again, for security.
      const { error } = await supabase.rpc("fn_submit_payout_profile", {
        p_method: method,
        p_account_name: accountName,
        p_bank_name: bankName || null,
        p_account_number: accountNumber,
        p_country: country || null,
        p_currency: currency,
      });
      setSubmitting(false);
      if (error) {
        alert("Submission failed: " + error.message);
        return;
      }
    }

    setShowForm(false);
    setEditingId(null);
    load();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/expert" backLabel="Back to Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          Payout Details
        </h1>

        {activeProfile && (
          <div style={{ background: "var(--white)", border: "1px solid #1e8449", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, color: "#1e8449", marginBottom: "0.5rem" }}>Verified Payout Account</div>
            <p style={{ fontSize: "0.85rem" }}>{activeProfile.account_name} - {activeProfile.bank_name || activeProfile.method}</p>
            <p style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{mask(activeProfile.account_number)} - {activeProfile.currency}</p>
          </div>
        )}

        {pendingProfile && (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600 }}>Pending Verification</div>
            <p style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>{pendingProfile.account_name} - {mask(pendingProfile.account_number)}</p>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.3rem" }}>Admin is reviewing this submission.</p>
            <button
              onClick={() => openEditForm(pendingProfile)}
              style={{ marginTop: "0.6rem", background: "transparent", border: "1px solid var(--ink)", padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}
            >
              Edit Details
            </button>
          </div>
        )}

        {profiles.some((p) => p.status === "rejected") && !pendingProfile && (
          <div style={{ background: "var(--white)", border: "1px solid #c0392b", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, color: "#c0392b" }}>Last submission rejected</div>
            <p style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>{profiles.find((p) => p.status === "rejected")?.rejection_reason || "No reason given."}</p>
          </div>
        )}

        {!showForm ? (
          <button onClick={openBlankForm} style={{ background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.7rem 1.5rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
            {activeProfile ? "Change Payout Account" : "Add Payout Details"}
          </button>
        ) : (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem" }}>
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={inputStyle}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="raenest">Raenest</option>
            </select>
            <input placeholder="Full account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} style={inputStyle} />
            <input placeholder="Bank name (if applicable)" value={bankName} onChange={(e) => setBankName(e.target.value)} style={inputStyle} />
            <input placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} style={inputStyle} />
            <input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle} />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
              <option value="USD">USD</option>
              <option value="NGN">NGN</option>
            </select>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.5rem" }}>
              <button onClick={submit} disabled={submitting} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Submit for Verification"}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.6rem 1.25rem", borderRadius: "6px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.6rem" };