"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";
import PaymentPanel from "../_components/payment-panel";

type Message = {
  id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  thread_type: string;
};

type Expert = { id: string; full_name: string | null; email: string | null; revenue_share: number | null };

type Quotation = {
  id: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
};

type RevisionRequest = {
  id: string;
  notes: string;
  status: string;
  created_at: string;
  sent_to_expert_at: string | null;
  expert_submitted_at: string | null;
  resolved_at: string | null;
};

type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
};

type Offer = {
  id: string;
  expert_id: string;
  status: string;
  compensation_amount: number | null;
  offered_at: string;
  responded_at: string | null;
  response_deadline: string | null;
  reminder_sent_at: string | null;
  decline_reason: string | null;
  expert_name: string | null;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  status: string;
};

type MatchResult = {
  expert_id: string;
  full_name: string;
  level_name: string | null;
  avg_rating: number;
  completed_projects: number;
  skills_score: number;
  category_score: number;
  experience_score: number;
  performance_score: number;
  availability_score: number;
  history_score: number;
  total_score: number;
};

export default function AdminProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [project, setProject] = useState<{ title: string; status: string; description: string | null; budget: number | null; expert_id: string | null; client_id: string; promotion_eligible: boolean } | null>(null);
  const [clientMessages, setClientMessages] = useState<Message[]>([]);
  const [expertMessages, setExpertMessages] = useState<Message[]>([]);
  const [fileLinks, setFileLinks] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"client_admin" | "admin_expert">("client_admin");
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState("");
  const [fixedFee, setFixedFee] = useState("");
  const [clientQuotationInput, setClientQuotationInput] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([]);
  const [sendingToExpert, setSendingToExpert] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [milestonePayments, setMilestonePayments] = useState<Record<string, { id: string; status: string; verification_status: string }>>({});
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [skillsCatalog, setSkillsCatalog] = useState<{ id: number; category_id: number; name: string }[]>([]);
  const [reqCategory, setReqCategory] = useState<number | "">("");
  const [reqSkills, setReqSkills] = useState<number[]>([]);
  const [reqExperience, setReqExperience] = useState("");
  const [reqUrgency, setReqUrgency] = useState("");
  const [reqSpecialization, setReqSpecialization] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matching, setMatching] = useState(false);
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

    const { data: proj } = await supabase
      .from("projects")
      .select("title, status, description, budget, expert_id, client_id, promotion_eligible")
      .eq("id", projectId)
      .single();
    setProject(proj);

    const { data: allMsgs } = await supabase
      .from("messages")
      .select("id, sender_id, content, file_url, file_name, thread_type")
      .eq("project_id", projectId)
      .in("thread_type", ["client_admin", "admin_expert"])
      .order("created_at", { ascending: true });

    const cMsgs = (allMsgs || []).filter((m) => m.thread_type === "client_admin");
    const eMsgs = (allMsgs || []).filter((m) => m.thread_type === "admin_expert");
    setClientMessages(cMsgs);
    setExpertMessages(eMsgs);
    if (allMsgs) resolveFileLinks(allMsgs);

    const { data: expertList } = await supabase
      .from("profiles")
      .select("id, full_name, email, expert_levels!profiles_expert_level_id_fkey(revenue_share)")
      .eq("role", "expert")
      .eq("application_status", "approved");
    setExperts(
      (expertList || []).map((e: any) => ({
        id: e.id,
        full_name: e.full_name,
        email: e.email,
        revenue_share: e.expert_levels?.revenue_share ?? null,
      }))
    );

    const { data: quotes } = await supabase
      .from("quotations")
      .select("id, amount, description, status, created_at, responded_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setQuotations(quotes || []);

    const { data: revisions } = await supabase
      .from("revision_requests")
      .select("id, notes, status, created_at, sent_to_expert_at, expert_submitted_at, resolved_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    setRevisionRequests(revisions || []);

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("rating, comment, created_at")
      .eq("project_id", projectId)
      .maybeSingle();
    setReview(reviewData);

    const { data: offerRows } = await supabase
      .from("project_offers")
      .select("id, expert_id, status, compensation_amount, offered_at, responded_at, response_deadline, reminder_sent_at, decline_reason, profiles!project_offers_expert_id_fkey(full_name)")
      .eq("project_id", projectId)
      .order("offered_at", { ascending: false });
    setOffers((offerRows || []).map((o: any) => ({ ...o, expert_name: o.profiles?.full_name ?? null })));

    const { data: milestoneRows } = await supabase
      .from("milestones")
      .select("id, title, description, amount, due_date, status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    setMilestones(milestoneRows || []);

    const { data: milestonePaymentRows } = await supabase
      .from("payments")
      .select("id, milestone_id, status, verification_status")
      .eq("project_id", projectId)
      .not("milestone_id", "is", null);
    const paymentMap: Record<string, { id: string; status: string; verification_status: string }> = {};
    (milestonePaymentRows || []).forEach((p) => {
      if (p.milestone_id) paymentMap[p.milestone_id] = { id: p.id, status: p.status, verification_status: p.verification_status };
    });
    setMilestonePayments(paymentMap);

    const { data: cats } = await supabase.from("solution_categories").select("id, name").order("display_order");
    setCategories(cats || []);
    const { data: skl } = await supabase.from("solution_skills").select("id, category_id, name");
    setSkillsCatalog(skl || []);

    const { data: projFull } = await supabase
      .from("projects")
      .select("required_category_id, required_skill_ids, required_experience_level, required_availability_urgency, specialization_notes")
      .eq("id", projectId)
      .single();
    if (projFull) {
      setReqCategory(projFull.required_category_id || "");
      setReqSkills(projFull.required_skill_ids || []);
      setReqExperience(projFull.required_experience_level || "");
      setReqUrgency(projFull.required_availability_urgency || "");
      setReqSpecialization(projFull.specialization_notes || "");
    }
  }, [projectId, supabase, resolveFileLinks]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`admin-project-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const m = payload.new as Message;
          if (m.thread_type === "client_admin") {
            setClientMessages((prev) => [...prev, m]);
          } else if (m.thread_type === "admin_expert") {
            setExpertMessages((prev) => [...prev, m]);
          }
          if (m.file_url) resolveFileLinks([m]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const deletedId = (payload.old as Message).id;
          setClientMessages((prev) => prev.filter((m) => m.id !== deletedId));
          setExpertMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotations", filter: `project_id=eq.${projectId}` },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "revision_requests", filter: `project_id=eq.${projectId}` },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, loadData, resolveFileLinks, supabase]);

  const activeMessages = activeTab === "client_admin" ? clientMessages : expertMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;
    const content = newMessage;
    setNewMessage("");
    await supabase.from("messages").insert({
      project_id: projectId,
      thread_type: activeTab,
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
      thread_type: activeTab,
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
    if (m.thread_type === "client_admin") {
      setClientMessages((prev) => prev.filter((x) => x.id !== m.id));
    } else {
      setExpertMessages((prev) => prev.filter((x) => x.id !== m.id));
    }
  }

  async function sendQuotation() {
    if (!quoteAmount || !userId) return;

    const { data: settings } = await supabase
      .from("platform_settings")
      .select("usd_to_ngn_rate")
      .eq("id", 1)
      .single();

    await supabase.from("quotations").insert({
      project_id: projectId,
      amount: parseFloat(quoteAmount),
      description: quoteDesc || null,
      created_by: userId,
      usd_to_ngn_rate: settings?.usd_to_ngn_rate ?? null,
    });
    await supabase.from("projects").update({ status: "in_review" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "in_review" } : prev));
    setQuoteAmount("");
    setQuoteDesc("");
    loadData();
  }

  async function offerToExpert() {
    if (!selectedExpert || !userId) return;

    const { error } = await supabase.rpc("fn_offer_project", {
      p_project_id: projectId,
      p_expert_id: selectedExpert,
      p_admin_id: userId,
      p_fixed_fee: fixedFee ? parseFloat(fixedFee) : null,
    });

    if (error) {
      alert("Could not send offer: " + error.message);
      return;
    }

    setProject((prev) => (prev ? { ...prev, expert_id: selectedExpert, status: "offered" } : prev));
    setFixedFee("");
    loadData();
    alert("Offer sent to expert.");

    const { data: expertProfile } = await supabase.from("profiles").select("email").eq("id", selectedExpert).single();
    if (expertProfile?.email) {
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: expertProfile.email,
          subject: "New Project Offer — Eduxellence",
          html: `<p>You have a new project offer for <strong>${project?.title ?? "a project"}</strong>. Log in to your dashboard to review the compensation and accept or decline.</p>`,
        }),
      });
    }
  }

  async function sendRevisionToExpert() {
    const active = revisionRequests.find((r) => r.status === "open");
    if (!active || !project?.expert_id || !userId) return;

    setSendingToExpert(true);

    await supabase
      .from("revision_requests")
      .update({ status: "in_progress", sent_to_expert_at: new Date().toISOString() })
      .eq("id", active.id);

    await supabase.from("messages").insert({
      project_id: projectId,
      thread_type: "admin_expert",
      sender_id: userId,
      content: `Revision requested by client:\n\n${active.notes}`,
    });

    await supabase.from("notifications").insert({
      user_id: project.expert_id,
      title: "Revision Assigned",
      body: `A revision was requested on "${project.title}". Check the project for details.`,
      link: `/dashboard/expert/${projectId}`,
    });

    const { data: expertEmail } = await supabase.from("profiles").select("email").eq("id", project.expert_id).single();
    if (expertEmail?.email) {
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: expertEmail.email,
          subject: "Revision Requested — Eduxellence",
          html: `<p>A revision was requested on <strong>${project.title}</strong>. Log in to view the client's notes.</p>`,
        }),
      });
    }

    setSendingToExpert(false);
    loadData();
  }

  async function sendReminder(offerId: string) {
    const { error } = await supabase.rpc("fn_send_offer_reminder", { p_offer_id: offerId });
    if (error) { alert(error.message); return; }
    loadData();
  }

  async function extendOffer(offerId: string) {
    const extra = prompt("Extend by how many minutes?", "30");
    if (!extra) return;
    const { error } = await supabase.rpc("fn_extend_offer_response", { p_offer_id: offerId, p_extra_minutes: parseInt(extra) });
    if (error) { alert(error.message); return; }
    loadData();
  }

  async function cancelOffer(offerId: string) {
    if (!confirm("Cancel this offer? The project will become unassigned.")) return;
    const { error } = await supabase.rpc("fn_cancel_offer", { p_offer_id: offerId });
    if (error) { alert(error.message); return; }
    loadData();
  }

  async function reassignOffer(offerId: string) {
    if (!selectedExpert || !userId) {
      alert("Select a new expert in the panel below first.");
      return;
    }
    const { error } = await supabase.rpc("fn_reassign_offer", {
      p_old_offer_id: offerId,
      p_new_expert_id: selectedExpert,
      p_admin_id: userId,
      p_fixed_fee: fixedFee ? parseFloat(fixedFee) : null,
    });
    if (error) { alert(error.message); return; }
    loadData();
    alert("Reassigned to new expert.");
  }

  async function cancelProject() {
    if (!userId) return;
    const reason = prompt("Reason for cancelling this project:");
    if (!reason) return;
    if (!confirm("Cancel this project? This cannot be undone.")) return;

    const { error } = await supabase.rpc("fn_cancel_project", {
      p_project_id: projectId,
      p_admin_id: userId,
      p_reason: reason,
    });

    if (error) {
      alert("Could not cancel: " + error.message);
      return;
    }

    setProject((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
    loadData();
  }

  async function createMilestone() {
    if (!milestoneTitle.trim() || !milestoneAmount) return;
    const { error } = await supabase.rpc("fn_create_milestone", {
      p_project_id: projectId,
      p_title: milestoneTitle,
      p_description: milestoneDesc || null,
      p_amount: parseFloat(milestoneAmount),
      p_due_date: milestoneDueDate || null,
    });
    if (error) { alert(error.message); return; }
    setMilestoneTitle("");
    setMilestoneDesc("");
    setMilestoneAmount("");
    setMilestoneDueDate("");
    loadData();
  }

  async function updateMilestoneStatus(id: string, status: string) {
    const { error } = await supabase.rpc("fn_update_milestone_status", { p_milestone_id: id, p_status: status });
    if (error) { alert(error.message); return; }
    loadData();
  }

  async function releaseMilestone(id: string) {
    if (!userId) return;
    if (!confirm("Release this milestone payment to the expert?")) return;
    const { error } = await supabase.rpc("fn_release_milestone_payment", { p_milestone_id: id, p_admin_id: userId });
    if (error) { alert(error.message); return; }
    loadData();
  }

  async function togglePromotionEligibility() {
    if (!project) return;
    const newValue = !project.promotion_eligible;
    const { error } = await supabase.from("projects").update({ promotion_eligible: newValue }).eq("id", projectId);
    if (error) {
      alert("Could not update: " + error.message);
      return;
    }
    setProject((prev) => (prev ? { ...prev, promotion_eligible: newValue } : prev));
  }

  async function saveRequirements() {
    const { error } = await supabase.from("projects").update({
      required_category_id: reqCategory || null,
      required_skill_ids: reqSkills,
      required_experience_level: reqExperience || null,
      required_availability_urgency: reqUrgency || null,
      specialization_notes: reqSpecialization || null,
    }).eq("id", projectId);
    if (error) { alert(error.message); return; }
    alert("Requirements saved.");
  }

  async function findExperts() {
    setMatching(true);
    const { data, error } = await supabase.rpc("fn_match_experts_for_project", { p_project_id: projectId, p_limit: 10 });
    setMatching(false);
    if (error) { alert(error.message); return; }
    setMatches(data || []);
  }

  async function markQaReview() {
    await supabase.from("projects").update({ status: "qa_review" }).eq("id", projectId);
    setProject((prev) => (prev ? { ...prev, status: "qa_review" } : prev));
  }

  async function markDelivered() {
    // Get current project to check if delivered_at already exists
    const { data: currentProject } = await supabase
      .from("projects")
      .select("delivered_at")
      .eq("id", projectId)
      .single();

    const updateData: any = {
      status: "delivered",
    };

    // Only set delivered_at if it hasn't been set before (first delivery)
    if (!currentProject?.delivered_at) {
      updateData.delivered_at = new Date().toISOString();
    }

    await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId);

    setProject((prev) => (prev ? { ...prev, status: "delivered" } : prev));

    const active = revisionRequests.find((r) => r.status === "in_progress");
    if (active) {
      await supabase
        .from("revision_requests")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", active.id);
      loadData();
    }

    if (project?.expert_id) {
      await supabase.from("notifications").insert({
        user_id: project.expert_id,
        title: "Delivered to Client",
        body: `Your work on "${project.title}" has passed QA and been sent to the client for review.`,
        link: `/dashboard/expert/${projectId}`,
      });
    }
  }

  if (!project) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  const latestQuotation = quotations[0];
  const quoteStatusColor: Record<string, string> = {
    pending: "var(--gold-dark)",
    approved: "#1e8449",
    rejected: "#c0392b",
  };

  const selectedExpertObj = experts.find((e) => e.id === selectedExpert);
  
  // NEW LOGIC: Client Quotation input → calculates Expert Fee
  const calculatedExpertFee =
    clientQuotationInput && selectedExpertObj?.revenue_share
      ? (parseFloat(clientQuotationInput) * selectedExpertObj.revenue_share).toFixed(2)
      : null;

  const smallInput: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    fontSize: "0.8rem",
    marginBottom: "0.5rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to All Projects" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", marginBottom: "0.25rem" }}>
              {project.title}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Status: <strong style={{ textTransform: "capitalize" }}>{project.status.replace("_", " ")}</strong>
            </p>

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Client Request</div>
              {project.description && <p style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>{project.description}</p>}
              <p style={{ fontSize: "0.85rem" }}>
                <strong>Client&apos;s proposed budget:</strong>{" "}
                {project.budget ? `$${project.budget}` : "Not specified"}
              </p>
            </div>

            {quotations.length > 0 && (
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Quotation History</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {quotations.map((q) => (
                    <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                      <div>
                        <strong>${q.amount}</strong>
                        {q.description && <span style={{ color: "var(--muted)" }}> — {q.description}</span>}
                        <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{new Date(q.created_at).toLocaleString()}</div>
                      </div>
                      <span style={{ fontWeight: 600, textTransform: "capitalize", color: quoteStatusColor[q.status] || "var(--muted)" }}>
                        {q.status}
                      </span>
                    </div>
                  ))}
                </div>
                {latestQuotation?.status === "rejected" && (
                  <p style={{ fontSize: "0.8rem", color: "#c0392b", marginTop: "0.75rem" }}>
                    Client declined the latest offer. Send a revised quotation below.
                  </p>
                )}
              </div>
            )}

            {revisionRequests.length > 0 && (
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                  Revision History ({revisionRequests.length} round{revisionRequests.length > 1 ? "s" : ""})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                  {revisionRequests.map((r, idx) => (
                    <div key={r.id} style={{ borderBottom: idx < revisionRequests.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                        <strong>Revision {idx + 1}</strong>
                        <span style={{ textTransform: "capitalize", fontWeight: 600, color: r.status === "resolved" ? "#1e8449" : "var(--gold-dark)" }}>
                          {r.status.replace("_", " ")}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}>{r.notes}</p>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.6 }}>
                        Requested {new Date(r.created_at).toLocaleString()}
                        {r.sent_to_expert_at && <><br />Sent to expert {new Date(r.sent_to_expert_at).toLocaleString()}</>}
                        {r.expert_submitted_at && <><br />Expert resubmitted {new Date(r.expert_submitted_at).toLocaleString()}</>}
                        {r.resolved_at && <><br />Resolved {new Date(r.resolved_at).toLocaleString()}</>}
                      </div>
                      {r.status === "open" && project.expert_id && (
                        <button
                          onClick={sendRevisionToExpert}
                          disabled={sendingToExpert}
                          style={{ marginTop: "0.5rem", background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.4rem 0.9rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
                        >
                          {sendingToExpert ? "Sending..." : "Send to Expert"}
                        </button>
                      )}
                      {r.status === "open" && !project.expert_id && (
                        <p style={{ fontSize: "0.7rem", color: "#c0392b", marginTop: "0.4rem" }}>Assign an expert before sending this revision.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
                <button
                  onClick={() => setActiveTab("client_admin")}
                  style={{
                    flex: 1,
                    padding: "0.9rem",
                    border: "none",
                    background: activeTab === "client_admin" ? "var(--white)" : "var(--cream-dark)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    borderBottom: activeTab === "client_admin" ? "2px solid var(--gold)" : "none",
                  }}
                >
                  Chat with Client
                </button>
                <button
                  onClick={() => setActiveTab("admin_expert")}
                  disabled={!project.expert_id}
                  style={{
                    flex: 1,
                    padding: "0.9rem",
                    border: "none",
                    background: activeTab === "admin_expert" ? "var(--white)" : "var(--cream-dark)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: project.expert_id ? "pointer" : "not-allowed",
                    opacity: project.expert_id ? 1 : 0.5,
                    borderBottom: activeTab === "admin_expert" ? "2px solid var(--gold)" : "none",
                  }}
                >
                  Chat with Expert {!project.expert_id && "(none assigned)"}
                </button>
              </div>

              <div style={{ padding: "1.5rem", maxHeight: "380px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {activeMessages.length === 0 && (
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>No messages yet.</p>
                )}
                {activeMessages.map((m) => {
                  const isMine = m.sender_id === userId;
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
                      <button
                        onClick={() => deleteMessage(m)}
                        style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.7rem", cursor: "pointer", marginTop: "0.2rem", padding: 0 }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} style={{ display: "flex", gap: "0.5rem", padding: "1rem", borderTop: "1px solid var(--border)" }}>
                <label style={{ cursor: activeTab === "admin_expert" && !project.expert_id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", padding: "0 0.5rem", color: "var(--muted)" }}>
                  📎
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                    disabled={uploading || (activeTab === "admin_expert" && !project.expert_id)}
                  />
                </label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={uploading ? "Uploading file..." : activeTab === "client_admin" ? "Reply to client..." : "Message the expert..."}
                  disabled={uploading || (activeTab === "admin_expert" && !project.expert_id)}
                  style={{ flex: 1, padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.9rem" }}
                />
                <button
                  type="submit"
                  disabled={uploading || (activeTab === "admin_expert" && !project.expert_id)}
                  style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                {latestQuotation?.status === "rejected" ? "Send Revised Quotation" : "Send Quotation"}
              </div>
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
                disabled={latestQuotation?.status === "pending"}
                style={{ width: "100%", background: latestQuotation?.status === "pending" ? "var(--border)" : "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: 600, cursor: latestQuotation?.status === "pending" ? "not-allowed" : "pointer", fontSize: "0.85rem" }}
              >
                {latestQuotation?.status === "pending" ? "Quotation Pending Client Response" : latestQuotation?.status === "rejected" ? "Send Revised Quotation" : "Send Quotation"}
              </button>
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Define Matching Requirements</div>
              <select value={reqCategory} onChange={(e) => { setReqCategory(e.target.value ? Number(e.target.value) : ""); setReqSkills([]); }} style={smallInput}>
                <option value="">Solution category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {reqCategory && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
                  {skillsCatalog.filter((s) => s.category_id === reqCategory).map((s) => (
                    <label key={s.id} style={{ fontSize: "0.75rem", background: reqSkills.includes(s.id) ? "var(--gold-light)" : "var(--cream-dark)", padding: "0.25rem 0.6rem", borderRadius: "999px", cursor: "pointer" }}>
                      <input type="checkbox" checked={reqSkills.includes(s.id)} onChange={() => setReqSkills(reqSkills.includes(s.id) ? reqSkills.filter((x) => x !== s.id) : [...reqSkills, s.id])} style={{ display: "none" }} />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
              <select value={reqExperience} onChange={(e) => setReqExperience(e.target.value)} style={smallInput}>
                <option value="">Experience required...</option>
                <option value="less_than_1">Less than 1 year</option>
                <option value="1_2">1–2 years</option>
                <option value="3_5">3–5 years</option>
                <option value="6_10">6–10 years</option>
                <option value="10_plus">10+ years</option>
              </select>
              <input placeholder="Urgency (e.g. within 48 hours)" value={reqUrgency} onChange={(e) => setReqUrgency(e.target.value)} style={smallInput} />
              <input placeholder="Specialization notes" value={reqSpecialization} onChange={(e) => setReqSpecialization(e.target.value)} style={smallInput} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={saveRequirements} style={{ flex: 1, background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.5rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Save Requirements</button>
                <button onClick={findExperts} disabled={matching} style={{ flex: 1, background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  {matching ? "Matching..." : "Find Recommended Experts"}
                </button>
              </div>

              {matches.length > 0 && (
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {matches.map((m, i) => (
                    <div key={m.expert_id} style={{ border: "1px solid var(--gold)", borderRadius: "8px", padding: "0.6rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                        <strong>{i + 1}. {m.full_name}</strong>
                        <span style={{ color: "var(--gold-dark)", fontWeight: 700 }}>{m.total_score}% Match</span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{m.level_name} · ★{m.avg_rating} · {m.completed_projects} projects</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                        Skills {m.skills_score}/35 · Category {m.category_score}/20 · Exp {m.experience_score}/15 · Perf {m.performance_score}/10 · Avail {m.availability_score}/10 · History {m.history_score}/10
                      </div>
                      <button
                        onClick={() => { setSelectedExpert(m.expert_id); alert(`${m.full_name} selected — scroll to "Offer Project to Expert" to send the offer.`); }}
                        style={{ marginTop: "0.4rem", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer" }}
                      >
                        Select for Offer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Client Quotation → Expert Fee</div>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                Enter the amount you&apos;ve agreed with the client. The system will auto-calculate the expert&apos;s share based on their revenue-share level.
              </p>

              {!selectedExpert ? (
                <p style={{ fontSize: "0.8rem", color: "var(--gold-dark)" }}>Select an expert in the panel below first.</p>
              ) : !selectedExpertObj?.revenue_share ? (
                <p style={{ fontSize: "0.8rem", color: "#c0392b" }}>Selected expert has no level assigned — cannot calculate.</p>
              ) : (
                <>
                  <p style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                    {selectedExpertObj.full_name || selectedExpertObj.email} — {Math.round(selectedExpertObj.revenue_share * 100)}% share
                  </p>
                  <input
                    type="number"
                    placeholder="Agreed client quotation (USD)"
                    value={clientQuotationInput}
                    onChange={(e) => setClientQuotationInput(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.5rem" }}
                  />
                  {calculatedExpertFee && (
                    <div style={{ background: "var(--cream-dark)", borderRadius: "6px", padding: "0.75rem", marginBottom: "0.5rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Calculated expert fee</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--gold-dark)" }}>${calculatedExpertFee}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                        Eduxellence share: ${(parseFloat(clientQuotationInput) - parseFloat(calculatedExpertFee)).toFixed(2)}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (clientQuotationInput) setQuoteAmount(clientQuotationInput);
                      if (calculatedExpertFee) setFixedFee(calculatedExpertFee);
                    }}
                    disabled={!clientQuotationInput}
                    style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.5rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.8rem", cursor: clientQuotationInput ? "pointer" : "not-allowed" }}
                  >
                    Use for Quotation &amp; Offer
                  </button>
                </>
              )}
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Offer Project to Expert</div>
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
              <input
                type="number"
                placeholder="Optional: fixed expert fee (overrides % share)"
                value={fixedFee}
                onChange={(e) => setFixedFee(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "0.5rem" }}
              />
              <button
                onClick={offerToExpert}
                style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
              >
                Send Offer
              </button>
              {project.expert_id && (
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                  Currently assigned to: {experts.find((e) => e.id === project.expert_id)?.full_name || "Expert"}
                </p>
              )}
            </div>

            {offers.length > 0 && (
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "0.6rem", fontSize: "0.9rem" }}>Offer History</div>
                {offers.map((o) => {
                  const isOverdue = o.status === "offered" && o.response_deadline && new Date(o.response_deadline) < new Date();
                  return (
                    <div key={o.id} style={{ fontSize: "0.8rem", marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                      <div>{o.expert_name || "Unknown"} — <span style={{ fontWeight: 600, textTransform: "capitalize", color: o.status === "accepted" ? "#1e8449" : o.status === "declined" ? "#c0392b" : isOverdue ? "#c0392b" : "var(--gold-dark)" }}>{o.status === "offered" && isOverdue ? "awaiting response (overdue)" : o.status}</span></div>
                      {o.compensation_amount && <div style={{ color: "var(--muted)" }}>Compensation: ${o.compensation_amount}</div>}
                      {o.decline_reason && <div style={{ color: "var(--muted)" }}>Reason: {o.decline_reason}</div>}
                      {o.status === "offered" && o.response_deadline && (
                        <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                          {isOverdue ? "Response window passed" : `Response due ${new Date(o.response_deadline).toLocaleTimeString()}`}
                          {o.reminder_sent_at && ` · Reminder sent ${new Date(o.reminder_sent_at).toLocaleTimeString()}`}
                        </div>
                      )}
                      {isOverdue && (
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                          <button onClick={() => sendReminder(o.id)} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Send Reminder</button>
                          <button onClick={() => reassignOffer(o.id)} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>Reassign</button>
                          <button onClick={() => extendOffer(o.id)} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Extend Time</button>
                          <button onClick={() => cancelOffer(o.id)} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Cancel Offer</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Milestones</div>

              {milestones.map((m) => {
                const payment = milestonePayments[m.id];
                return (
                  <div key={m.id} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.6rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <strong>{m.title}</strong>
                      <span>${m.amount}</span>
                    </div>
                    {m.description && <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: "0.2rem 0" }}>{m.description}</p>}
                    <div style={{ fontSize: "0.75rem", color: "var(--gold-dark)", fontWeight: 600, textTransform: "capitalize", marginTop: "0.3rem" }}>{m.status.replace("_", " ")}</div>
                    {payment && (
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                        Payment: {payment.status} {payment.verification_status === "pending" && "(needs verification — see Payments page)"}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      {m.status === "pending" && (
                        <button onClick={() => updateMilestoneStatus(m.id, "in_progress")} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer" }}>Mark In Progress</button>
                      )}
                      {m.status === "in_progress" && (
                        <button onClick={() => updateMilestoneStatus(m.id, "completed")} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer" }}>Mark Completed</button>
                      )}
                      {m.status === "completed" && payment?.status === "held" && payment.verification_status === "verified" && (
                        <button onClick={() => releaseMilestone(m.id)} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>Release Payment</button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                <input placeholder="Milestone title" value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "0.4rem" }} />
                <input placeholder="Description (optional)" value={milestoneDesc} onChange={(e) => setMilestoneDesc(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "0.4rem" }} />
                <input type="number" placeholder="Amount (USD)" value={milestoneAmount} onChange={(e) => setMilestoneAmount(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "0.4rem" }} />
                <input type="date" value={milestoneDueDate} onChange={(e) => setMilestoneDueDate(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "0.4rem" }} />
                <button onClick={createMilestone} style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.5rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>Add Milestone</button>
              </div>
            </div>

            <PaymentPanel
              projectId={projectId}
              expertId={project.expert_id}
              projectStatus={project.status}
              onReleased={() => setProject((prev) => (prev ? { ...prev, status: "completed" } : prev))}
            />

            {review && (
              <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Client Review</div>
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

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Workflow Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button onClick={markQaReview} style={actionBtnStyle}>Mark: In QA Review</button>
                <button onClick={markDelivered} style={actionBtnStyle}>Mark: Delivered to Client</button>
                {project.status !== "completed" && project.status !== "cancelled" && (
                  <button onClick={cancelProject} style={{ ...actionBtnStyle, color: "#c0392b", borderColor: "#c0392b" }}>
                    Cancel Project
                  </button>
                )}
                <button onClick={togglePromotionEligibility} style={actionBtnStyle}>
                  {project.promotion_eligible ? "Exclude from Promotion Calculations" : "✓ Re-include in Promotion Calculations"}
                </button>
                {!project.promotion_eligible && (
                  <p style={{ fontSize: "0.7rem", color: "#c0392b", marginTop: "-0.25rem" }}>
                    This project is currently excluded — it won't count toward the expert's completed projects, reviews, or on-time rate.
                  </p>
                )}
              </div>
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