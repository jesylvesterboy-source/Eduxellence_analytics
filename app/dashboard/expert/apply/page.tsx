"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

export default function ExpertApplyPage() {
  const supabase = createClient();
  const router = useRouter();

  const [status, setStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("application_status, rejection_reason, role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "expert") {
      router.push("/dashboard");
      return;
    }
    setStatus(profile.application_status);
    setRejectionReason(profile.rejection_reason);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleSubmit() {
    if (!cvFile || !idFile || !photoFile) {
      alert("Please upload all three required documents.");
      return;
    }
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    async function uploadDoc(file: File, label: string) {
      const path = `${user!.id}/${label}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("expert-applications").upload(path, file);
      if (error) throw new Error(`${label} upload failed: ${error.message}`);
      return path;
    }

    try {
      const [cvPath, idPath, photoPath] = await Promise.all([
        uploadDoc(cvFile, "cv"),
        uploadDoc(idFile, "id"),
        uploadDoc(photoFile, "photo"),
      ]);

      const { error } = await supabase.rpc("fn_submit_expert_application", {
        p_cv_url: cvPath,
        p_government_id_url: idPath,
        p_profile_photo_url: photoPath,
      });

      if (error) throw error;

      setStatus("submitted");
    } catch (err: any) {
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <BackHomeBar backHref="/" backLabel="Back to Home" />

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
          Complete Your Expert Application
        </h1>

        {status === "draft" && (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Upload the required documents to complete your application. Our team reviews every application before granting access to the Expert Dashboard.
            </p>
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>CV / Resume (PDF)</label>
                <input type="file" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>Government-issued ID</label>
                <input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>Professional Profile Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.75rem", borderRadius: "6px", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </>
        )}

        {status === "submitted" || status === "under_review" ? (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.5rem", textAlign: "center" }}>
            <strong>Application submitted.</strong>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Our team is reviewing your application. You&apos;ll be notified once a decision is made.</p>
          </div>
        ) : null}

        {status === "additional_info_requested" && (
          <div style={{ background: "var(--white)", border: "1px solid #c0392b", borderRadius: "10px", padding: "1.5rem" }}>
            <strong style={{ color: "#c0392b" }}>Additional information needed</strong>
            {rejectionReason && <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>{rejectionReason}</p>}
            <p style={{ fontSize: "0.85rem", marginTop: "0.75rem", color: "var(--muted)" }}>Please re-upload your documents below.</p>
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="file" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
              <input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
              <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              <button onClick={handleSubmit} disabled={submitting} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.75rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
                {submitting ? "Submitting..." : "Resubmit"}
              </button>
            </div>
          </div>
        )}

        {status === "rejected" && (
          <div style={{ background: "var(--white)", border: "1px solid #c0392b", borderRadius: "10px", padding: "1.5rem", textAlign: "center" }}>
            <strong style={{ color: "#c0392b" }}>Application not approved</strong>
            {rejectionReason && <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>{rejectionReason}</p>}
          </div>
        )}
      </div>
    </div>
  );
}