"use client";

import { useState } from "react";
import Link from "next/link";

export default function ServicesPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-logo">
          Eduxellence <span>Solutions</span>
        </div>
        <ul className="nav-links">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/services" style={{ color: "var(--gold)" }}>Services</Link></li>
          <li><Link href="/free-tools">Free Tools</Link></li>
          <li><Link href="/#contact">Contact</Link></li>
        </ul>
        <a href="https://wa.me/2348135980311?text=Hello%2C%20I%27d%20like%20to%20book%20a%20free%20consultation" target="_blank" rel="noopener noreferrer" className="nav-cta">Free Consultation</a>
        <div className={"hamburger" + (menuOpen ? " open" : "")} onClick={() => setMenuOpen((p) => !p)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </nav>

      {/* PAGE HEADER */}
      <div className="page-hero">
        <h1>Services &amp; <em>Pricing</em></h1>
        <p>Tiered packages so every client, student, researcher, NGO, or business, finds the right fit.</p>
      </div>

      {/* SERVICES */}
      <section id="services" className="services-bg">
        <div className="section-head center">
          <span className="section-label">What We Offer</span>
          <h2 className="section-title">Our Service Pillars</h2>
          <p className="section-sub">Six pillars of expertise, each with flexible tiers to match your scope and budget.</p>
        </div>

        {/* PILLAR 1 */}
        <div className="pillar">
          <div className="pillar-header">
            <div className="pillar-icon">R</div>
            <div>
              <div className="pillar-title">Research &amp; Academic Services</div>
              <div className="pillar-sub">From undergraduate support to full research consultation</div>
            </div>
          </div>
          <div className="tier-grid">
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Starter</div>
                  <div className="tier-label">Proofreading &amp; Formatting</div>
                </div>
                <div className="tier-price">$50</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Research proofreading (up to 5,000 words)</li>
                  <li>Academic formatting (APA, MLA, Harvard, Chicago)</li>
                  <li>Citation cleanup &amp; reference verification</li>
                  <li>1 revision round</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20the%20Research%20Starter%20package%20($50)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card featured">
              <div className="tier-head">
                <div>
                  <div className="featured-badge">Most Popular</div>
                  <div className="tier-name">Standard</div>
                  <div className="tier-label">Literature Review &amp; Editing</div>
                </div>
                <div className="tier-price">$150</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Literature review (up to 30 sources)</li>
                  <li>Research editing &amp; proofreading</li>
                  <li>Questionnaire / survey design</li>
                  <li>Academic formatting + citation management</li>
                  <li>2 revision rounds</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20the%20Research%20Standard%20package%20($150)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Premium</div>
                  <div className="tier-label">Thesis &amp; Dissertation Support</div>
                </div>
                <div className="tier-price">$300<span>/chapter</span></div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Chapter-by-chapter thesis support</li>
                  <li>Research proposal writing</li>
                  <li>Methodology guidance &amp; design</li>
                  <li>Data collection planning</li>
                  <li>Unlimited revisions</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20the%20Thesis%20Support%20package%20($300)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Elite</div>
                  <div className="tier-label">Academic Research Consulting</div>
                </div>
                <div className="tier-price">$1,000<span>+</span></div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Full proposal-to-defense support</li>
                  <li>Systematic review support</li>
                  <li>Research publication preparation</li>
                  <li>Grant research assistance</li>
                  <li>Dedicated weekly check-ins</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Academic%20Research%20Consulting%20($1000+)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR 2 */}
        <div className="pillar">
          <div className="pillar-header">
            <div className="pillar-icon">D</div>
            <div>
              <div className="pillar-title">Data Analysis &amp; Statistics</div>
              <div className="pillar-sub">SPSS - EViews - Excel - R - Python</div>
            </div>
          </div>
          <div className="tier-grid">
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Basic</div>
                  <div className="tier-label">Data Cleaning &amp; Entry</div>
                </div>
                <div className="tier-price">$50</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Data entry &amp; coding</li>
                  <li>Data cleaning &amp; validation</li>
                  <li>Descriptive statistics</li>
                  <li>Excel / SPSS ready datasets</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Data%20Cleaning%20Basic%20($50)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card featured">
              <div className="tier-head">
                <div>
                  <div className="featured-badge">Best Value</div>
                  <div className="tier-name">Standard</div>
                  <div className="tier-label">Statistical Analysis</div>
                </div>
                <div className="tier-price">$150</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>T-tests, ANOVA, Correlation</li>
                  <li>Regression analysis</li>
                  <li>Survey data analysis</li>
                  <li>Results interpretation</li>
                  <li>Statistical report writing</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Statistical%20Analysis%20Standard%20($150)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Advanced</div>
                  <div className="tier-label">Econometric &amp; Time Series</div>
                </div>
                <div className="tier-price">$300</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Econometric analysis (EViews)</li>
                  <li>Time series analysis</li>
                  <li>Agricultural data analysis</li>
                  <li>Data visualization &amp; dashboards</li>
                  <li>PowerPoint data presentation</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Econometric%20Analysis%20($300)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Elite</div>
                  <div className="tier-label">Statistical Consulting</div>
                </div>
                <div className="tier-price">$500<span>+</span></div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Full research data analysis</li>
                  <li>Monitoring &amp; Evaluation support</li>
                  <li>Custom dashboard creation</li>
                  <li>NGO / business data reporting</li>
                  <li>Ongoing statistical consulting</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Statistical%20Consulting%20($500+)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR 3 */}
        <div className="pillar">
          <div className="pillar-header">
            <div className="pillar-icon">T</div>
            <div>
              <div className="pillar-title">Teaching &amp; Tutoring</div>
              <div className="pillar-sub">6+ years experience across English, Research, SPSS &amp; more</div>
            </div>
          </div>
          <div className="tier-grid">
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Single Session</div>
                  <div className="tier-label">1-Hour Tutoring</div>
                </div>
                <div className="tier-price">$20<span>/hr</span></div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>English / TEFL tutoring</li>
                  <li>WAEC / NECO preparation</li>
                  <li>Statistics &amp; SPSS basics</li>
                  <li>Academic writing coaching</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20a%20single%20tutoring%20session" target="_blank" rel="noopener noreferrer" className="tier-btn">Book Session</a>
              </div>
            </div>
            <div className="tier-card featured">
              <div className="tier-head">
                <div>
                  <div className="featured-badge">Most Popular</div>
                  <div className="tier-name">Package</div>
                  <div className="tier-label">5-Session Bundle</div>
                </div>
                <div className="tier-price">$100</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>5 one-hour sessions (save 20%)</li>
                  <li>Agric Economics / Research Methods</li>
                  <li>SPSS hands-on training</li>
                  <li>Session notes &amp; study resources</li>
                  <li>Flexible scheduling</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20the%205-Session%20Tutoring%20Bundle%20($100)" target="_blank" rel="noopener noreferrer" className="tier-btn">Book Bundle</a>
              </div>
            </div>
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Workshop</div>
                  <div className="tier-label">Research Training Workshop</div>
                </div>
                <div className="tier-price">$300</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Full-day or multi-session workshop</li>
                  <li>SPSS, Research Methodology or Academic Writing</li>
                  <li>Group or 1-on-1 format</li>
                  <li>Certificate of participation</li>
                  <li>Training materials included</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20a%20Research%20Training%20Workshop%20($300)" target="_blank" rel="noopener noreferrer" className="tier-btn">Book Workshop</a>
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR 4 */}
        <div className="pillar">
          <div className="pillar-header">
            <div className="pillar-icon">C</div>
            <div>
              <div className="pillar-title">Content Writing &amp; Creation</div>
              <div className="pillar-sub">SEO articles, educational content, e-books &amp; more</div>
            </div>
          </div>
          <div className="tier-grid">
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Basic</div>
                  <div className="tier-label">Blog &amp; Social Content</div>
                </div>
                <div className="tier-price">$50</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>2 blog posts (800-1,000 words each)</li>
                  <li>Social media content (1 week)</li>
                  <li>Newsletter writing</li>
                  <li>Basic SEO optimisation</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20the%20Content%20Basic%20package%20($50)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card featured">
              <div className="tier-head">
                <div>
                  <div className="featured-badge">Best Value</div>
                  <div className="tier-name">Standard</div>
                  <div className="tier-label">SEO Articles &amp; Web Copy</div>
                </div>
                <div className="tier-price">$150</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>4 SEO-optimised articles (1,200+ words)</li>
                  <li>Website content (up to 5 pages)</li>
                  <li>Research-based articles</li>
                  <li>Script writing for videos</li>
                  <li>Study guides or course notes</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20the%20Content%20Standard%20package%20($150)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Premium</div>
                  <div className="tier-label">E-Book &amp; Long-Form</div>
                </div>
                <div className="tier-price">$300</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>E-book writing (up to 10,000 words)</li>
                  <li>Educational content packages</li>
                  <li>Full content strategy</li>
                  <li>Formatted, publication-ready output</li>
                  <li>2 revision rounds</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20the%20E-Book%20Content%20package%20($300)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR 5 */}
        <div className="pillar">
          <div className="pillar-header">
            <div className="pillar-icon">M</div>
            <div>
              <div className="pillar-title">Digital Marketing</div>
              <div className="pillar-sub">Growth strategy, social media management &amp; copywriting</div>
            </div>
          </div>
          <div className="tier-grid">
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Starter</div>
                  <div className="tier-label">Social Media Setup</div>
                </div>
                <div className="tier-price">$100</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Facebook / WhatsApp marketing setup</li>
                  <li>Content calendar (1 month)</li>
                  <li>Basic Canva graphic designs (10)</li>
                  <li>Marketing copywriting</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Digital%20Marketing%20Starter%20($100)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card featured">
              <div className="tier-head">
                <div>
                  <div className="featured-badge">Most Popular</div>
                  <div className="tier-name">Growth</div>
                  <div className="tier-label">Monthly Management</div>
                </div>
                <div className="tier-price">$300<span>/mo</span></div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Full social media management</li>
                  <li>Community management</li>
                  <li>Email marketing campaigns</li>
                  <li>Lead generation strategy</li>
                  <li>Monthly performance report</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Digital%20Marketing%20Growth%20($300/mo)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Premium</div>
                  <div className="tier-label">Full Growth Strategy</div>
                </div>
                <div className="tier-price">$500<span>/mo</span></div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>All Growth package features</li>
                  <li>Paid ads strategy &amp; support</li>
                  <li>Brand content production</li>
                  <li>Funnel copywriting</li>
                  <li>Weekly strategy calls</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Digital%20Marketing%20Premium%20($500/mo)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR 6 */}
        <div className="pillar">
          <div className="pillar-header">
            <div className="pillar-icon">S</div>
            <div>
              <div className="pillar-title">High-Ticket Sales &amp; Lead Generation</div>
              <div className="pillar-sub">Appointment setting, lead qualification &amp; sales support</div>
            </div>
          </div>
          <div className="tier-grid">
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Starter</div>
                  <div className="tier-label">Lead Qualification</div>
                </div>
                <div className="tier-price">$300</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Lead research &amp; list building</li>
                  <li>Lead qualification calls</li>
                  <li>CRM data entry &amp; management</li>
                  <li>Weekly leads report</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Lead%20Generation%20Starter%20($300)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card featured">
              <div className="tier-head">
                <div>
                  <div className="featured-badge">High Impact</div>
                  <div className="tier-name">Standard</div>
                  <div className="tier-label">Appointment Setting</div>
                </div>
                <div className="tier-price">$500</div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>Appointment setting (monthly retainer)</li>
                  <li>Discovery call support</li>
                  <li>Sales funnel support</li>
                  <li>Customer relationship management</li>
                  <li>Performance tracking</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Appointment%20Setting%20Standard%20($500)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
            <div className="tier-card">
              <div className="tier-head">
                <div>
                  <div className="tier-name">Elite</div>
                  <div className="tier-label">Full Sales Support</div>
                </div>
                <div className="tier-price">$1,500<span>+</span></div>
              </div>
              <div className="tier-body">
                <ul>
                  <li>High-ticket closing support</li>
                  <li>Full sales pipeline management</li>
                  <li>Outreach copywriting &amp; scripts</li>
                  <li>Dedicated sales strategy sessions</li>
                  <li>Coaches, Agencies &amp; SaaS focus</li>
                </ul>
                <a href="https://wa.me/2348135980311?text=I'm%20interested%20in%20Full%20Sales%20Support%20Elite%20($1500+)" target="_blank" rel="noopener noreferrer" className="tier-btn">Get Started</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Book a free consultation and let&apos;s discuss how we can help you achieve your goals.</p>
        <a href="https://wa.me/2348135980311?text=Hello%2C%20I'd%20like%20to%20book%20a%20free%20consultation" target="_blank" rel="noopener noreferrer" className="cta-btn">Book Free Consultation</a>
      </section>

      {/* FOOTER */}
      <footer>
        <p style={{ marginBottom: "0.5rem", fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: "rgba(255,255,255,0.7)" }}>
          Eduxellence <strong>Solutions</strong>
        </p>
        <p>
          Copyright 2025 Eduxellence Solutions. All rights reserved. - Abuja, Nigeria -{" "}
          <a href="mailto:eduxellencesolutions@gmail.com">eduxellencesolutions@gmail.com</a>
        </p>
      </footer>
    </>
  );
}
