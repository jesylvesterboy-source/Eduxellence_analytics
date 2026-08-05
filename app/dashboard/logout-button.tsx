"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "0.5rem 1rem",
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "var(--muted)",
        cursor: "pointer",
      }}
    >
      Log Out
    </button>
  );
}
