/* Shared nav/footer injection */
const NAV_HTML = `
<nav class="nav">
  <div class="nav-inner">
    <a href="index.html" class="nav-brand">
      <div class="nav-brand-icon">⚡</div>
      <div>
        <div class="nav-brand-text">Southside VA</div>
        <div class="nav-brand-sub">Data Center Watch</div>
      </div>
    </a>
    <button class="nav-toggle" aria-label="Menu">☰</button>
    <div class="nav-links">
      <a href="index.html">Home</a>
      <a href="map.html">Map</a>
      <a href="energy.html">Energy Bills</a>
      <a href="water.html">Water &amp; Sewer</a>
      <a href="who-benefits.html">Who Benefits?</a>
      <a href="tax-breaks.html">Tax Breaks</a>
      <a href="vote-tracker.html">Vote Tracker</a>
      <a href="questions.html">Questions to Ask</a>
      <a href="news.html">News &amp; Docs</a>
      <a href="report.html"><span class="nav-alert">Report</span></a>
      <a href="about.html">About</a>
    </div>
  </div>
</nav>`;

const FOOTER_HTML = `
<footer>
  <div class="container">
    <div class="footer-cta">
      <p>Jobs matter. Water matters. Power bills matter. Transparency matters.</p>
      <small>Help us track data center development in Southside Virginia. Submit a tip, share a document, or report a concern.</small>
    </div>
    <div class="footer-grid">
      <div class="footer-brand">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem">
          <div style="width:32px;height:32px;background:var(--orange);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--navy)">⚡</div>
          <span style="font-weight:700">Southside VA Data Center Watch</span>
        </div>
        <p>A public-interest transparency project tracking data center development, energy costs, water impacts, and public decisions across Southside Virginia.</p>
        <p style="margin-top:.5rem">This is not a legal service. We are not affiliated with any government or corporation. All information is gathered from public records, community reports, and investigative research.</p>
      </div>
      <div class="footer-col">
        <h4>Pages</h4>
        <a href="map.html">Interactive Map</a>
        <a href="energy.html">Energy Bills</a>
        <a href="water.html">Water &amp; Sewer</a>
        <a href="who-benefits.html">Who Benefits?</a>
        <a href="tax-breaks.html">Tax Breaks</a>
      </div>
      <div class="footer-col">
        <h4>Accountability</h4>
        <a href="vote-tracker.html">Vote Tracker</a>
        <a href="questions.html">Questions to Ask</a>
        <a href="news.html">News &amp; Docs</a>
        <a href="report.html">Report a Concern</a>
        <a href="about.html">About This Project</a>
      </div>
      <div class="footer-col">
        <h4>Communities</h4>
        <a href="#">Emporia</a>
        <a href="#">Greensville County</a>
        <a href="#">Brunswick County</a>
        <a href="#">South Hill</a>
        <a href="#">Franklin</a>
        <a href="#">Southampton County</a>
        <a href="#">Mecklenburg County</a>
        <a href="#">Sussex County</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2025 Southside VA Data Center Watch. Public interest project. Not affiliated with any government or corporation.</p>
      <p>All data sourced from public records, FOIA requests, community reports, and investigative research.</p>
    </div>
  </div>
</footer>
<button id="scroll-top" aria-label="Back to top">↑</button>`;

document.addEventListener('DOMContentLoaded', () => {
  const navEl = document.getElementById('nav-placeholder');
  const footerEl = document.getElementById('footer-placeholder');
  if (navEl) navEl.outerHTML = NAV_HTML;
  if (footerEl) footerEl.outerHTML = FOOTER_HTML;
});
