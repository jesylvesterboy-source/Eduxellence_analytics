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

export default function ExpertProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [project, setProject] = useState<{ title: string; status: string; description: string | null; deadline: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: proj } = await supabase
      .from("projects")
      .select("title, status, description, deadline")
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
  }, [projectId, supabase]);

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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, loadData, supabase]);

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

    const { data: urlData } = await supabase.storage
      .from("project-files")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    await supabase.from("messages").insert({
      project_id: projectId,
      thread_type: "admin_expert",
      sender_id: userId,
      content: null,
      file_url: urlData?.signedUrl || filePath,
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

  async function startWork() {
    await supabase.from("projects").update({ status: "in_progress" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "in_progress" } : prev));
  }

  async function submitForQA() {
    await supabase.from("projects").update({ status: "submitted" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "submitted" } : prev));
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
              return (
                <div key={m.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                  <div style={{ background: isMine ? "var(--gold)" : "var(--cream-dark)", padding: "0.6rem 0.9rem", borderRadius: "10px", fontSize: "0.9rem" }}>
                    {m.content && <p>{m.content}</p>}
                    {m.file_url && (
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, textDecoration: "underline" }}>
                        File: {m.file_name}
                      </a>
                    )}
                  </div>
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