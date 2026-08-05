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
};

type Expert = { id: string; full_name: string | null; email: string | null };

export default function AdminProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [project, setProject] = useState<{ title: string; status: string; description: string | null; expert_id: string | null; client_id: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: proj } = await supabase
      .from("projects")
      .select("title, status, description, expert_id, client_id")
      .eq("id", projectId)
      .single();
    setProject(proj);

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, sender_id, content, file_url, file_name")
      .eq("project_id", projectId)
      .eq("thread_type", "client_admin")
      .order("created_at", { ascending: true });
    setMessages(msgs || []);

    const { data: expertList } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "expert");
    setExperts(expertList || []);
  }, [projectId, supabase]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`admin-project-${projectId}`)
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

  async function sendQuotation() {
    if (!quoteAmount || !userId) return;
    await supabase.from("quotations").insert({
      project_id: projectId,
      amount: parseFloat(quoteAmount),
      description: quoteDesc || null,
      created_by: userId,
    });
    await supabase.from("projects").update({ status: "in_review" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "in_review" } : prev));
    setQuoteAmount("");
    setQuoteDesc("");
    alert("Quotation sent to client.");
  }

  async function assignExpert() {
    if (!selectedExpert) return;
    await supabase.from("projects").update({ expert_id: selectedExpert, status: "assigned" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, expert_id: selectedExpert, status: "assigned" } : prev));
    alert("Expert assigned.");
  }

  async function markQaReview() {
    await supabase.from("projects").update({ status: "qa_review" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "qa_review" } : prev));
  }

  async function markDelivered() {
    await supabase.from("projects").update({ status: "delivered" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "delivered" } : prev));
  }

  if (!project) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", marginBottom: "0.25rem" }}>
            {project.title}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Status: <strong style={{ textTransform: "capitalize" }}>{project.status.replace("_", " ")}</strong>
          </p>

          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
              Chat with Client
            </div>
            <div style={{ padding: "1.5rem", maxHeight: "380px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {messages.length === 0 && (
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>No messages yet.</p>
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
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Reply to client..."
                style={{ flex: 1, padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.9rem" }}
              />
              <button type="submit" style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
                Send
              </button>
            </form>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Send Quotation</div>
            <input
              type="number"
              placeholder="Amount (USD)"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.5rem" }}
            />
            <textarea
              placeholder="Notes (optional)"
              value={quoteDesc}
              onChange={(e) => setQuoteDesc(e.target.value)}
              rows={2}
              style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.5rem", resize: "vertical" }}
            />
            <button
              onClick={sendQuotation}
              style={{ width: "100%", background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
            >
              Send Quotation
            </button>
          </div>

          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Assign Expert</div>
            <select
              value={selectedExpert}
              onChange={(e) => setSelectedExpert(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.5rem" }}
            >
              <option value="">Select an expert...</option>
              {experts.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.full_name || ex.email}</option>
              ))}
            </select>
            <button
              onClick={assignExpert}
              style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
            >
              Assign
            </button>
            {project.expert_id && (
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                Currently assigned to: {experts.find((e) => e.id === project.expert_id)?.full_name || "Expert"}
              </p>
            )}
          </div>

          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Workflow Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button onClick={markQaReview} style={actionBtnStyle}>Mark: In QA Review</button>
              <button onClick={markDelivered} style={actionBtnStyle}>Mark: Delivered to Client</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: "var(--cream-dark)",
  border: "1px solid var(--border)",
  padding: "0.55rem",
  borderRadius: "6px",
  fontSize: "0.8rem",
  cursor: "pointer",
  textAlign: "left",
};
