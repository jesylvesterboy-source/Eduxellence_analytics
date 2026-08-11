"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell() {
  const supabase = createClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, link, action_url, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setNotifications(data || []);
  }, [supabase]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAllRead() {
    if (!userId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleClick(n: Notification) {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    const target = n.action_url || n.link;
    if (target) router.push(target);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          position: "relative",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "0.5rem 0.75rem",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              background: "#c0392b",
              color: "#fff",
              borderRadius: "999px",
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "0.1rem 0.4rem",
              minWidth: "18px",
              textAlign: "center",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "320px",
            maxHeight: "400px",
            overflowY: "auto",
            background: "var(--white)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 50,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
            <strong style={{ fontSize: "0.85rem" }}>Notifications</strong>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: "none", border: "none", color: "var(--gold-dark)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  background: n.is_read ? "transparent" : "var(--gold-light)",
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.15rem" }}>{n.body}</div>}
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}