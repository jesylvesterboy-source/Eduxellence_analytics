"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

type Quotation = {
  id: string;
  amount: number;
  description: string | null;
  status: string;
};

export default function ClientProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [project, setProject] = useState<{ title: string; status: string; description: string | null } | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
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
      .select("title, status, description")
      .eq("id", projectId)
      .single();
    setProject(proj);

    const { data: quote } = await supabase
      .from("quotations")
      .select("id, amount, description, status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setQuotation(quote);

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, sender_id, content, file_url, file_name, created_at")
      .eq("project_id", projectId)
      .eq("thread_type", "client_admin")
      .order("created_at", { ascending: true });
    setMessages(msgs || []);
  }, [projectId, supabase]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`project-${projectId}-messages`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const m = payload.new as Message & { thread_type: string };
          if (m.thread_type === "client_admin") {
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
      thread_type: "client_admin",
      sender_id: userId,
      content,
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const filePath = `${projectId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(filePath, file);

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
      thread_type: "client_admin",
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
    });

    setUploading(false);
    e.target.value = "";
  }

  async function approveQuotation() {
    if (!quotation) return;
    await supabase.from("quotations").update({ status: "approved", responded_at: new Date().toISOString() }).eq("id", quotation.id);
    setQuotation({ ...quotation, status: "approved" });
  }

  async function rejectQuotation() {
    if (!quotation) return;
    await supabase.from("quotations").update({ status: "rejected", responded_at: new Date().toISOString() }).eq("id", quotation.id);
    setQuotation({ ...quotation, status: "rejected" });
  }

  async function approveDelivery() {
    await supabase
      .from("projects")
      .update({ status: "approved" })
      .eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "approved" } : prev));
  }

  if (!project) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.25rem" }}>
          {project.title}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          Status: <strong style={{ textTransform: "capitalize" }}>{project.status.replace("_", " ")}</strong>
        </p>

        {quotation && quotation.status === "pending" && (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Quotation Received: ${quotation.amount}</div>
            {quotation.description && <p style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>{quotation.description}</p>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={approveQuotation} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
                Approve
              </button>
              <button onClick={rejectQuotation} style={{ background: "transparent", border: "1px solid var(--ink)", padding: "0.5rem 1.25rem", borderRadius: "6px", cursor: "pointer" }}>
                Decline
              </button>
            </div>
          </div>
        )}

        {project.status === "delivered" && (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Your deliverable is ready for review.</div>
            <button onClick={approveDelivery} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
              Approve Completed Work
            </button>
          </div>
        )}

        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
            Chat with Eduxellence Team
          </div>

          <div style={{ padding: "1.5rem", maxHeight: "420px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {messages.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
                No messages yet. Say hello to get started.
              </p>
            )}
            {messages.map((m) => {
              const isMine = m.sender_id === userId;
              return (
                <div key={m.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                  <div
                    style={{
                      background: isMine ? "var(--gold)" : "var(--cream-dark)",
                      color: "var(--ink)",
                      padding: "0.6rem 0.9rem",
                      borderRadius: "10px",
                      fontSize: "0.9rem",
                    }}
                  >
                    {m.content && <p>{m.content}</p>}
                    {m.file_url && (
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "underline" }}>
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
              placeholder={uploading ? "Uploading file..." : "Type a message..."}
              disabled={uploading}
              style={{ flex: 1, padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.9rem" }}
            />
            <button
              type="submit"
              disabled={uploading}
              style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
