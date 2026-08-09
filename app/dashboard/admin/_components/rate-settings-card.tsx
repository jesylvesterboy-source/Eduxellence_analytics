"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RateSettingsCard() {
  const supabase = createClient();
  const [rate, setRate] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [responseMin, setResponseMin] = useState("");
  const [reminderMin, setReminderMin] = useState("");
  const [escalationMin, setEscalationMin] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadRate = useCallback(async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("usd_to_ngn_rate, offer_response_minutes, reminder_window_minutes, final_escalation_minutes")
      .eq("id", 1)
      .single();
    if (data) {
      setRate(data.usd_to_ngn_rate);
      setInput(String(data.usd_to_ngn_rate));
      setResponseMin(String(data.offer_response_minutes ?? ""));
      setReminderMin(String(data.reminder_window_minutes ?? ""));
      setEscalationMin(String(data.final_escalation_minutes ?? ""));
    }
  }, [supabase]);

  useEffect(() => {
    loadRate();
  }, [loadRate]);

  async function saveRate() {
    const parsed = parseFloat(input);
    if (!parsed || parsed <= 0) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("platform_settings")
      .update({
        usd_to_ngn_rate: parsed,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
        offer_response_minutes: parseInt(responseMin) || 30,
        reminder_window_minutes: parseInt(reminderMin) || 30,
        final_escalation_minutes: parseInt(escalationMin) || 60,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      setMessage("Failed to update: " + error.message);
      return;
    }
    setRate(parsed);
    setMessage("Rate updated. This applies to new quotations only — existing quotations keep their locked rate.");
    setTimeout(() => setMessage(null), 5000);
  }

  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "2rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.4rem", fontSize: "0.9rem" }}>
        Eduxellence USD → NGN Conversion Rate
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
        Eduxellence&apos;s internal platform rate for payment purposes — not the official market exchange rate.
        Current: {rate !== null ? `₦${rate} = $1` : "Loading..."}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem" }}>₦</span>
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ width: "120px", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" }}
        />
        <span style={{ fontSize: "0.85rem" }}>= $1</span>
        <button
          onClick={saveRate}
          disabled={saving}
          style={{ background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
        >
          {saving ? "Saving..." : "Update Rate"}
        </button>
      </div>
      {message && <p style={{ fontSize: "0.75rem", color: "var(--gold-dark)", marginTop: "0.5rem" }}>{message}</p>}

      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>Expert Offer Response Windows (minutes)</div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div>
            <label style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Initial</label>
            <input
              type="number"
              value={responseMin}
              onChange={(e) => setResponseMin(e.target.value)}
              style={{ width: "70px", padding: "0.4rem", border: "1px solid var(--border)", borderRadius: "6px", display: "block" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Reminder</label>
            <input
              type="number"
              value={reminderMin}
              onChange={(e) => setReminderMin(e.target.value)}
              style={{ width: "70px", padding: "0.4rem", border: "1px solid var(--border)", borderRadius: "6px", display: "block" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Escalation</label>
            <input
              type="number"
              value={escalationMin}
              onChange={(e) => setEscalationMin(e.target.value)}
              style={{ width: "70px", padding: "0.4rem", border: "1px solid var(--border)", borderRadius: "6px", display: "block" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}