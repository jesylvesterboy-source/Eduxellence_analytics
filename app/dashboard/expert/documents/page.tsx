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
};

const statusColor: Record<string, string> = {
  verified: "#1e8449",
  pending_verification: "var(--gold-dark)",
  rejected: "#c0392b",
  expired: "var(--muted)",
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

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("expert_documents")
      .select("id, doc_type, label, file_path, file_name, verification_status, uploaded_at, expiry_date, no_expiry")
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

  async function upload() {
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

    const { error } = await supabase.rpc("fn_upload_document", {
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
      alert("Failed to record document: " + error.message);
      return;
    }
    setFile(null);
    setLabel("");
    setIssuingOrg("");
    setIssueDate("");
    setExpiryDate("");
    setNoExpiry(false);
    load();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/expert" backLabel="Back to Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          My Documents &amp; Credentials
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
          {docs.map((d) => (
            <div key={d.id} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                </div>
              </div>
              <button onClick={() => viewDoc(d)} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.4rem 0.9rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                View / Download
              </button>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Add Credential</div>
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
          <input placeholder="Document name (e.g. MSc in Statistics)" value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
          <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginBottom: "0.75rem", fontSize: "0.85rem" }} />
          <button onClick={upload} disabled={uploading} style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.65rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.6rem" };