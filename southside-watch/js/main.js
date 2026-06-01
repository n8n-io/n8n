/* ============================================================
   Southside Virginia Data Center Watch — Main JS
   ============================================================ */

// ── Nav Mobile Toggle ──
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  // Active nav link
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(l => {
    if (l.href === location.href || location.pathname.endsWith(l.getAttribute('href'))) {
      l.classList.add('active');
    }
  });

  // Accordion
  document.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const body = btn.nextElementSibling;
      const isOpen = body.classList.contains('open');
      // Close all
      document.querySelectorAll('.accordion-body').forEach(b => b.classList.remove('open'));
      document.querySelectorAll('.accordion-btn').forEach(b => b.classList.remove('open'));
      if (!isOpen) { body.classList.add('open'); btn.classList.add('open'); }
    });
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group || 'default';
      document.querySelectorAll(`.filter-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.filter;
      const container = document.querySelector(btn.dataset.target);
      if (!container) return;
      container.querySelectorAll('[data-category]').forEach(item => {
        if (target === 'all' || item.dataset.category === target) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // Scroll to top
  const scrollBtn = document.getElementById('scroll-top');
  if (scrollBtn) {
    window.addEventListener('scroll', () => {
      scrollBtn.classList.toggle('show', window.scrollY > 400);
    });
    scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Form validation (report form)
  const reportForm = document.getElementById('report-form');
  if (reportForm) {
    reportForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = reportForm.querySelector('[type="submit"]');
      btn.textContent = '✓ Report Submitted — Thank You';
      btn.disabled = true;
      btn.style.background = 'var(--green)';
      const note = document.getElementById('form-success');
      if (note) note.style.display = 'block';
    });
  }

  // Animate numbers
  document.querySelectorAll('.count-up').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1800;
    const start = performance.now();
    const update = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const val = target < 100 ? (ease * target).toFixed(1) : Math.round(ease * target).toLocaleString();
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(update);
    };
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { requestAnimationFrame(update); obs.disconnect(); }
    });
    obs.observe(el);
  });
});

// ── Sample Data ──
const PROJECTS = [
  {
    id: 1,
    name: "Greensville Commerce Park — DC Campus A",
    county: "Greensville County",
    city: "Emporia",
    address: "Commerce Park Dr, Emporia, VA 23847",
    lat: 36.686, lng: -77.543,
    developer: "Undisclosed (LLC shell)",
    endUser: "Rumored: major hyperscaler",
    status: "proposed",
    mw: "200–400 MW (estimated)",
    water: "1–2 million gallons/day",
    cooling: "Evaporative cooling towers",
    generators: "Diesel — quantity unknown",
    acreage: "320 acres",
    rezoningRequired: true,
    publicHearingDate: "TBD",
    approvalDate: null,
    voteResult: null,
    taxIncentives: "Proposed: 10-yr tax abatement, enterprise zone credits",
    promisedJobs: "~50 permanent",
    promisedRevenue: "$2.4M/yr (after abatement period)",
    risks: "Grid strain on Dominion Energy circuits; water table impact; diesel generator air quality",
    residentConcerns: "No public notice; secret LLC ownership; unknown power source",
    sources: ["https://example.com/greensville-notice"],
    lastUpdated: "2025-05-12",
    confidence: "medium",
    notes: "Site identified via satellite and deed research. No public permit filed as of publish date."
  },
  {
    id: 2,
    name: "Brunswick Industrial — Server Farm B",
    county: "Brunswick County",
    city: "Lawrenceville",
    address: "Hwy 58 Corridor, Brunswick Co., VA",
    lat: 36.754, lng: -77.842,
    developer: "Apex Digital Infrastructure, LLC",
    endUser: "Unknown",
    status: "approved",
    mw: "120 MW",
    water: "800,000 gallons/day",
    cooling: "Hybrid air/water cooling",
    generators: "12 diesel backup generators, 2MW each",
    acreage: "210 acres",
    rezoningRequired: true,
    publicHearingDate: "2024-11-14",
    approvalDate: "2025-01-22",
    voteResult: "4-1 in favor (Brunswick Co. Board of Supervisors)",
    taxIncentives: "15-yr PILOT agreement; $8M infrastructure grant from EDA",
    promisedJobs: "35 permanent, 200 construction",
    promisedRevenue: "$1.1M/yr",
    risks: "Sewer capacity at limit; Dominion Energy requesting $47M substation upgrade (cost unclear who pays)",
    residentConcerns: "Hearing held with 5 days notice; full PILOT agreement not released before vote",
    sources: ["https://example.com/brunswick-minutes"],
    lastUpdated: "2025-04-30",
    confidence: "high",
    notes: "Brunswick County Board minutes confirm vote. PILOT agreement obtained via FOIA."
  },
  {
    id: 3,
    name: "South Hill Technology Hub",
    county: "Mecklenburg County",
    city: "South Hill",
    address: "Industrial Blvd, South Hill, VA 23970",
    lat: 36.726, lng: -78.129,
    developer: "Piedmont Data Centers, Inc.",
    endUser: "Unknown",
    status: "construction",
    mw: "80 MW Phase 1; 200 MW total",
    water: "600,000 gallons/day Phase 1",
    cooling: "Closed-loop evaporative",
    generators: "8 diesel units, 1MW each",
    acreage: "180 acres",
    rezoningRequired: true,
    publicHearingDate: "2024-08-20",
    approvalDate: "2024-09-15",
    voteResult: "5-0 approved",
    taxIncentives: "12-yr property tax freeze; expedited permitting",
    promisedJobs: "28 permanent",
    promisedRevenue: "$900,000/yr",
    risks: "Local water authority flagged capacity concerns; noise complaints from adjacent residential",
    residentConcerns: "Community impact study not completed prior to approval",
    sources: [],
    lastUpdated: "2025-05-01",
    confidence: "high",
    notes: "Construction permit confirmed with Mecklenburg Co. Building Dept."
  },
  {
    id: 4,
    name: "Southampton Power Infrastructure Upgrade",
    county: "Southampton County",
    city: "Courtland",
    address: "Near US-58, Southampton Co., VA",
    lat: 36.724, lng: -77.082,
    developer: "Dominion Energy Virginia",
    endUser: "Serving regional data center load",
    status: "operational",
    mw: "N/A (transmission infrastructure)",
    water: "N/A",
    cooling: "N/A",
    generators: "N/A",
    acreage: "Unknown",
    rezoningRequired: false,
    publicHearingDate: "N/A",
    approvalDate: "2024-06-01",
    voteResult: "SCC approved",
    taxIncentives: "Cost socialized to ratepayers",
    promisedJobs: "Temporary construction",
    promisedRevenue: "N/A",
    risks: "Transmission upgrade costs ($29M) to be shared across all Dominion ratepayers in region",
    residentConcerns: "Ratepayer cost not publicly disclosed at time of approval",
    sources: [],
    lastUpdated: "2025-03-10",
    confidence: "medium",
    notes: "SCC filings confirm cost socialization mechanism."
  },
  {
    id: 5,
    name: "Franklin Commerce Park — Site C",
    county: "Southampton County",
    city: "Franklin",
    address: "Commerce Park Blvd, Franklin, VA 23851",
    lat: 36.678, lng: -76.936,
    developer: "Under NDA",
    endUser: "Unknown",
    status: "proposed",
    mw: "50–150 MW (rumored)",
    water: "Unknown",
    cooling: "Unknown",
    generators: "Unknown",
    acreage: "Unknown",
    rezoningRequired: true,
    publicHearingDate: "Pending",
    approvalDate: null,
    voteResult: null,
    taxIncentives: "Under negotiation",
    promisedJobs: "Unknown",
    promisedRevenue: "Unknown",
    risks: "Proximity to Blackwater River watershed",
    residentConcerns: "Community not informed; NDA prevents disclosure of developer identity",
    sources: [],
    lastUpdated: "2025-05-20",
    confidence: "low",
    notes: "Tip received from resident. No public records confirmed."
  }
];

const VOTES = [
  { date: "2025-01-22", body: "Brunswick Co. Board of Supervisors", motion: "Rezoning R-A to Industrial; approve Apex Digital data center", result: "Approved", yes: 4, no: 1, abstain: 0, officials: "Supervisors: Smith (Y), Jones (Y), Williams (Y), Davis (Y), Brown (N)", sourceLink: "#", impact: "Approved 120 MW facility; 15-yr PILOT; sewer capacity unresolved", transparencyRating: 2 },
  { date: "2024-09-15", body: "Mecklenburg Co. Board of Supervisors", motion: "Conditional use permit — Piedmont Data Centers Phase 1", result: "Approved", yes: 5, no: 0, abstain: 0, officials: "All supervisors present, names not in public minutes", sourceLink: "#", impact: "Approved 80 MW facility; community impact study waived", transparencyRating: 1 },
  { date: "2024-08-20", body: "Mecklenburg Co. Planning Commission", motion: "Recommendation for Piedmont Data Centers rezoning", result: "Approved", yes: 4, no: 1, abstain: 0, officials: "Planning commissioners — partial names in minutes", sourceLink: "#", impact: "Forwarded approval to Board of Supervisors", transparencyRating: 2 },
  { date: "2025-03-10", body: "Emporia City Council", motion: "Resolution supporting Greensville Commerce Park development zone", result: "Approved", yes: 4, no: 0, abstain: 1, officials: "Mayor Johnson (Y), Council members present; one abstention not explained", sourceLink: "#", impact: "Non-binding support resolution; paves way for rezoning request", transparencyRating: 2 },
  { date: "2024-11-14", body: "Brunswick Co. Planning Commission", motion: "Public hearing — Apex Digital Infrastructure rezoning", result: "Recommended Approval", yes: 3, no: 2, abstain: 0, officials: "Planning commission; two members objected on infrastructure grounds", sourceLink: "#", impact: "Sent to Board of Supervisors with minority dissent noted", transparencyRating: 3 },
];
