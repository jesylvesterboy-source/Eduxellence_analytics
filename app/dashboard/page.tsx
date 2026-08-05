import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, email")
    .eq("id", user.id)
    .single();

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem" }}>
              Welcome, {profile?.full_name || user.email}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Role: <strong style={{ textTransform: "capitalize" }}>{profile?.role || "unknown"}</strong>
            </p>
          </div>
          <LogoutButton />
        </div>

        <div
          style={{
            background: "var(--white)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "2rem",
          }}
        >
          {profile?.role === "client" && (
            <p>Client dashboard coming next: your projects, chat with Admin, quotations, and deliverables will appear here.</p>
          )}
          {profile?.role === "expert" && (
            <p>Expert dashboard coming next: your assigned projects, instructions from Admin, and upload tools will appear here.</p>
          )}
          {profile?.role === "admin" && (
            <p>Admin dashboard coming next: all clients, all experts, project assignment, and payment management will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
