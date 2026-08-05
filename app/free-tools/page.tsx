"use client";

import Script from "next/script";

export default function FreeToolsPage() {
  return (
    <div className="ft-container">
      <div className="ft-header">
        <div className="ft-logo">EduXellence Analytics</div>
        <h1>Stop Spending Hours Cleaning Data Manually</h1>
        <p className="ft-subhead">Our free Python script automates the entire data cleaning pipeline in 4 seconds. Used by researchers at top African universities.</p>
      </div>

      <div className="ft-demo-box">
        <pre>{`BEFORE (messy CSV):
respondent_id, age,  gender, cgpa, date_submitted
1,             23,   MALE,   3.75, 15/01/2024
2,             N/A,  female, ,     2024-01-15
3,             999,  Male,   3.9,  Jan 16 2024

AFTER (clean):
respondent_id, age,  gender, cgpa, date_submitted
1,             23,   Male,   3.75, 2024-01-15
2,             23.5, Female, 3.7,  2024-01-15
3,             23.5, Male,   3.9,  2024-01-16`}</pre>
      </div>

      <div className="ft-form-container">
        <h2>Get the Free Script</h2>
        <p>Enter your email below. I&apos;ll send you the GitHub link immediately.</p>
        <div id="kit-form-slot"></div>
        <Script
          async
          data-uid="1cb3738d55"
          src="https://eduxellence-solutions-bright-horizon.kit.com/1cb3738d55/index.js"
          strategy="afterInteractive"
        />
      </div>

      <div className="ft-features">
        <div className="ft-feature">
          <div className="ft-feature-icon">1</div>
          <h3>Auto-Clean</h3>
          <p>Duplicates, nulls, outliers, fixed automatically</p>
        </div>
        <div className="ft-feature">
          <div className="ft-feature-icon">2</div>
          <h3>Date Standardisation</h3>
          <p>8 date formats to 1 standard</p>
        </div>
        <div className="ft-feature">
          <div className="ft-feature-icon">3</div>
          <h3>Currency Parsing</h3>
          <p>$1,200 to 1200.0 automatically</p>
        </div>
        <div className="ft-feature">
          <div className="ft-feature-icon">4</div>
          <h3>HTML Report</h3>
          <p>Beautiful audit trail of every fix</p>
        </div>
      </div>

      <div className="ft-testimonial">
        <p>&quot;Jeremiah delivered exceptional work, rigorous, well-structured, and thoroughly researched. Communication was excellent throughout.&quot;</p>
        <p><strong>- Alex Trufia</strong> *****</p>
      </div>

      <div className="ft-testimonial">
        <p>&quot;Jeremiah delivered on what I asked for and was able to identify my need. I would recommend Jeremiah for your project needs.&quot;</p>
        <p><strong>- Jason Yao</strong> *****</p>
      </div>

      <div className="ft-cta">
        <h3>Need More Than Just Data Cleaning?</h3>
        <p>We offer full statistical analysis, thesis support, and custom research infrastructure.</p>
        <p><a href="/#contact">Book a free 15-minute Data Strategy Audit</a></p>
      </div>

      <div className="ft-footer">
        <p>Built by <strong>Eduxellence Analytics</strong>, Abuja, Nigeria</p>
        <p><a href="/">eduxellence.org</a></p>
      </div>

      <style jsx>{`
        .ft-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 3rem 1.5rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          color: #1e293b;
          line-height: 1.6;
        }
        .ft-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .ft-logo {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #c8960c;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .ft-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          line-height: 1.2;
        }
        .ft-subhead {
          font-size: 1.2rem;
          color: #64748b;
          max-width: 600px;
          margin: 0 auto;
        }
        .ft-demo-box {
          background: #0f172a;
          color: #e2e8f0;
          padding: 1.5rem;
          border-radius: 12px;
          font-family: 'Courier New', monospace;
          font-size: 0.8rem;
          overflow-x: auto;
          margin: 2rem 0;
        }
        .ft-demo-box pre {
          margin: 0;
          white-space: pre-wrap;
        }
        .ft-form-container {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          margin: 2rem 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .ft-form-container h2 {
          margin-bottom: 0.5rem;
        }
        .ft-form-container p {
          color: #64748b;
          margin-bottom: 1.5rem;
        }
        .ft-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin: 2rem 0;
        }
        .ft-feature {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          text-align: center;
        }
        .ft-feature-icon {
          font-size: 1.5rem;
          font-weight: 700;
          color: #c8960c;
          display: block;
          margin-bottom: 0.5rem;
        }
        .ft-feature h3 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        .ft-feature p {
          font-size: 0.8rem;
          color: #64748b;
        }
        .ft-testimonial {
          background: #f1f5f9;
          padding: 1.5rem;
          border-radius: 12px;
          margin: 1.5rem 0;
          font-style: italic;
        }
        .ft-cta {
          background: #0f172a;
          color: white;
          text-align: center;
          padding: 2rem;
          border-radius: 16px;
          margin: 2rem 0;
        }
        .ft-cta a {
          color: #c8960c;
        }
        .ft-footer {
          text-align: center;
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }
        .ft-footer a {
          color: #c8960c;
        }
        @media (max-width: 600px) {
          .ft-header h1 { font-size: 1.8rem; }
          .ft-container { padding: 2rem 1rem; }
        }
      `}</style>
    </div>
  );
}
