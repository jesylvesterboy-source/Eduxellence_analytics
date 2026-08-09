"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Message = {
  id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
};

type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function ExpertProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [project, setProject] = useState<{ title: string; status: string; description: string | null; deadline: string | null; client_id: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileLinks, setFileLinks] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeRevision, setActiveRevision] = useState<{ id: string; notes: string } | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const resolveFileLinks = useCallback(
    async (msgs: Message[]) => {
      const links: Record<string, string> = {};
      for (const m of msgs) {
        if (m.file_url) {
          const { data } = await supabase.storage.from("project-files").createSignedUrl(m.file_url, 60 * 60);
          if (data?.signedUrl) links[m.id] = data.signedUrl;
        }
      }
      setFileLinks((prev) => ({ ...prev, ...links }));
    },
    [supabase]
  );

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    setIsAdmin(myProfile?.role === "admin");

    const { data: proj } = await supabase
      .from("projects")
      .select("title, status, description, deadline, client_id")
      .eq("id", projectId)
      .single();
    setProject(proj);

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, sender_id, content, file_url, file_name")
      .eq("project_id", projectId)
      .eq("thread_type", "admin_expert")
      .order("created_at", { ascending: true });
    setMessages(msgs || []);
    if (msgs) resolveFileLinks(msgs);

    if (proj?.status === "revision") {
      const { data: rev } = await supabase
        .from("revision_requests")
        .select("id, notes")
        .eq("project_id", projectId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveRevision(rev);
    } else {
      setActiveRevision(null);
    }

    if (proj?.status === "completed") {
      const { data: reviewData } = await supabase
        .from("reviews")
        .select("rating, comment, created_at")
        .eq("project_id", projectId)
        .maybeSingle();
      setReview(reviewData);
    }
  }, [projectId, supabase, resolveFileLinks]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`expert-project-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const m = payload.new as Message & { thread_type: string };
          if (m.thread_type === "admin_expert") {
            setMessages((prev) => [...prev, m]);
            if (m.file_url) resolveFileLinks([m]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as Message).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, loadData, resolveFileLinks, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;
    const content = newMessage;
    setNewMessage("");
    await supabase.from("messages").insert({
      project_id: projectId,
      thread_type: "admin_expert",
      sender_id: userId,
      content,
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const filePath = `${projectId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, file);
    if (uploadError) {
      alert("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    await supabase.from("messages").insert({
      project_id: projectId,
      thread_type: "admin_expert",
      sender_id: userId,
      content: null,
      file_url: filePath,
      file_name: file.name,
    });

    await supabase.from("project_files").insert({
      project_id: projectId,
      uploaded_by: userId,
      file_url: filePath,
      file_name: file.name,
      file_type: file.type,
      is_deliverable: true,
    });

    setUploading(false);
    e.target.value = "";
  }

  async function deleteMessage(m: Message) {
    if (!confirm(m.file_url ? "Delete this file permanently?" : "Delete this message?")) return;

    if (m.file_url) {
      await supabase.storage.from("project-files").remove([m.file_url]);
      await supabase.from("project_files").delete().eq("file_url", m.file_url);
    }
    await supabase.from("messages").delete().eq("id", m.id);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
  }

  async function startWork() {
    await supabase.from("projects").update({ status: "in_progress" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "in_progress" } : prev));

    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    const notifRows: { user_id: string; title: string; body: string; link: string }[] = [];

    if (project?.client_id) {
      notifRows.push({
        user_id: project.client_id,
        title: "Work Started",
        body: `Work has begun on your project "${project.title}".`,
        link: `/dashboard/client/${projectId}`,
      });
    }
    admins?.forEach((a) =>
      notifRows.push({
        user_id: a.id,
        title: "Expert Started Work",
        body: `The assigned expert has started work on "${project?.title ?? "a project"}".`,
        link: `/dashboard/admin/${projectId}`,
      })
    );

    if (notifRows.length > 0) {
      await supabase.from("notifications").insert(notifRows);
    }
  }

  async function submitForQA() {
    if (activeRevision) {
      await supabase
        .from("revision_requests")
        .update({ expert_submitted_at: new Date().toISOString() })
        .eq("id", activeRevision.id);
    }
    await supabase.from("projects").update({ status: "submitted" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "submitted" } : prev));

    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    if (admins && admins.length > 0) {
      await supabase.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.id,
          title: activeRevision ? "Revision Resubmitted" : "Submitted for QA",
          body: `"${project?.title ?? "A project"}" has been submitted by the expert and is ready for quality review.`,
          link: `/dashboard/admin/${projectId}`,
        }))
      );
    }

    alert("Submitted to Admin for quality review.");
  }

  if (!project) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/expert" backLabel="Back to Dashboard" />

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.25rem" }}>
          {project.title}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Status: <strong style={{ textTransform: "capitalize" }}>{project.status.replace("_", " ")}</strong>
          {project.deadline ? ` · Due ${new Date(project.deadline).toLocaleDateString()}` : ""}
        </p>

        {project.description && (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            <strong>Brief:</strong> {project.description}
          </div>
        )}

        {project.status === "revision" && activeRevision && (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Revision Requested</div>
            <p style={{ fontSize: "0.9rem" }}>{activeRevision.notes}</p>
          </div>
        )}

        {project.status === "completed" && review && (
          <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Client Review</div>
            <p style={{ fontSize: "1.1rem", color: "var(--gold-dark)", marginBottom: "0.4rem" }}>
              {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
            </p>
            {review.comment ? (
              <p style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}>{review.comment}</p>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>No written comment left.</p>
            )}
            <p style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{new Date(review.created_at).toLocaleString()}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {project.status === "assigned" && (
            <button onClick={startWork} style={primaryBtn}>Start Work</button>
          )}
          {(project.status === "in_progress" || project.status === "revision") && (
            <button onClick={submitForQA} style={primaryBtn}>Submit for QA</button>
          )}
        </div>

        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
            Chat with Admin
          </div>
          <div style={{ padding: "1.5rem", maxHeight: "380px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {messages.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
                No messages yet. Admin will share instructions here.
              </p>
            )}
            {messages.map((m) => {
              const isMine = m.sender_id === userId;
              const canDelete = isMine || isAdmin;
              return (
                <div key={m.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                  <div style={{ background: isMine ? "var(--gold)" : "var(--cream-dark)", padding: "0.6rem 0.9rem", borderRadius: "10px", fontSize: "0.9rem" }}>
                    {m.content && <p>{m.content}</p>}
                    {m.file_url && (
                      <a href={fileLinks[m.id] || "#"} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, textDecoration: "underline" }}>
                        File: {m.file_name}
                      </a>
                    )}
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => deleteMessage(m)}
                      style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.7rem", cursor: "pointer", marginTop: "0.2rem", padding: 0 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} style={{ display: "flex", gap: "0.5rem", padding: "1rem", borderTop: "1px solid var(--border)" }}>
            <label style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "0 0.5rem", color: "var(--muted)" }}>
              📎
              <input type="file" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading} />
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={uploading ? "Uploading file..." : "Message Admin..."}
              disabled={uploading}
              style={{ flex: 1, padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.9rem" }}
            />
            <button type="submit" disabled={uploading} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "var(--gold)",
  color: "var(--ink)",
  border: "none",
  padding: "0.65rem 1.5rem",
  borderRadius: "6px",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};