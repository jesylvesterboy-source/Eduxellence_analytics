import Link from "next/link";

export default function BackHomeBar({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", fontSize: "0.85rem" }}>
      <Link href={backHref} style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 600 }}>
        ← {backLabel}
      </Link>
      <Link href="/" style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 600 }}>
        🏠 Home
      </Link>
    </div>
  );
}
