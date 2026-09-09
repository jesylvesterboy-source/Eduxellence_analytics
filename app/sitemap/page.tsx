import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sitemap | Eduxellence Experts",
  description: "Overview of accessible public pages on Eduxellence Experts.",
  alternates: {
    canonical: "https://experts.eduxellence.org/sitemap",
  },
};

export default function HtmlSitemapPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Eduxellence Experts - Site Index</h1>
      
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-3">Core Platform</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <Link href="/" className="text-blue-600 hover:underline">
                Home
              </Link>
            </li>
            <li>
              <Link href="/services" className="text-blue-600 hover:underline">
                Services & Capabilities
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-blue-600 hover:underline">
                Client & Expert Sign In
              </Link>
            </li>
            <li>
              <Link href="/signup" className="text-blue-600 hover:underline">
                Register an Account
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Portals & Onboarding</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <Link href="/dashboard/expert/apply" className="text-blue-600 hover:underline">
                Apply as an Expert
              </Link>
            </li>
            <li>
              <Link href="/dashboard/client/new" className="text-blue-600 hover:underline">
                Post a New Project Request
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}