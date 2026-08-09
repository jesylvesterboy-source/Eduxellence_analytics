"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SolutionPreview = {
  icon: string;
  title: string;
  description: string;
  startingPrice: string;
};

const SOLUTIONS: SolutionPreview[] = [
  { icon: "R", title: "Research & Academic Services", description: "From undergraduate support to professional research consulting.", startingPrice: "Starting from $50" },
  { icon: "D", title: "Data, AI & Analytics", description: "Professional data analysis, business intelligence and AI solutions.", startingPrice: "Starting from $50" },
  { icon: "S", title: "Software & Digital Solutions", description: "Modern software, web and mobile application development.", startingPrice: "Starting from $250" },
  { icon: "M", title: "Mobile App Development", description: "Android, iOS and cross-platform mobile solutions.", startingPrice: "Starting from $800" },
  { icon: "W", title: "Website Services", description: "Professional websites, portals and e-commerce platforms.", startingPrice: "Starting from $100/month" },
  { icon: "B", title: "Business & Consulting", description: "Helping businesses grow through strategy and innovation.", startingPrice: "Starting from $200" },
  { icon: "A", title: "Agriculture & Food Systems", description: "Agribusiness, climate-smart agriculture and value chain consulting.", startingPrice: "Starting from $150" },
  { icon: "G", title: "GIS & Engineering", description: "Spatial analysis, mapping and engineering solutions.", startingPrice: "Starting from $150" },
  { icon: "H", title: "Health & Medical Research", description: "Research, analytics and public health consulting.", startingPrice: "Starting from $100" },
  { icon: "C", title: "Creative & Digital Media", description: "Branding, design and multimedia production.", startingPrice: "Starting from $100" },
  { icon: "P", title: "Professional Support Services", description: "Business support for professionals and organizations.", startingPrice: "Starting from $15/hour" },
];

