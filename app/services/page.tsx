"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Package = {
  tier: "Starter" | "Standard" | "Premium" | "Enterprise";
  name: string;
  price: string;
};

type Category = {
  icon: string;
  title: string;
  description: string;
  packages: Package[];
};

const CATEGORIES: Category[] = [
  {
    icon: "R",
    title: "Research & Academic Services",
    description: "From undergraduate support to professional research consulting.",
    packages: [
      { tier: "Starter", name: "Proofreading & Formatting", price: "Starting from $50" },
      { tier: "Standard", name: "Literature Review & Research Support", price: "Starting from $150" },
      { tier: "Premium", name: "Thesis & Dissertation Support", price: "Starting from $300 per chapter" },
      { tier: "Enterprise", name: "Research Consulting", price: "Custom Quote" },
    ],
  },
  {
    icon: "D",
    title: "Data, AI & Analytics",
    description: "Professional data analysis, business intelligence and AI solutions.",
    packages: [
      { tier: "Starter", name: "Data Cleaning", price: "Starting from $50" },
      { tier: "Standard", name: "Statistical Analysis", price: "Starting from $150" },
      { tier: "Premium", name: "Advanced Analytics", price: "Starting from $350" },
      { tier: "Enterprise", name: "AI & Business Intelligence", price: "Custom Quote" },
    ],
  },
  {
    icon: "S",
    title: "Software & Digital Solutions",
    description: "Modern software, web and mobile application development.",
    packages: [
      { tier: "Starter", name: "Landing Page / Small Website", price: "Starting from $250" },
      { tier: "Standard", name: "Business Website", price: "Starting from $750" },
      { tier: "Premium", name: "Custom Web Application", price: "Starting from $2,000" },
      { tier: "Enterprise", name: "Enterprise Software / SaaS", price: "Custom Quote" },
    ],
  },
  {
    icon: "M",
    title: "Mobile App Development",
    description: "Android, iOS and cross-platform mobile solutions.",
    packages: [
      { tier: "Starter", name: "Simple Mobile App", price: "Starting from $800" },
      { tier: "Standard", name: "Business Mobile App", price: "Starting from $2,500" },
      { tier: "Premium", name: "Advanced Mobile Platform", price: "Starting from $5,000" },
      { tier: "Enterprise", name: "Custom Mobile Ecosystem", price: "Custom Quote" },
    ],
  },
  {
    icon: "W",
    title: "Website Services",
    description: "Professional websites, portals and e-commerce platforms.",
    packages: [
      { tier: "Starter", name: "Website Maintenance", price: "Starting from $100/month" },
      { tier: "Standard", name: "Corporate Website", price: "Starting from $600" },
      { tier: "Premium", name: "E-commerce Website", price: "Starting from $1,500" },
      { tier: "Enterprise", name: "Custom Web Portal", price: "Custom Quote" },
    ],
  },
  {
    icon: "B",
    title: "Business & Consulting",
    description: "Helping businesses grow through strategy and innovation.",
    packages: [
      { tier: "Starter", name: "Business Plan Development", price: "Starting from $200" },
      { tier: "Standard", name: "Financial Modelling", price: "Starting from $400" },
      { tier: "Premium", name: "Business Strategy & Advisory", price: "Starting from $800" },
      { tier: "Enterprise", name: "Corporate Consulting", price: "Custom Quote" },
    ],
  },
  {
    icon: "A",
    title: "Agriculture & Food Systems",
    description: "Agribusiness, climate-smart agriculture and value chain consulting.",
    packages: [
      { tier: "Starter", name: "Agribusiness Advisory", price: "Starting from $150" },
      { tier: "Standard", name: "Feasibility Study", price: "Starting from $500" },
      { tier: "Premium", name: "Value Chain Analysis", price: "Starting from $1,000" },
      { tier: "Enterprise", name: "Agricultural Consulting", price: "Custom Quote" },
    ],
  },
  {
    icon: "G",
    title: "GIS & Engineering",
    description: "Spatial analysis, mapping and engineering solutions.",
    packages: [
      { tier: "Starter", name: "GIS Mapping", price: "Starting from $150" },
      { tier: "Standard", name: "Spatial Analysis", price: "Starting from $400" },
      { tier: "Premium", name: "Engineering Design", price: "Starting from $800" },
      { tier: "Enterprise", name: "Infrastructure Projects", price: "Custom Quote" },
    ],
  },
  {
    icon: "H",
    title: "Health & Medical Research",
    description: "Research, analytics and public health consulting.",
    packages: [
      { tier: "Starter", name: "Medical Editing", price: "Starting from $100" },
      { tier: "Standard", name: "Public Health Research", price: "Starting from $350" },
      { tier: "Premium", name: "Clinical Data Analysis", price: "Starting from $750" },
      { tier: "Enterprise", name: "Health Consulting", price: "Custom Quote" },
    ],
  },
  {
    icon: "C",
    title: "Creative & Digital Media",
    description: "Branding, design and multimedia production.",
    packages: [
      { tier: "Starter", name: "Logo & Brand Assets", price: "Starting from $100" },
      { tier: "Standard", name: "Brand Identity Package", price: "Starting from $350" },
      { tier: "Premium", name: "Video & Motion Graphics", price: "Starting from $750" },
      { tier: "Enterprise", name: "Complete Brand Strategy", price: "Custom Quote" },
    ],
  },
  {
    icon: "P",
    title: "Professional Support Services",
    description: "Business support for professionals and organizations.",
    packages: [
      { tier: "Starter", name: "Virtual Assistance", price: "Starting from $15/hour" },
      { tier: "Standard", name: "Technical Writing", price: "Starting from $150" },
      { tier: "Premium", name: "Translation & Localization", price: "Starting from $300" },
      { tier: "Enterprise", name: "Dedicated Business Support", price: "Custom Quote" },
    ],
  },
];

