"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Expert = {
  id: string;
  full_name: string | null;
  email: string | null;
  expertise: string[] | null;
  expert_level_id: number | null;
};

type Level = { id: number; level_name: string; badge: string };

export default function AdminExpertsDirectoryPage() {
  const supabase = createClient();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [levels, setLevels] = useState<Record<number, Level>>({});
  const [photoLinks, setPhotoLinks] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, expertise, expert_level_id")
      .eq("role", "expert")
      .eq("application_status", "approved")
      .order("full_name", { ascending: true });

    const rows = data || [];
    setExperts(rows);

    const { data: levelRows } = await supabase.from("expert_levels").select("id, level_name, badge");
    const levelMap: Record<number, Level> = {};
    (levelRows || []).forEach((l) => (levelMap[l.id] = l));
    setLevels(levelMap);

    // Fetch profile photos from expert_documents
    const ids = rows.map((r) => r.id);
    const { data: photoRows } = await supabase
      .from("expert_documents")
      .select("expert_id, file_path")
      .eq("doc_type", "profile_photo")
      .eq("lifecycle_status", "current")
      .in("expert_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const links: Record<string, string> = {};
    for (const p of photoRows || []) {
      const { data: signed } = await supabase.storage.from("expert-applications").createSignedUrl(p.file_path, 60 * 60);
      if (signed?.signedUrl) links[p.expert_id] = signed.signedUrl;
    }
    setPhotoLinks(links);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = experts.filter((e) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      e.full_name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.expertise?.some((x) => x.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem" }}>
            Experts ({filtered.length})
          </h1>
          <Link
            href="/dashboard/admin/expert-applications"
            style={{ background: "var(--gold)", color: "var(--ink)", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}
          >
            Pending Applications
          </Link>
        </div>

        <input
          placeholder="Search by name, email, or expertise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "1.5rem", fontSize: "0.9rem" }}
        />

        {filtered.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No approved experts found.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {filtered.map((e) => {
              const level = e.expert_level_id ? levels[e.expert_level_id] : null;
              return (
                <Link
                  key={e.id}
                  href={`/dashboard/admin/experts/${e.id}`}
                  style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.1rem", textDecoration: "none", color: "var(--ink)", display: "flex", gap: "0.9rem", alignItems: "center" }}
                >
                  <div style={{ width: "52px", height: "52px", borderRadius: "50%", overflow: "hidden", background: "var(--cream-dark)", flexShrink: 0 }}>
                    {photoLinks[e.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoLinks[e.id]} alt={e.full_name || "Expert"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "var(--muted)" }}>
                        {(e.full_name || "?").charAt(0)}
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {e.full_name || "Unnamed"}
                    </div>
                    {level && (
                      <span style={{ fontSize: "0.7rem", background: "var(--gold-light)", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 600 }}>
                        {level.badge} {level.level_name}
                      </span>
                    )}
                    {e.expertise && e.expertise.length > 0 && (
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.expertise.join(", ")}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}