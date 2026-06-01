/* Shared nav + footer injection */
const NAV_HTML = `
<nav class="nav">
  <div class="nav-inner">
    <a href="index.html" class="nav-brand">
      <div class="nav-brand-icon">⚡</div>
      <div>
        <div class="nav-brand-name">Southside VA Data Center Watch</div>
        <div class="nav-brand-sub">Civic Transparency Project</div>
      </div>
    </a>
    <button class="nav-toggle" aria-label="Open menu">☰</button>
    <div class="nav-links">
      <a href="index.html">Home</a>
      <a href="map.html">Map</a>
      <a href="energy.html">Energy Bills</a>
      <a href="water.html">Water &amp; Sewer</a>
      <a href="who-benefits.html">Who Benefits?</a>
      <a href="tax-breaks.html">Tax Breaks</a>
      <a href="vote-tracker.html">Vote Tracker</a>
      <a href="questions.html">Checklist</a>
      <a href="news.html">News &amp; Docs</a>
      <a href="about.html">About</a>
      <a href="report.html" class="nav-report-btn">⚑ Report</a>
    </div>
  </div>
</nav>`;

const FOOTER_HTML = `
<footer>
  <div class="container">
    <div class="footer-cta-bar">
      <p>Jobs matter. Water matters. Power bills matter. <span style="color:var(--orange)">Transparency matters.</span></p>
      <small>Help us track data center development in Southside Virginia — submit a tip, share a document, report a concern.</small>
    </div>
    <div class="footer-grid">
      <div class="footer-brand">
        <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.6rem">
          <div style="width:32px;height:32px;background:var(--orange);border-radius:6px;display:grid;place-items:center;font-weight:900;color:var(--navy);font-size:1rem;box-shadow:0 2px 8px rgba(249,115,22,.35)">⚡</div>
          <span style="font-weight:700;font-size:.9rem">Southside VA Data Center Watch</span>
        </div>
        <p>A public-interest transparency project tracking data center development, energy costs, water impacts, and public decisions across Southside Virginia. Not affiliated with any government, corporation, or political party.</p>
        <p style="margin-top:.6rem">All data sourced from public records, FOIA requests, community reports, and investigative research. Confidence levels are shown for every data point.</p>
      </div>
      <div class="footer-col">
        <h5>Investigation</h5>
        <a href="map.html">Interactive Map</a>
        <a href="energy.html">Energy Bills</a>
        <a href="water.html">Water &amp; Sewer</a>
        <a href="who-benefits.html">Who Benefits?</a>
        <a href="tax-breaks.html">Tax Breaks</a>
      </div>
      <div class="footer-col">
        <h5>Accountability</h5>
        <a href="vote-tracker.html">Vote Tracker</a>
        <a href="questions.html">Resident Checklist</a>
        <a href="news.html">News &amp; Documents</a>
        <a href="report.html">Report a Concern</a>
        <a href="about.html">About This Project</a>
      </div>
      <div class="footer-col">
        <h5>Communities</h5>
        <a href="map.html">Emporia / Greensville</a>
        <a href="map.html">Brunswick County</a>
        <a href="map.html">South Hill / Mecklenburg</a>
        <a href="map.html">Franklin / Southampton</a>
        <a href="map.html">Sussex County</a>
        <a href="map.html">Surry County</a>
        <a href="map.html">Isle of Wight</a>
        <a href="map.html">All Communities</a>
      </div>
    </div>
    <hr class="footer-divider">
    <div class="footer-bottom">
      <p>© 2025 Southside VA Data Center Watch. Public interest project. Not a legal service. Not affiliated with any government or corporation.</p>
      <p>Errors and corrections: <a href="report.html" style="color:var(--blue-bright)">Submit via Report form</a> · All verified corrections published within 48 hours.</p>
    </div>
  </div>
</footer>
<button id="scroll-top" aria-label="Back to top" title="Back to top">↑</button>`;

document.addEventListener('DOMContentLoaded', () => {
  const navEl    = document.getElementById('nav-placeholder');
  const footerEl = document.getElementById('footer-placeholder');
  if (navEl)    navEl.outerHTML    = NAV_HTML;
  if (footerEl) footerEl.outerHTML = FOOTER_HTML;
});
