"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Row = {
  id: string;
  full_name: string | null;
  expert_level_id: number | null;
  level_name: string | null;
  badge: string | null;
  revenue_share: number | null;
  pending: number;
  available: number;
  paid: number;
  lifetime: number;
  payout_method: string | null;
  payout_status: string | null;
};

export default function AdminPayoutDirectoryPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [photoLinks, setPhotoLinks] = useState<Record<string, string>>({});
  const [nextPayoutDate, setNextPayoutDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: experts } = await supabase
      .from("profiles")
      .select("id, full_name, expert_level_id")
      .eq("role", "expert")
      .eq("application_status", "approved")
      .order("full_name", { ascending: true });

    const expertRows = experts || [];
    const ids = expertRows.map((e) => e.id);

    const { data: levels } = await supabase.from("expert_levels").select("id, level_name, badge, revenue_share");
    const levelMap: Record<number, { level_name: string; badge: string; revenue_share: number }> = {};
    (levels || []).forEach((l) => (levelMap[l.id] = l));

    const { data: earnings } = await supabase
      .from("expert_earnings")
      .select("expert_id, expert_earnings, status")
      .in("expert_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const { data: payoutProfiles } = await supabase
      .from("payout_profiles")
      .select("expert_id, method, status")
      .eq("is_active", true)
      .in("expert_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const payoutMap: Record<string, { method: string; status: string }> = {};
    (payoutProfiles || []).forEach((p) => (payoutMap[p.expert_id] = p));

    const combined: Row[] = expertRows.map((e) => {
      const lvl = e.expert_level_id ? levelMap[e.expert_level_id] : null;
      const myEarnings = (earnings || []).filter((x) => x.expert_id === e.id);
      const sum = (status: string) => myEarnings.filter((x) => x.status === status).reduce((s, x) => s + Number(x.expert_earnings), 0);
      const payout = payoutMap[e.id];
      return {
        id: e.id,
        full_name: e.full_name,
        expert_level_id: e.expert_level_id,
        level_name: lvl?.level_name ?? null,
        badge: lvl?.badge ?? null,
        revenue_share: lvl?.revenue_share ?? null,
        pending: sum("pending"),
        available: sum("available"),
        paid: sum("paid"),
        lifetime: myEarnings.reduce((s, x) => s + Number(x.expert_earnings), 0),
        payout_method: payout?.method ?? null,
        payout_status: payout?.status ?? null,
      };
    });
    setRows(combined);

    const links: Record<string, string> = {};
    const { data: photoRows } = await supabase
      .from("expert_documents")
      .select("expert_id, file_path")
      .eq("doc_type", "profile_photo")
      .eq("lifecycle_status", "current")
      .in("expert_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    for (const p of photoRows || []) {
      const { data: signed } = await supabase.storage.from("expert-applications").createSignedUrl(p.file_path, 60 * 60);
      if (signed?.signedUrl) links[p.expert_id] = signed.signedUrl;
    }
    setPhotoLinks(links);

    const { data: settingsRow } = await supabase.from("platform_settings").select("mid_month_payout_day, end_month_payout_day").eq("id", 1).single();
    const today = new Date();
    const mid = settingsRow?.mid_month_payout_day ?? 15;
    const end = settingsRow?.end_month_payout_day ?? 28;
    let next: Date;
    if (today.getDate() < mid) next = new Date(today.getFullYear(), today.getMonth(), mid);
    else if (today.getDate() < end) next = new Date(today.getFullYear(), today.getMonth(), end);
    else next = new Date(today.getFullYear(), today.getMonth() + 1, mid);
    setNextPayoutDate(next);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPayable = rows.reduce((s, r) => s + r.available, 0);
  const eligibleCount = rows.filter((r) => r.available > 0).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem" }}>Expert Payouts ({rows.length})</h1>
          <Link href="/dashboard/admin/payouts" style={{ background: "var(--gold)", color: "var(--ink)", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>
            Review Payout Batches
          </Link>
        </div>

        {nextPayoutDate && (
          <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Next Payout — {nextPayoutDate.toLocaleDateString()}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.2rem" }}>
                Eligible Experts: {eligibleCount} · Total payable: ${totalPayable.toLocaleString()}
              </div>
            </div>
            <Link href="/dashboard/admin/payouts" style={{ background: "var(--ink)", color: "var(--white)", padding: "0.6rem 1.25rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>
              Generate Batch
            </Link>
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading...</p>
        ) : rows.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No approved experts found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/admin/experts/${r.id}`}
                style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem", textDecoration: "none", color: "var(--ink)", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
              >
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", overflow: "hidden", background: "var(--cream-dark)", flexShrink: 0 }}>
                  {photoLinks[r.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoLinks[r.id]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", color: "var(--muted)" }}>
                      {(r.full_name || "?").charAt(0)}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: "150px", flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{r.full_name || "Unnamed"}</div>
                  {r.badge && (
                    <span style={{ fontSize: "0.7rem", background: "var(--gold-light)", padding: "0.1rem 0.5rem", borderRadius: "999px", fontWeight: 600 }}>
                      {r.badge} {r.level_name} · {Math.round((r.revenue_share ?? 0) * 100)}%
                    </span>
                  )}
                </div>
                <MiniStat label="Payable" value={`$${r.available.toLocaleString()}`} color="#1e8449" />
                <MiniStat label="Held" value={`$${r.pending.toLocaleString()}`} color="var(--gold-dark)" />
                <MiniStat label="Paid" value={`$${r.paid.toLocaleString()}`} color="var(--muted)" />
                <MiniStat label="Lifetime" value={`$${r.lifetime.toLocaleString()}`} color="var(--ink)" />
                <div style={{ minWidth: "110px", textAlign: "right" }}>
                  {r.payout_method ? (
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: r.payout_status === "verified" ? "#1e8449" : "var(--gold-dark)", textTransform: "capitalize" }}>
                      {r.payout_method.replace("_", " ")} · {r.payout_status}
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>No payout method</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: "70px" }}>
      <div style={{ fontSize: "0.85rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{label}</div>
    </div>
  );
}