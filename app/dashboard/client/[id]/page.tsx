"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";
import PaymentMethodSelector from "@/components/payments/PaymentMethodSelector";

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
  usd_to_ngn_rate: number | null;
};

type RevisionRequest = {
  id: string;
  notes: string;
  status: string;
  created_at: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  status: string;
};

export default function ClientProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [project, setProject] = useState<{ title: string; status: string; description: string | null; expert_id: string | null } | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileLinks, setFileLinks] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([]);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [ratingInput, setRatingInput] = useState(0);
  const [commentInput, setCommentInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonePayments, setMilestonePayments] = useState<Record<string, { status: string; verification_status: string; transaction_reference: string | null }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ADDED: Cancellation request state
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelExplanation, setCancelExplanation] = useState("");
  const [workCommenced, setWorkCommenced] = useState(false);
  const [cancellationRequest, setCancellationRequest] = useState<{ id: string; status: string; reason: string; created_at: string; admin_notes: string | null } | null>(null);
  const [resolutions, setResolutions] = useState<{ refund_amount: number; expert_compensation_amount: number; resolution_type: string }[]>([]);

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

    const { data: myProfile } = await supabase.from("profiles").select("email, role").eq("id", user.id).single();
    setUserEmail(myProfile?.email || user.email || "");
    setIsAdmin(myProfile?.role === "admin");

    const { data: proj } = await supabase
      .from("projects")
      .select("title, status, description, expert_id")
      .eq("id", projectId)
      .single();
    setProject(proj);

    // FIXED: Removed .eq("status", "approved") to fetch the latest quotation regardless of status
    const { data: quote } = await supabase
      .from("quotations")
      .select("id, amount, description, status, usd_to_ngn_rate")
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
    if (msgs) resolveFileLinks(msgs);

    const { data: revisions } = await supabase
      .from("revision_requests")
      .select("id, notes, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setRevisionRequests(revisions || []);

    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id, rating, comment")
      .eq("project_id", projectId)
      .maybeSingle();
    setReview(existingReview);

    const { data: milestoneRows } = await supabase
      .from("milestones")
      .select("id, title, description, amount, due_date, status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    setMilestones(milestoneRows || []);

    const { data: mPayments } = await supabase
      .from("payments")
      .select("milestone_id, status, verification_status, transaction_reference")
      .eq("project_id", projectId)
      .not("milestone_id", "is", null);
    const map: Record<string, { status: string; verification_status: string; transaction_reference: string | null }> = {};
    (mPayments || []).forEach((p) => {
      if (p.milestone_id) map[p.milestone_id] = { status: p.status, verification_status: p.verification_status, transaction_reference: p.transaction_reference };
    });
    setMilestonePayments(map);

    // ADDED: Load cancellation request data
    const { data: cancelReq } = await supabase
      .from("cancellation_requests")
      .select("id, status, reason, created_at, admin_notes")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setCancellationRequest(cancelReq);

    if (cancelReq && ["approved", "partially_approved"].includes(cancelReq.status)) {
      const { data: res } = await supabase
        .from("cancellation_resolutions")
        .select("refund_amount, expert_compensation_amount, resolution_type")
        .eq("cancellation_request_id", cancelReq.id);
      setResolutions(res || []);
    }
  }, [projectId, supabase, resolveFileLinks]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotations", filter: `project_id=eq.${projectId}` },
        () => {
          loadData();
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

    const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, file);
    if (uploadError) {
      alert("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    await supabase.from("messages").insert({
      project_id: projectId,
      thread_type: "client_admin",
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
    await supabase.from("projects").update({ status: "approved" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "approved" } : prev));

    const notifRows: { user_id: string; title: string; body: string; link: string }[] = [];

    if (project?.expert_id) {
      notifRows.push({
        user_id: project.expert_id,
        title: "Work Approved",
        body: `The client approved your work on "${project.title}". Payment release is now in progress.`,
        link: `/dashboard/expert/${projectId}`,
      });
    }

    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    admins?.forEach((a) =>
      notifRows.push({
        user_id: a.id,
        title: "Client Approved Work",
        body: `The client approved "${project?.title ?? "a project"}". Ready to release payment.`,
        link: `/dashboard/admin/${projectId}`,
      })
    );

    if (notifRows.length > 0) {
      await supabase.from("notifications").insert(notifRows);
    }
  }

  async function requestRevision() {
    if (!revisionNotes.trim() || !userId) return;
    await supabase.from("revision_requests").insert({
      project_id: projectId,
      requested_by: userId,
      notes: revisionNotes,
      status: "open",
    });
    await supabase.from("projects").update({ status: "revision" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "revision" } : prev));

    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    const notifRows: { user_id: string; title: string; body: string; link: string }[] = [];

    if (admins) {
      admins.forEach((a) =>
        notifRows.push({
          user_id: a.id,
          title: "Revision Requested",
          body: `A revision was requested for "${project?.title ?? "a project"}".`,
          link: `/dashboard/admin/${projectId}`,
        })
      );
    }

    if (project?.expert_id) {
      notifRows.push({
        user_id: project.expert_id,
        title: "Revision Requested (heads up)",
        body: `The client requested a revision on "${project.title}". Admin will share the details shortly.`,
        link: `/dashboard/expert/${projectId}`,
      });
    }

    if (notifRows.length > 0) {
      await supabase.from("notifications").insert(notifRows);
    }

    setRevisionNotes("");
    setShowRevisionForm(false);
    loadData();
  }

  async function submitReview() {
    if (!userId || ratingInput < 1) return;
    setSubmittingReview(true);
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        project_id: projectId,
        client_id: userId,
        rating: ratingInput,
        comment: commentInput.trim() || null,
        client_consent: consent,
      })
      .select("id, rating, comment")
      .single();
    setSubmittingReview(false);
    if (error) {
      alert("Could not submit review: " + error.message);
      return;
    }
    setReview(data);
  }

  // ADDED: Submit cancellation request function
  async function submitCancellationRequest() {
    if (!cancelReason) {
      alert("Please select a reason.");
      return;
    }
    const { error } = await supabase.rpc("fn_request_cancellation", {
      p_project_id: projectId,
      p_reason: cancelReason,
      p_explanation: cancelExplanation || null,
      p_work_commenced: workCommenced,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setShowCancelForm(false);
    loadData();
  }

  if (!project) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="afterInteractive" />
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/client" backLabel="Back to Dashboard" />

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.25rem" }}>
          {project.title}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          Status: <strong style={{ textTransform: "capitalize" }}>{project.status.replace("_", " ")}</strong>
        </p>

        {/* ADDED: Cancellation request UI - Active request status */}
        {cancellationRequest && !["rejected"].includes(cancellationRequest.status) && (
          <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Cancellation Request</div>
            <p style={{ fontSize: "0.85rem" }}>Status: <strong style={{ textTransform: "capitalize" }}>{cancellationRequest.status.replace("_", " ")}</strong></p>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Reason: {cancellationRequest.reason}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Submitted {new Date(cancellationRequest.created_at).toLocaleString()}</p>
            {resolutions.length > 0 && (
              <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>Resolution</div>
                {resolutions.map((r, i) => (
                  <p key={i} style={{ fontSize: "0.8rem" }}>
                    {r.resolution_type.replace("_", " ")} — Refund: ${r.refund_amount} {r.expert_compensation_amount > 0 && `· Expert compensation: $${r.expert_compensation_amount}`}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADDED: Cancellation request UI - Rejected status */}
        {cancellationRequest?.status === "rejected" && (
          <div style={{ background: "var(--white)", border: "1px solid #c0392b", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, color: "#c0392b" }}>Cancellation Request Declined</div>
            {cancellationRequest.admin_notes && <p style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>{cancellationRequest.admin_notes}</p>}
          </div>
        )}

        {/* ADDED: Cancellation request UI - Request form */}
        {!cancellationRequest && project.status !== "completed" && project.status !== "cancelled" && (
          <div style={{ marginBottom: "1.5rem" }}>
            {!showCancelForm ? (
              <button onClick={() => setShowCancelForm(true)} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "0.5rem 1.1rem", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
                Request Project Cancellation
              </button>
            ) : (
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Request Cancellation</div>
                <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.6rem" }}>
                  <option value="">Select a reason...</option>
                  <option>No longer need the service</option>
                  <option>Project requirements changed</option>
                  <option>Budget changed</option>
                  <option>Deadline changed</option>
                  <option>Expert availability issue</option>
                  <option>Quality concerns</option>
                  <option>Communication issue</option>
                  <option>Project not progressing as expected</option>
                  <option>Duplicate request</option>
                  <option>Other</option>
                </select>
                <textarea placeholder="Optional explanation" value={cancelExplanation} onChange={(e) => setCancelExplanation(e.target.value)} rows={3} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.6rem", resize: "vertical" }} />
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                  <input type="checkbox" checked={workCommenced} onChange={(e) => setWorkCommenced(e.target.checked)} /> Work has already commenced on this project
                </label>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button onClick={submitCancellationRequest} style={{ background: "#c0392b", color: "white", border: "none", padding: "0.5rem 1.1rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>Submit Request</button>
                  <button onClick={() => setShowCancelForm(false)} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.5rem 1.1rem", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

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

        {quotation && quotation.status === "approved" && (
          <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem", textAlign: "center" }}>
            <a href={`/dashboard/client/${projectId}/payment`} style={{ display: "inline-block", background: "var(--gold)", color: "var(--ink)", padding: "0.75rem 1.5rem", borderRadius: "6px", fontWeight: 600, textDecoration: "none" }}>
              Proceed to Payment
            </a>
          </div>
        )}

        {milestones.length > 0 && (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Project Milestones</div>
            {milestones.map((m) => {
              const payment = milestonePayments[m.id];
              return (
                <div key={m.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <strong>{m.title}</strong>
                    <span>${m.amount}</span>
                  </div>
                  {m.description && <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.3rem 0" }}>{m.description}</p>}
                  <div style={{ fontSize: "0.75rem", color: "var(--gold-dark)", fontWeight: 600, textTransform: "capitalize" }}>{m.status.replace("_", " ")}</div>

                  <div style={{ marginTop: "0.75rem" }}>
                    <PaymentMethodSelector
                      amountUsd={m.amount}
                      ngnRate={quotation?.usd_to_ngn_rate ?? null}
                      userEmail={userEmail}
                      bankReference={`EDUX-MS-${m.id}`}
                      existingPayment={milestonePayments[m.id] || null}
                      onSubmitPayment={async (method, bankCurrency, reference, proofFile) => {
                        let proofUrl: string | null = null;
                        if (proofFile) {
                          const filePath = `${projectId}/milestone-proof-${Date.now()}-${proofFile.name}`;
                          const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, proofFile);
                          if (!uploadError) proofUrl = filePath;
                        }
                        const { error } = await supabase.rpc("fn_confirm_milestone_payment", {
                          p_milestone_id: m.id,
                          p_method: method,
                          p_bank_currency: bankCurrency,
                          p_reference: reference,
                          p_proof_url: proofUrl,
                        });
                        if (error) return { error: error.message };
                        loadData();
                        return {};
                      }}
                    />
                  </div>
                  {payment && (
                    <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.4rem" }}>
                      Payment {payment.status} — {payment.verification_status}
                      {payment.transaction_reference && ` · Ref: ${payment.transaction_reference}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {project.status === "delivered" && (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Your deliverable is ready for review.</div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={approveDelivery} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
                Approve Completed Work
              </button>
              <button
                onClick={() => setShowRevisionForm((v) => !v)}
                style={{ background: "transparent", border: "1px solid var(--ink)", padding: "0.5rem 1.25rem", borderRadius: "6px", cursor: "pointer" }}
              >
                Request Revision
              </button>
            </div>

            {showRevisionForm && (
              <div style={{ marginTop: "0.9rem" }}>
                <textarea
                  placeholder="What needs to change?"
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.5rem", resize: "vertical" }}
                />
                <button
                  onClick={requestRevision}
                  disabled={!revisionNotes.trim()}
                  style={{ background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: revisionNotes.trim() ? "pointer" : "not-allowed", opacity: revisionNotes.trim() ? 1 : 0.5 }}
                >
                  Submit Revision Request
                </button>
              </div>
            )}
          </div>
        )}

        {project.status === "revision" && revisionRequests.length > 0 && (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Revision Requested</div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{revisionRequests[0].notes}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>
              Submitted {new Date(revisionRequests[0].created_at).toLocaleString()} — status: {revisionRequests[0].status}
            </p>
          </div>
        )}

        {project.status === "completed" && (
          <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Project Completed 🎉</div>

            {review ? (
              <div>
                <p style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  You rated this project: {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                </p>
                {review.comment && <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{review.comment}</p>}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.85rem", marginBottom: "0.6rem" }}>How was your experience with Eduxellence?</p>
                <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.6rem", fontSize: "1.5rem" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRatingInput(n)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: n <= ratingInput ? "var(--gold)" : "var(--border)", padding: 0, lineHeight: 1 }}
                      aria-label={`Rate ${n} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Leave a comment (optional)"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.5rem", resize: "vertical" }}
                />
                <div style={{ marginBottom: "0.75rem" }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    May Eduxellence use your feedback as a public testimonial?
                  </p>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input type="radio" name="consent" checked={consent === true} onChange={() => setConsent(true)} /> Yes, you may publish it
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input type="radio" name="consent" checked={consent === false} onChange={() => setConsent(false)} /> No, keep it private
                    </label>
                  </div>
                </div>
                <button
                  onClick={submitReview}
                  disabled={ratingInput < 1 || submittingReview || consent === null}
                  style={{
                    background: ratingInput < 1 || consent === null ? "var(--border)" : "var(--gold)",
                    color: "var(--ink)",
                    border: "none",
                    padding: "0.5rem 1.25rem",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: ratingInput < 1 || consent === null ? "not-allowed" : "pointer",
                  }}
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            )}
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
              const canDelete = isMine || isAdmin;
              return (
                <div key={m.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                  <div style={{ background: isMine ? "var(--gold)" : "var(--cream-dark)", color: "var(--ink)", padding: "0.6rem 0.9rem", borderRadius: "10px", fontSize: "0.9rem", position: "relative" }}>
                    {m.content && <p>{m.content}</p>}
                    {m.file_url && (
                      <a href={fileLinks[m.id] || "#"} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "underline" }}>
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