"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

export default function ConsultationRoom({
  projectId,
  consultationId,
  currentUserId,
  isClosed,
  onClose,
  onCloseConsultation,
}: {
  projectId: string;
  consultationId: string;
  currentUserId: string;
  isClosed: boolean;
  onClose: () => void;
  onCloseConsultation: () => void;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [clarified, setClarified] = useState<boolean | null>(null);
  const [summary, setSummary] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`consultation-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const m = payload.new as any;
          if (m.thread_type === "client_expert") {
            setMessages((prev) => [...prev, m]);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, file_url, file_name, created_at")
      .eq("project_id", projectId)
      .eq("thread_type", "client_expert")
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }

  async function sendMessage() {
    if (!text.trim() && !file) return;
    setSending(true);

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (file) {
      const path = `${projectId}/consultation-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, file);
      if (!uploadError) {
        fileUrl = path;
        fileName = file.name;
        await supabase.from("project_files").insert({
          project_id: projectId,
          uploaded_by: currentUserId,
          file_url: path,
          file_name: file.name,
          file_type: file.type,
        });
      }
    }

    await supabase.from("messages").insert({
      project_id: projectId,
      thread_type: "client_expert",
      sender_id: currentUserId,
      content: text.trim() || null,
      file_url: fileUrl,
      file_name: fileName,
    });

    setText("");
    setFile(null);
    setSending(false);
  }

  async function submitClose() {
    const res = await fetch(`/api/consultations/${consultationId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirements_clarified: clarified, summary: summary || null }),
    });
    if (res.ok) {
      onCloseConsultation();
    } else {
      alert((await res.json()).error ?? "Could not close consultation");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "560px", height: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Project Consultation</strong>
            <p style={{ fontSize: "0.75rem", color: "#64748B" }}>Secure communication between the client and assigned expert.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender_id === currentUserId ? "flex-end" : "flex-start",
                background: m.sender_id === currentUserId ? "#C8960C" : "#F1F5F9",
                color: m.sender_id === currentUserId ? "#111" : "#0F172A",
                padding: "0.6rem 0.9rem",
                borderRadius: "12px",
                maxWidth: "75%",
                fontSize: "0.9rem",
              }}
            >
              {m.content && <p>{m.content}</p>}
              {m.file_url && (
                <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", textDecoration: "underline" }}>
                  📎 {m.file_name || "Attachment"}
                </a>
              )}
              <div style={{ fontSize: "0.65rem", opacity: 0.6, marginTop: "0.2rem" }}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {isClosed ? (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #e2e8f0", textAlign: "center", color: "#64748B", fontSize: "0.85rem" }}>
            This consultation is closed. Viewing history only.
          </div>
        ) : showCloseForm ? (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>Were the project requirements clarified?</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => setClarified(true)} style={{ ...(clarified === true ? { background: "#16A34A", color: "#fff" } : {}), padding: "0.4rem 0.9rem", borderRadius: "6px", border: "1px solid #e2e8f0", cursor: "pointer" }}>Yes</button>
              <button onClick={() => setClarified(false)} style={{ ...(clarified === false ? { background: "#DC2626", color: "#fff" } : {}), padding: "0.4rem 0.9rem", borderRadius: "6px", border: "1px solid #e2e8f0", cursor: "pointer" }}>No</button>
            </div>
            <textarea placeholder="Optional summary..." value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={submitClose} style={{ background: "#C8960C", color: "#111", border: "none", padding: "0.6rem 1rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>Confirm Close</button>
              <button onClick={() => setShowCloseForm(false)} style={{ background: "transparent", border: "1px solid #e2e8f0", padding: "0.6rem 1rem", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                style={{ flex: 1, padding: "0.6rem 0.9rem", borderRadius: "20px", border: "1px solid #e2e8f0" }}
              />
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ width: "110px", fontSize: "0.75rem" }} />
              <button onClick={sendMessage} disabled={sending} style={{ background: "#C8960C", color: "#111", border: "none", padding: "0 1.1rem", borderRadius: "20px", fontWeight: 600, cursor: "pointer" }}>
                Send
              </button>
            </div>
            <button onClick={() => setShowCloseForm(true)} style={{ background: "none", border: "none", color: "#64748B", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline" }}>
              Mark Consultation Complete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}