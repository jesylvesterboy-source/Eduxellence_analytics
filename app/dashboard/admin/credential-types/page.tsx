"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type CredType = {
  id: number;
  name: string;
  default_validity_months: number | null;
  requires_expiry_date: boolean;
  requires_verification: boolean;
  notifications_enabled: boolean;
};

export default function CredentialTypesPage() {
  const supabase = createClient();
  const [types, setTypes] = useState<CredType[]>([]);
  const [newName, setNewName] = useState("");
  const [newValidity, setNewValidity] = useState("");
  const [newRequiresExpiry, setNewRequiresExpiry] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("credential_types").select("*").order("id");
    setTypes(data || []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function addType() {
    if (!newName.trim()) return;
    const { error } = await supabase.from("credential_types").insert({
      name: newName,
      default_validity_months: newValidity ? parseInt(newValidity) : null,
      requires_expiry_date: newRequiresExpiry,
    });
    if (error) { alert(error.message); return; }
    setNewName("");
    setNewValidity("");
    setNewRequiresExpiry(true);
    load();
  }

  async function updateType(id: number, field: string, value: any) {
    await supabase.from("credential_types").update({ [field]: value }).eq("id", id);
    load();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          Credential Types &amp; Validity
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
          {types.map((t) => (
            <div key={t.id} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <strong style={{ minWidth: "220px" }}>{t.name}</strong>
              <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                Validity (months):
                <input
                  type="number"
                  value={t.default_validity_months ?? ""}
                  placeholder="No expiry"
                  onChange={(e) => updateType(t.id, "default_validity_months", e.target.value ? parseInt(e.target.value) : null)}
                  style={{ width: "80px", padding: "0.3rem", border: "1px solid var(--border)", borderRadius: "4px" }}
                />
              </label>
              <label style={{ fontSize: "0.8rem" }}>
                <input type="checkbox" checked={t.requires_expiry_date} onChange={(e) => updateType(t.id, "requires_expiry_date", e.target.checked)} /> Requires expiry date
              </label>
              <label style={{ fontSize: "0.8rem" }}>
                <input type="checkbox" checked={t.notifications_enabled} onChange={(e) => updateType(t.id, "notifications_enabled", e.target.checked)} /> Notifications
              </label>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Add Credential Type</div>
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
            <input placeholder="Type name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", minWidth: "180px" }} />
            <input type="number" placeholder="Validity (months, blank = no expiry)" value={newValidity} onChange={(e) => setNewValidity(e.target.value)} style={{ width: "200px", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </div>
          <label style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.6rem" }}>
            <input type="checkbox" checked={newRequiresExpiry} onChange={(e) => setNewRequiresExpiry(e.target.checked)} /> Requires expiry date
          </label>
          <button onClick={addType} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>Add</button>
        </div>
      </div>
    </div>
  );
}