function TrustAndTestimonials() {
  const supabase = createClient();
  const [metrics, setMetrics] = useState<{ avg_rating: number | null; completed_projects: number; expert_count: number } | null>(null);
  const [testimonials, setTestimonials] = useState<{ client_name: string; project_title: string | null; quote: string; rating: number | null }[]>([]);

  useEffect(() => {
    supabase.rpc("fn_platform_trust_metrics").then(({ data }) => {
      if (data && data[0]) setMetrics(data[0]);
    });
    supabase
      .from("testimonials")
      .select("client_name, project_title, quote, rating")
      .eq("approved", true)
      .eq("show_on_homepage", true)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setTestimonials(data || []));
  }, [supabase]);

  return (
    <>
      {metrics && (
        <section style={{ background: "var(--ink)", padding: "3rem 5%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "2rem", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 700, color: "var(--gold)" }}>
                {metrics.avg_rating ?? "—"}★
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>Average Client Rating</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 700, color: "var(--gold)" }}>
                {metrics.completed_projects}+
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>Projects Completed</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 700, color: "var(--gold)" }}>
                {metrics.expert_count}+
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>Vetted Experts</div>
            </div>
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section style={{ background: "var(--white)", padding: "70px 5%" }}>
          <div className="section-head center">
            <span className="section-label">Client Feedback</span>
            <h2 className="section-title">What Clients Say</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem" }}>
                {t.rating && <div style={{ color: "var(--gold)", fontSize: "1.1rem", marginBottom: "0.6rem" }}>{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</div>}
                <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)", marginBottom: "0.75rem" }}>&ldquo;{t.quote}&rdquo;</p>
                <p style={{ fontSize: "0.8rem", fontWeight: 600 }}>{t.client_name}</p>
                {t.project_title && <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{t.project_title}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function WhyChooseEduxellence() {
  const points = [
    { icon: "🎯", title: "Managed, Not Freelance", text: "We assign the right expert internally and manage quality — you never chase individual freelancers." },
    { icon: "✅", title: "Vetted Experts Only", text: "Every expert passes CV, ID, and portfolio review before joining the network." },
    { icon: "🔒", title: "Secure, Escrow-Style Payments", text: "Funds are held until you approve the completed work." },
    { icon: "📈", title: "Consistent Quality Assurance", text: "Every deliverable is reviewed by Admin before it reaches you." },
  ];
  return (
    <section style={{ background: "var(--cream)", padding: "70px 5%" }}>
      <div className="section-head center">
        <span className="section-label">Why Eduxellence</span>
        <h2 className="section-title">Why Choose Eduxellence</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", maxWidth: "1000px", margin: "0 auto" }}>
        {points.map((p) => (
          <div key={p.title} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{p.icon}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: "0.5rem" }}>{p.title}</div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{p.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<HTMLSelectElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);

  function submitConsult() {
    const name = nameRef.current?.value.trim() || "";
    const email = emailRef.current?.value.trim() || "";
    const service = serviceRef.current?.value || "";
    const msg = msgRef.current?.value.trim() || "";

    if (!name || !service) {
      alert("Please enter your name and select a solution area.");
      return;
    }

    const text = "Hello! I need support.\n\nName: " + name +
      "\nEmail: " + (email || "Not provided") +
      "\nSolution Needed: " + service +
      "\nMessage: " + (msg || "No additional message.");
    const encoded = encodeURIComponent(text);
    window.open("https://wa.me/2348135980311?text=" + encoded, "_blank");
  }

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-logo">
          Eduxellence <span>Solutions</span>
        </div>
        <ul className="nav-links">
          <li><Link href="/services" style={{ color: "var(--gold)", fontWeight: 600 }}>Eduxellence Solutions</Link></li>
          <li><a href="#tools">Tools</a></li>
          <li><a href="#contact">Contact</a></li>
          <li><Link href="/login">Log In</Link></li>
          <li><Link href="/signup" style={{ color: "var(--gold)", fontWeight: 600 }}>Sign Up</Link></li>
          <li><a href="https://clean.eduxellence.org" target="_blank" rel="noopener noreferrer">Clean</a></li>
          <li><a href="https://stats.eduxellence.org" target="_blank" rel="noopener noreferrer">Stats</a></li>
          <li><a href="https://results.eduxellence.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", fontWeight: 600 }}>Results</a></li>
        </ul>
        <a href="https://wa.me/2348135980311?text=Hello%2C%20I%27d%20like%20to%20book%20a%20free%20consultation" target="_blank" rel="noopener noreferrer" className="nav-cta">Free Consultation</a>
        <div className={"hamburger" + (menuOpen ? " open" : "")} onClick={() => setMenuOpen((p) => !p)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="hero-badge">Multidisciplinary Expert Network</div>
          <h1>
            Comprehensive Solutions for <em>Every Challenge</em>
          </h1>
          <p>
            Eduxellence Solutions Bright Horizon connects you with vetted experts across research,
            technology, business, agriculture, healthcare, engineering, AI, and digital innovation.
          </p>
          <div className="hero-actions">
            <Link href="/services" className="btn-primary">Find the Right Solution</Link>
            <a href="https://wa.me/2348135980311?text=Hello%2C%20I%20need%20help%20with%20a%20project" target="_blank" rel="noopener noreferrer" className="btn-outline">Get Started</a>
          </div>
        </div>
      </section>

      <TrustAndTestimonials />
      <WhyChooseEduxellence />

      <section className="cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Tell us what you need — we&apos;ll match you with the right expert and manage the entire project for you.</p>
        <a href="https://wa.me/2348135980311?text=Hello%2C%20I%27d%20like%20to%20get%20started" target="_blank" rel="noopener noreferrer" className="cta-btn">
          Get Started Today
        </a>
      </section>

      {/* SOLUTIONS PREVIEW */}
      <section id="services" style={{ background: "var(--white)" }}>
        <div className="section-head center">
          <span className="section-label">What We Offer</span>
          <h2 className="section-title">Eduxellence Solutions</h2>
          <p className="section-sub">
            Comprehensive professional solutions delivered by vetted experts, not isolated tasks.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", maxWidth: "1200px", margin: "0 auto" }}>
          {SOLUTIONS.map((sol) => (
            <Link
              key={sol.title}
              href="/services"
              style={{
                display: "block",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1.5rem",
                textDecoration: "none",
                color: "var(--ink)",
                background: "var(--card-bg)",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
            >
              <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "var(--gold)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, marginBottom: "1rem" }}>
                {sol.icon}
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.4rem" }}>
                {sol.title}
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.75rem" }}>{sol.description}</p>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--gold-dark)" }}>{sol.startingPrice}</div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
          <Link href="/services" className="btn-primary" style={{ display: "inline-flex" }}>
            View All Solutions & Pricing
          </Link>
        </div>
      </section>

      {/* TOOLS */}
      <section id="tools" style={{ background: "var(--cream)" }}>
        <div className="section-head center">
          <span className="section-label">Tools</span>
          <h2 className="section-title">Software &amp; Platforms</h2>
          <p className="section-sub">We work with industry-standard tools to deliver accurate and reliable results.</p>
        </div>
        <div className="tools-grid">
          <div className="tool-item">SPSS</div>
          <div className="tool-item">EViews</div>
          <div className="tool-item">Excel</div>
          <div className="tool-item">Python</div>
          <div className="tool-item">R</div>
          <div className="tool-item">Power BI</div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="contact-bg">
        <div className="section-head center">
          <span className="section-label">Get In Touch</span>
          <h2 className="section-title">Need a Solution?</h2>
          <p className="section-sub">Reach out and let&apos;s discuss your needs.</p>
        </div>
        <div className="contact-grid">
          <div>
            <div className="contact-links">
              <a href="https://wa.me/2348135980311?text=Hello%2C%20I%20need%20help%20with%20a%20project" target="_blank" rel="noopener noreferrer" className="contact-link">
                <div className="contact-link-icon">W</div>
                <div className="contact-link-text">
                  <div className="contact-link-label">WhatsApp</div>
                  <div className="contact-link-value">+234 813 598 0311</div>
                </div>
              </a>
              <a href="mailto:eduxellencesolutions@gmail.com" className="contact-link">
                <div className="contact-link-icon">E</div>
                <div className="contact-link-text">
                  <div className="contact-link-label">Email</div>
                  <div className="contact-link-value">eduxellencesolutions@gmail.com</div>
                </div>
              </a>
              <a href="https://results.eduxellence.org" target="_blank" rel="noopener noreferrer" className="contact-link" style={{ borderColor: "var(--gold)", background: "var(--gold-light)" }}>
                <div className="contact-link-icon" style={{ background: "var(--gold)", color: "white" }}>R</div>
                <div className="contact-link-text">
                  <div className="contact-link-label">Live Platform</div>
                  <div className="contact-link-value" style={{ color: "var(--gold-dark)" }}>results.eduxellence.org</div>
                </div>
              </a>
            </div>
            <div className="social-row">
              <a href="https://www.facebook.com/share/1CoVcFnsEK/" target="_blank" rel="noopener noreferrer" className="social-btn">Facebook</a>
              <a href="https://www.linkedin.com/in/jeremiah-sylvester-4aa906414" target="_blank" rel="noopener noreferrer" className="social-btn">LinkedIn</a>
              <a href="https://x.com/eduxelsolutions" target="_blank" rel="noopener noreferrer" className="social-btn">Twitter/X</a>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "1rem" }}>
              Abuja, Nigeria - Available globally (remote)
            </p>
          </div>
          <div className="consult-box">
            <h3>Request a Solution</h3>
            <p>Tell us about your needs and we&apos;ll get back to you within 24 hours.</p>
            <div className="consult-form">
              <input type="text" placeholder="Your full name" ref={nameRef} />
              <input type="email" placeholder="Your email address" ref={emailRef} />
              <select ref={serviceRef} defaultValue="">
                <option value="" disabled>Select a solution area</option>
                {SOLUTIONS.map((sol) => (
                  <option key={sol.title}>{sol.title}</option>
                ))}
              </select>
              <textarea placeholder="Briefly describe your project or what you need help with..." ref={msgRef}></textarea>
              <button className="consult-submit" onClick={submitConsult}>Send Enquiry</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <p style={{ marginBottom: "0.5rem", fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: "rgba(255,255,255,0.7)" }}>
          Eduxellence <strong>Solutions</strong>
        </p>
        <p>
          Copyright 2025 Eduxellence Solutions. All rights reserved. - Abuja, Nigeria -{" "}
          <a href="mailto:eduxellencesolutions@gmail.com">eduxellencesolutions@gmail.com</a> -{" "}
          <a href="https://results.eduxellence.org" target="_blank" rel="noopener noreferrer">results.eduxellence.org</a>
        </p>
        <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
          <a href="https://stats.eduxellence.org" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)" }}>stats</a>{" "}
          <a href="https://analytics.eduxellence.org" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)" }}>analytics</a>{" "}
          <a href="https://clean.eduxellence.org" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)" }}>clean</a>{" "}
          <a href="https://results.eduxellence.org" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)" }}>results</a>
        </p>
      </footer>
    </>
  );
}