function CategoryTestimonials({ category }: { category: string }) {
  const supabase = createClient();
  const [items, setItems] = useState<{ client_name: string; quote: string; rating: number | null }[]>([]);

  useEffect(() => {
    supabase
      .from("public_testimonials")
      .select("client_name, quote, rating")
      .eq("approved", true)
      .eq("show_on_solutions", true)
      .eq("service_category", category)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setItems(data || []));
  }, [category, supabase]);

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {items.map((t, i) => (
        <div key={i} style={{ fontSize: "0.8rem" }}>
          <span style={{ color: "var(--gold)" }}>{"★".repeat(t.rating || 5)}</span>{" "}
          <em>&ldquo;{t.quote}&rdquo;</em> — <strong>{t.client_name}</strong>
        </div>
      ))}
    </div>
  );
}

function waLink(category: string, tier: string, name: string) {
  const text = "Hello, I would like to request a quote for " + name + " (" + tier + ") under " + category + ".";
  return "https://wa.me/2348135980311?text=" + encodeURIComponent(text);
}

export default function SolutionsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = CATEGORIES.filter((c) => {
    const matchesFilter = activeFilter === "All" || c.title === activeFilter;
    const matchesSearch =
      search.trim() === "" ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  function toggleCollapse(title: string) {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  return (
    <>
      <nav>
        <div className="nav-logo">
          Eduxellence <span>Solutions</span>
        </div>
        <ul className="nav-links">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/services" style={{ color: "var(--gold)" }}>Eduxellence Solutions</Link></li>
          <li><Link href="/#contact">Contact</Link></li>
          <li><Link href="/login">Log In</Link></li>
          <li><Link href="/signup" style={{ color: "var(--gold)", fontWeight: 600 }}>Sign Up</Link></li>
        </ul>
        <a href="https://wa.me/2348135980311?text=Hello%2C%20I%27d%20like%20to%20book%20a%20free%20consultation" target="_blank" rel="noopener noreferrer" className="nav-cta">
          Free Consultation
        </a>
        <div className={"hamburger" + (menuOpen ? " open" : "")} onClick={() => setMenuOpen((p) => !p)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </nav>

      <div className="sol-hero">
        <div className="sol-hero-badge">Multidisciplinary Expert Network</div>
        <h1>Eduxellence Solutions</h1>
        <p>
          Comprehensive professional solutions delivered by vetted experts across research, technology,
          business, agriculture, healthcare, engineering, AI, and digital innovation.
        </p>
        <a href="#catalogue" className="sol-hero-cta">Find the Right Solution</a>
      </div>

      <section id="catalogue" className="sol-catalogue">
        <div className="sol-controls">
          <input
            type="text"
            placeholder="Search solution categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sol-search"
          />
          <div className="sol-filters">
            <button
              className={"sol-filter-chip" + (activeFilter === "All" ? " active" : "")}
              onClick={() => setActiveFilter("All")}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.title}
                className={"sol-filter-chip" + (activeFilter === c.title ? " active" : "")}
                onClick={() => setActiveFilter(c.title)}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div className="sol-section-head">
          <span className="sol-label">Solution Categories</span>
          <h2>Every Challenge, One Trusted Partner</h2>
          <p>Clients engage Eduxellence Solutions Bright Horizon for end-to-end professional solutions, not isolated tasks.</p>
        </div>

        {filtered.length === 0 && (
          <p className="sol-empty">No solution categories match your search.</p>
        )}

        <div className="sol-grid">
          {filtered.map((cat) => {
            const isCollapsed = collapsed[cat.title];
            return (
              <div key={cat.title} className="sol-card">
                <div className="sol-card-header" onClick={() => toggleCollapse(cat.title)}>
                  <div className="sol-icon">{cat.icon}</div>
                  <div className="sol-card-title-wrap">
                    <div className="sol-card-title">{cat.title}</div>
                    <div className="sol-card-desc">{cat.description}</div>
                  </div>
                  <div className="sol-toggle">{isCollapsed ? "+" : "-"}</div>
                </div>

                {!isCollapsed && (
                  <>
                    <div className="sol-packages">
                      {cat.packages.map((pkg) => (
                        <div key={pkg.tier} className={"sol-package" + (pkg.tier === "Enterprise" ? " enterprise" : "")}>
                          <div className="sol-package-tier">{pkg.tier}</div>
                          <div className="sol-package-name">{pkg.name}</div>
                          <div className="sol-package-price">{pkg.price}</div>
                          <a href={waLink(cat.title, pkg.tier, pkg.name)} target="_blank" rel="noopener noreferrer" className="sol-package-btn">
                            Request Quote
                          </a>
                        </div>
                      ))}
                    </div>
                    <CategoryTestimonials category={cat.title} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sol-cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Book a free consultation and let&apos;s discuss the right solution for your needs.</p>
        <a href="https://wa.me/2348135980311?text=Hello%2C%20I%27d%20like%20to%20book%20a%20free%20consultation" target="_blank" rel="noopener noreferrer" className="sol-cta-btn">
          Book Free Consultation
        </a>
      </section>

      <footer>
        <p style={{ marginBottom: "0.5rem", fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: "rgba(255,255,255,0.7)" }}>
          Eduxellence <strong>Solutions</strong>
        </p>
        <p>
          Copyright 2025 Eduxellence Solutions. All rights reserved. - Abuja, Nigeria -{" "}
          <a href="mailto:eduxellencesolutions@gmail.com">eduxellencesolutions@gmail.com</a>
        </p>
      </footer>

      <style jsx>{`
        .sol-hero {
          background: linear-gradient(160deg, #0d0d0d 0%, #1a1508 60%, #2a1f08 100%);
          padding: 130px 5% 70px;
          text-align: center;
        }
        .sol-hero-badge {
          display: inline-block;
          border: 1px solid rgba(200, 150, 12, 0.5);
          color: var(--gold);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.4rem 1rem;
          border-radius: 2px;
          margin-bottom: 1.5rem;
        }
        .sol-hero h1 {
          font-family: "Playfair Display", serif;
          font-size: clamp(2.4rem, 5vw, 3.6rem);
          font-weight: 700;
          color: #fff;
          margin-bottom: 1rem;
        }
        .sol-hero p {
          font-size: 1.05rem;
          color: rgba(255, 255, 255, 0.65);
          max-width: 640px;
          margin: 0 auto 2rem;
          font-weight: 300;
        }
        .sol-hero-cta {
          display: inline-block;
          background: var(--gold);
          color: var(--ink);
          padding: 0.85rem 2rem;
          border-radius: 4px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s;
        }
        .sol-hero-cta:hover {
          background: #e8a90e;
        }

        .sol-catalogue {
          background: var(--white);
          padding: 70px 5%;
        }
        .sol-controls {
          max-width: 900px;
          margin: 0 auto 2.5rem;
        }
        .sol-search {
          width: 100%;
          padding: 0.85rem 1.1rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 0.95rem;
          margin-bottom: 1rem;
          font-family: "DM Sans", sans-serif;
        }
        .sol-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .sol-filter-chip {
          background: var(--cream-dark);
          border: 1px solid var(--border);
          color: var(--ink-soft);
          padding: 0.45rem 1rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sol-filter-chip.active {
          background: var(--gold);
          color: var(--ink);
          border-color: var(--gold);
          font-weight: 600;
        }
        .sol-filter-chip:hover {
          border-color: var(--gold);
        }

        .sol-section-head {
          text-align: center;
          max-width: 640px;
          margin: 0 auto 3rem;
        }
        .sol-label {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          display: block;
          margin-bottom: 0.6rem;
        }
        .sol-section-head h2 {
          font-family: "Playfair Display", serif;
          font-size: clamp(1.7rem, 3vw, 2.4rem);
          margin-bottom: 0.75rem;
        }
        .sol-section-head p {
          color: var(--muted);
          font-size: 0.95rem;
        }

        .sol-empty {
          text-align: center;
          color: var(--muted);
          padding: 2rem;
        }

        .sol-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .sol-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--card-bg);
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .sol-card:hover {
          box-shadow: var(--shadow);
          transform: translateY(-2px);
        }

        .sol-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          cursor: pointer;
          background: var(--cream-dark);
        }
        .sol-icon {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border-radius: 8px;
          background: var(--gold);
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
        }
        .sol-card-title-wrap {
          flex: 1;
        }
        .sol-card-title {
          font-family: "Playfair Display", serif;
          font-size: 1.05rem;
          font-weight: 700;
        }
        .sol-card-desc {
          font-size: 0.78rem;
          color: var(--muted);
          margin-top: 0.15rem;
        }
        .sol-toggle {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--gold-dark);
          width: 24px;
          text-align: center;
        }

        .sol-packages {
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          animation: sol-fade-in 0.2s ease;
        }
        @keyframes sol-fade-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sol-package {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0.9rem 1.1rem;
          transition: border-color 0.2s;
        }
        .sol-package:hover {
          border-color: var(--gold);
        }
        .sol-package.enterprise {
          background: var(--gold-light);
          border-color: var(--gold);
        }
        .sol-package-tier {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gold-dark);
          margin-bottom: 0.2rem;
        }
        .sol-package-name {
          font-size: 0.92rem;
          font-weight: 600;
          margin-bottom: 0.3rem;
        }
        .sol-package-price {
          font-size: 0.82rem;
          color: var(--muted);
          margin-bottom: 0.6rem;
        }
        .sol-package-btn {
          display: inline-block;
          background: var(--ink);
          color: var(--white);
          padding: 0.4rem 0.9rem;
          border-radius: 5px;
          font-size: 0.78rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s;
        }
        .sol-package-btn:hover {
          background: var(--gold);
          color: var(--ink);
        }

        .sol-cta-section {
          background: var(--ink);
          color: var(--white);
          text-align: center;
          padding: 4rem 5%;
        }
        .sol-cta-section h2 {
          font-family: "Playfair Display", serif;
          font-size: clamp(1.7rem, 3vw, 2.3rem);
          margin-bottom: 0.75rem;
          color: var(--white);
        }
        .sol-cta-section p {
          color: rgba(255, 255, 255, 0.55);
          margin-bottom: 1.5rem;
        }
        .sol-cta-btn {
          display: inline-block;
          background: var(--gold);
          color: var(--ink);
          padding: 0.85rem 2.2rem;
          border-radius: 4px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s;
        }
        .sol-cta-btn:hover {
          background: #e8a90e;
        }

        @media (max-width: 768px) {
          .sol-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}