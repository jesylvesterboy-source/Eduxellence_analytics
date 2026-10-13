"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PHONE_DISPLAY = "+234 813 598 0311";
const PHONE_TEL = "+2348135980311";
const EMAIL = "eduxellencesolutions@gmail.com";

export default function SiteFooter() {
  const pathname = usePathname();

  // Keep authenticated dashboards uncluttered
  if (pathname?.startsWith("/dashboard")) return null;

  return (
    <footer>
      <p className="footer-brand">
        Eduxellence <strong>Solutions</strong>
      </p>
      <p>
        Copyright {new Date().getFullYear()} Eduxellence Solutions. All rights reserved. - Abuja, Nigeria
      </p>

      <nav className="footer-links" aria-label="Eduxellence solutions">
        <a href="https://clean.eduxellence.org" target="_blank" rel="noopener noreferrer">Clean</a>
        <a href="https://stats.eduxellence.org" target="_blank" rel="noopener noreferrer">Stats</a>
        <a href="https://experts.eduxellence.org" target="_blank" rel="noopener noreferrer">Experts</a>
        <a href="https://results.eduxellence.org" target="_blank" rel="noopener noreferrer">Results</a>
        <Link href="/sitemap">Sitemap</Link>
      </nav>

      <div className="footer-credit">
        <p className="footer-credit-name">
          Designed and Developed by Eduxellence Solutions Bright Horizon Ltd.
        </p>
        <p className="footer-contact">
          <a href={`tel:${PHONE_TEL}`}>Phone: {PHONE_DISPLAY}</a>
          <a href={`mailto:${EMAIL}`}>Email: {EMAIL}</a>
        </p>
      </div>
    </footer>
  );
}