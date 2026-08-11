"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

const DOC_TYPES = [
  { value: "certificate", label: "Academic/Professional Certificate" },
  { value: "license", label: "Professional License" },
  { value: "portfolio", label: "Portfolio Document" },
  { value: "other", label: "Other Supporting Document" },
];

type Doc = {
  id: string;
  doc_type: string;
  label: string | null;
  file_path: string;
  file_name: string;
  verification_status: string;
  uploaded_at: string;
  expiry_date: string | null;
  no_expiry: boolean;
  lifecycle_status: string;
  superseded_by: string | null;
  replaced_at: string | null;
};

const statusColor: Record<string, string> = {
  verified: "#1e8449",
  pending_verification: "var(--gold-dark)",
  rejected: "#c0392b",
  expired: "#c0392b",
};

export default function ExpertDocumentsPage() {
  const supabase = createClient();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [docType, setDocType] = useState("certificate");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [credTypes, setCredTypes] = useState<{ id: number; name: string; default_validity_months: number | null; requires_expiry_date: boolean }[]>([]);
  const [credentialTypeId, setCredentialTypeId] = useState<number | "">("");
  const [issuingOrg, setIssuingOrg] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  // New state for profile photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("expert_documents")
      .select("id, doc_type, label, file_path, file_name, verification_status, uploaded_at, expiry_date, no_expiry, lifecycle_status, superseded_by, replaced_at")
      .eq("expert_id", user.id)
      .order("uploaded_at", { ascending: false });
    setDocs(data || []);

    const { data: types } = await supabase.from("credential_types").select("id, name, default_validity_months, requires_expiry_date").order("id");
    setCredTypes(types || []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Lazy: only fetch a signed URL when the user actually clicks View — nothing loads automatically
  async function viewDoc(doc: Doc) {
    if (signedUrls[doc.id]) {
      window.open(signedUrls[doc.id], "_blank");
      return;
    }
    const { data } = await supabase.storage.from("expert-applications").createSignedUrl(doc.file_path, 60 * 10);
    if (data?.signedUrl) {
      setSignedUrls((prev) => ({ ...prev, [doc.id]: data.signedUrl }));
      window.open(data.signedUrl, "_blank");
    }
  }

  async function deletePending(docId: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const doc = docs.find((d) => d.id === docId);
    const { error } = await supabase.rpc("fn_delete_pending_document", { p_document_id: docId });
    if (error) {
      alert(error.message);
      return;
    }
    if (doc) await supabase.storage.from("expert-applications").remove([doc.file_path]);
    load();
  }

  async function requestRemoval(docId: string) {
    const reason = prompt("Why are you requesting removal of this credential?");
    if (!reason) return;
    const { error } = await supabase.rpc("fn_request_document_removal", { p_document_id: docId, p_reason: reason });
    if (error) {
      alert(error.message);
      return;
    }
    alert("Removal request sent to Admin.");
    load();
  }

  // Profile photo upload function
  async function uploadPhoto() {
    if (!photoFile) return alert("Select a photo first.");
    if (photoFile.size > 10 * 1024 * 1024) return alert("File too large — max 10MB.");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUploadingPhoto(true);
    const path = `${user.id}/photo-${Date.now()}-${photoFile.name}`;
    const { error: uploadError } = await supabase.storage.from("expert-applications").upload(path, photoFile);
    if (uploadError) {
      setUploadingPhoto(false);
      return alert("Upload failed: " + uploadError.message);
    }

    const currentPhoto = docs.find((d) => d.doc_type === "profile_photo" && d.lifecycle_status === "current");

    const { error } = currentPhoto
      ? await supabase.rpc("fn_request_document_replacement", {
          p_old_document_id: currentPhoto.id,
          p_label: "Profile Photo",
          p_new_file_path: path,
          p_new_file_name: photoFile.name,
          p_new_file_size: photoFile.size,
          p_credential_type_id: null,
          p_issuing_organization: null,
          p_issue_date: null,
          p_expiry_date: null,
          p_no_expiry: false,
        })
      : await supabase.rpc("fn_upload_document", {
          p_doc_type: "profile_photo",
          p_label: "Profile Photo",
          p_file_path: path,
          p_file_name: photoFile.name,
          p_file_size: photoFile.size,
          p_credential_type_id: null,
          p_issuing_organization: null,
          p_issue_date: null,
          p_expiry_date: null,
          p_no_expiry: false,
        });

    setUploadingPhoto(false);
    if (error) return alert("Failed: " + error.message);
    setPhotoFile(null);
    load();
  }

  async function uploadOrReplace() {
    if (!file) {
      alert("Select a file first.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large — max 10MB.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const selectedType = credTypes.find((t) => t.id === credentialTypeId);
    if (selectedType?.requires_expiry_date && !noExpiry && !expiryDate && !issueDate) {
      alert("This credential type requires an expiry date, or an issue date so we can calculate one.");
      return;
    }

    setUploading(true);
    const path = `${user.id}/${docType}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("expert-applications").upload(path, file);
    if (uploadError) {
      setUploading(false);
      alert("Upload failed: " + uploadError.message);
      return;
    }

    // FIXED: Added all 10 parameters to fn_request_document_replacement
    const { error } = replacingId
      ? await supabase.rpc("fn_request_document_replacement", {
          p_old_document_id: replacingId,
          p_label: label || null,
          p_new_file_path: path,
          p_new_file_name: file.name,
          p_new_file_size: file.size,
          p_credential_type_id: null,
          p_issuing_organization: null,
          p_issue_date: null,
          p_expiry_date: null,
          p_no_expiry: false,
        })
      : await supabase.rpc("fn_upload_document", {
          p_doc_type: docType,
          p_label: label || null,
          p_file_path: path,
          p_file_name: file.name,
          p_file_size: file.size,
          p_credential_type_id: credentialTypeId || null,
          p_issuing_organization: issuingOrg || null,
          p_issue_date: issueDate || null,
          p_expiry_date: expiryDate || null,
          p_no_expiry: noExpiry,
        });

    setUploading(false);
    if (error) {
      alert("Failed: " + error.message);
      return;
    }
    setFile(null);
    setLabel("");
    setIssuingOrg("");
    setIssueDate("");
    setExpiryDate("");
    setNoExpiry(false);
    setReplacingId(null);
    load();
  }

  const currentPhoto = docs.find((d) => d.doc_type === "profile_photo" && d.lifecycle_status === "current");
  const pendingPhotoRemoval = currentPhoto?.lifecycle_status === "removal_requested";

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/expert" backLabel="Back to Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          My Documents &amp; Credentials
        </h1>

        {/* PROFILE PHOTO BLOCK */}
        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Profile Photo</div>
          {currentPhoto ? (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
              {currentPhoto.verification_status.replace("_", " ")}
              {pendingPhotoRemoval && " · Removal Pending Admin Review"}
            </p>
          ) : (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.6rem" }}>No profile photo on file.</p>
          )}
          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} style={{ marginBottom: "0.6rem", fontSize: "0.85rem" }} />
          <button onClick={uploadPhoto} disabled={uploadingPhoto} style={{ background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
            {uploadingPhoto ? "Uploading..." : currentPhoto ? "Replace Photo" : "Upload Photo"}
          </button>
        </div>

        {/* My Documents & Credentials - filter out profile_photo */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
          {docs.filter((d) => d.doc_type !== "profile_photo").map((d) => (
            <div key={d.id} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.1rem", marginBottom: "0.6rem", opacity: d.lifecycle_status === "superseded" || d.lifecycle_status === "removed" ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", textTransform: "capitalize" }}>
                    {d.label || d.doc_type.replace("_", " ")}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    Uploaded {new Date(d.uploaded_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: statusColor[d.verification_status] || "var(--muted)", textTransform: "capitalize", marginTop: "0.2rem" }}>
                    {d.verification_status.replace("_", " ")}
                    {d.expiry_date && !d.no_expiry && ` · Expires ${new Date(d.expiry_date).toLocaleDateString()}`}
                    {d.lifecycle_status === "superseded" && ` · Superseded${d.replaced_at ? " " + new Date(d.replaced_at).toLocaleDateString() : ""}`}
                    {d.lifecycle_status === "removal_requested" && " · Removal Pending"}
                    {d.lifecycle_status === "removed" && " · Removed"}
                  </div>
                </div>
                <button onClick={() => viewDoc(d)} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.4rem 0.9rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  View
                </button>
              </div>
              {d.lifecycle_status === "current" && (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
                  {d.verification_status === "pending_verification" ? (
                    <button onClick={() => deletePending(d.id)} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "0.3rem 0.8rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>
                      Delete
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setReplacingId(d.id)} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.3rem 0.8rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>
                        Request Replacement
                      </button>
                      <button onClick={() => requestRemoval(d.id)} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "0.3rem 0.8rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>
                        Request Removal
                      </button>
                    </>
                  )}
                </div>
              )}
              {replacingId === d.id && (
                <div style={{ marginTop: "0.6rem", padding: "0.6rem", background: "var(--gold-light)", borderRadius: "6px" }}>
                  <p style={{ fontSize: "0.75rem", marginBottom: "0.4rem" }}>Upload replacement for: <strong>{d.label || d.doc_type.replace("_", " ")}</strong></p>
                  <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginBottom: "0.4rem", fontSize: "0.85rem" }} />
                  <button onClick={() => setReplacingId(null)} style={{ background: "transparent", border: "1px solid var(--border)", padding: "0.3rem 0.8rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
          {docs.filter((d) => d.doc_type !== "profile_photo").length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", textAlign: "center" }}>No documents uploaded.</p>
          )}
        </div>

        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>
            {replacingId ? "Replace Document" : "Add Credential"}
          </div>
          {!replacingId && (
            <>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} style={inputStyle}>
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={credentialTypeId} onChange={(e) => setCredentialTypeId(e.target.value ? Number(e.target.value) : "")} style={inputStyle}>
                <option value="">Credential type (optional)...</option>
                {credTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input placeholder="Issuing organization" value={issuingOrg} onChange={(e) => setIssuingOrg(e.target.value)} style={inputStyle} />
              <input type="date" placeholder="Issue date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} style={inputStyle} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} disabled={noExpiry} style={{ flex: 1, padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" }} />
                <label style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} /> No Expiry
                </label>
              </div>
            </>
          )}
          <input placeholder="Document name (e.g. MSc in Statistics)" value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
          <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginBottom: "0.75rem", fontSize: "0.85rem" }} />
          <button onClick={uploadOrReplace} disabled={uploading} style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.65rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
            {uploading ? "Uploading..." : replacingId ? "Upload Replacement" : "Upload Document"}
          </button>
          {replacingId && (
            <button onClick={() => setReplacingId(null)} style={{ width: "100%", marginTop: "0.5rem", background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.5rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
              Cancel Replacement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.6rem" };