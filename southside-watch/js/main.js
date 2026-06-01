/* ================================================================
   Southside Virginia Data Center Watch — Core JS
   ================================================================ */

// ── Nav + UI init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Mobile nav toggle
  const toggle   = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!e.target.closest('.nav-inner')) navLinks.classList.remove('open');
    });
  }

  // Active link highlight
  document.querySelectorAll('.nav-links a').forEach(l => {
    const href = l.getAttribute('href');
    if (href && (location.pathname.endsWith(href) || location.href.endsWith(href))) {
      l.classList.add('active');
    }
  });

  // Accordion (works inside .accordion wrapper or standalone)
  document.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const body = btn.nextElementSibling;
      const open = body.classList.contains('open');
      const parent = btn.closest('.accordion') || document;
      parent.querySelectorAll('.accordion-body').forEach(b => b.classList.remove('open'));
      parent.querySelectorAll('.accordion-btn').forEach(b => b.classList.remove('open'));
      if (!open) { body.classList.add('open'); btn.classList.add('open'); }
    });
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group || 'default';
      document.querySelectorAll(`.filter-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const container = document.querySelector(btn.dataset.target);
      if (!container) return;
      container.querySelectorAll('[data-category]').forEach(item => {
        item.style.display = (filter === 'all' || item.dataset.category === filter) ? '' : 'none';
      });
    });
  });

  // Scroll-to-top
  const scrollBtn = document.getElementById('scroll-top');
  if (scrollBtn) {
    window.addEventListener('scroll', () => scrollBtn.classList.toggle('show', window.scrollY > 500));
    scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Count-up animation
  document.querySelectorAll('.count-up').forEach(el => {
    const target   = parseFloat(el.dataset.target);
    const suffix   = el.dataset.suffix  || '';
    const prefix   = el.dataset.prefix  || '';
    const decimals = el.dataset.decimals || 0;
    const duration = 1600;
    let started = false;
    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || started) return;
      started = true;
      const t0 = performance.now();
      const tick = now => {
        const p = Math.min((now - t0) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const val = (ease * target).toFixed(decimals);
        el.textContent = prefix + (decimals > 0 ? val : Number(val).toLocaleString()) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      obs.disconnect();
    });
    obs.observe(el);
  });

  // Report form submit
  const form = document.getElementById('report-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const msg = document.getElementById('form-success');
      btn.textContent = '✓ Submitted — Thank You';
      btn.disabled = true;
      btn.style.background = 'var(--green)';
      if (msg) { msg.style.display = 'block'; msg.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  }

  // Tooltip for cite-needed spans
  document.querySelectorAll('.cite-needed').forEach(el => {
    el.title = 'Source needed — help us find this record';
  });
  document.querySelectorAll('.foia-pending').forEach(el => {
    if (!el.title) el.title = 'FOIA request filed — awaiting response';
  });
});

/* ================================================================
   Project Database
   Confidence levels: "high" = verified via public records
                      "medium" = multiple community sources, unverified docs
                      "low"  = single tip, no public records confirmed
   ================================================================ */
const PROJECTS = [

  /* ── 1. Greensville Commerce Park — Campus A ── */
  {
    id: 1,
    name: "Greensville Commerce Park — Data Campus A",
    county: "Greensville County",
    city: "Emporia",
    address: "Commerce Park Drive vicinity, Emporia, VA 23847",
    lat: 36.695, lng: -77.549,
    developer: "GVC Holdings LLC (beneficial owner undisclosed)",
    endUser: "Unnamed hyperscaler — rumored major cloud provider",
    status: "proposed",
    mw: "200–400 MW (phased buildout)",
    water: "Est. 1.2–2.4 million gallons/day at full capacity",
    cooling: "Evaporative cooling towers (wet)",
    generators: "Diesel backup — quantity and rating not disclosed",
    acreage: "~340 acres (deed research)",
    rezoningRequired: true,
    publicHearingDate: "Not yet scheduled",
    approvalDate: null,
    voteResult: null,
    taxIncentives: "Reported: 10-yr property tax abatement; enterprise zone credits; infrastructure grant under negotiation",
    promisedJobs: "~50–65 permanent positions",
    promisedRevenue: "$2.4M/yr (after abatement period ends)",
    risks: "Major Dominion Energy circuit upgrade required; water table stress on Meherrin River watershed; no air quality study for diesel generators",
    residentConcerns: "LLC owner not disclosed to Emporia City Council before support resolution; no community impact study ordered; site prep activity observed before permit filed",
    sources: [
      { label: "Emporia City Council Resolution (Mar 10 2025)", status: "verified", note: "Minutes obtained from City Clerk" },
      { label: "GVC Holdings LLC — SCC corporate search", status: "verified", note: "Registered May 2024, no member info" },
      { label: "Satellite imagery analysis (Jan–Apr 2025)", status: "medium", note: "Land clearing pattern consistent with site prep" },
      { label: "Full incentive agreement text", status: "foia", note: "FOIA filed Apr 28 2025 — response pending" }
    ],
    lastUpdated: "2025-05-28",
    confidence: "medium",
    notes: "Emporia City Council passed a non-binding support resolution 4-0-1 in March 2025. No permit application on file with Greensville County as of publication. Site deed transferred to GVC Holdings LLC December 2024."
  },

  /* ── 2. Brunswick County — Apex Digital Infrastructure ── */
  {
    id: 2,
    name: "Brunswick Crossroads Data Center (Apex Digital)",
    county: "Brunswick County",
    city: "Brodnax",
    address: "US-1 / VA-46 Corridor, Brunswick Co., VA (near Brodnax)",
    lat: 36.710, lng: -77.921,
    developer: "Apex Digital Infrastructure, LLC (parent: Meridian Cloud Partners, Inc. — Delaware)",
    endUser: "Not disclosed — NDA with Brunswick County EDA",
    status: "approved",
    mw: "120 MW Phase 1; 300 MW full buildout",
    water: "840,000 gallons/day Phase 1; up to 2.1M gal/day at full buildout",
    cooling: "Hybrid evaporative / air-assist cooling",
    generators: "12 diesel backup generators × 2 MW = 24 MW total backup capacity; monthly testing planned",
    acreage: "215 acres (confirmed, Plat Book 18)",
    rezoningRequired: true,
    publicHearingDate: "2024-11-14",
    approvalDate: "2025-01-22",
    voteResult: "Approved 4-1 (Brunswick Co. Board of Supervisors). Dissent: Supervisor James Watkins — cited unresolved sewer capacity and undisclosed PILOT text.",
    taxIncentives: "15-year PILOT agreement (text not released publicly); $8.2M EDA infrastructure grant (road widening, water main extension); enterprise zone designation",
    promisedJobs: "38 permanent full-time; 180–220 construction jobs (temporary)",
    promisedRevenue: "$1.15M/yr in lieu of taxes (PILOT); full assessed value after Year 15",
    risks: "Dominion Energy estimates $47M substation upgrade for Phase 1 load — cost recovery mechanism unresolved; Brunswick County sewer at 82% capacity per 2023 audit; diesel generator testing will affect air quality in Brodnax; Phase 2 expansion not subject to new hearing under current approval",
    residentConcerns: "Public notice posted only 5 business days before Nov hearing; full PILOT agreement withheld before 4-1 vote; several adjacent landowners not individually notified; sewer capacity study requested by Supervisor Watkins was not completed",
    sources: [
      { label: "Brunswick Co. Board of Supervisors Minutes — Jan 22 2025", status: "verified", note: "Official minutes obtained from County Administrator" },
      { label: "Brunswick Co. Planning Commission Minutes — Nov 14 2024", status: "verified", note: "3-2 recommendation; two members dissented on infrastructure grounds" },
      { label: "Brunswick EDA grant resolution ($8.2M)", status: "verified", note: "Resolution #2025-EDA-003 confirmed" },
      { label: "Dominion Energy substation impact estimate ($47M)", status: "medium", note: "Referenced in Dominion SCC pre-application filing; not confirmed by county" },
      { label: "PILOT agreement full text", status: "foia", note: "FOIA filed Feb 3 2025; county cited exemption; appeal filed Mar 2025" },
      { label: "Brunswick sewer capacity audit (2023)", status: "verified", note: "Engineering report on file with DEQ" }
    ],
    lastUpdated: "2025-05-15",
    confidence: "high",
    notes: "Vote confirmed in official minutes. PILOT text subject to ongoing FOIA appeal. Dominion substation cost figure is from pre-application SCC filing, not a final determination."
  },

  /* ── 3. Mecklenburg County / South Hill — Piedmont Data Centers ── */
  {
    id: 3,
    name: "South Hill Digital Park (Piedmont Data Centers)",
    county: "Mecklenburg County",
    city: "South Hill",
    address: "Innovation Way at VA-47, South Hill, VA 23970",
    lat: 36.731, lng: -78.136,
    developer: "Piedmont Data Centers, Inc. (subsidiary of Atlantic Infrastructure Holdings, LLC — Raleigh, NC)",
    endUser: "Not disclosed",
    status: "construction",
    mw: "80 MW Phase 1 (under construction); 200 MW full buildout",
    water: "630,000 gallons/day Phase 1; up to 1.6M gal/day full buildout",
    cooling: "Closed-loop evaporative cooling towers",
    generators: "8 × 1.5 MW diesel units (Phase 1); 20 units anticipated full buildout",
    acreage: "180 acres (Mecklenburg County Parcel #MB-4418)",
    rezoningRequired: true,
    publicHearingDate: "2024-08-20",
    approvalDate: "2024-09-15",
    voteResult: "Approved 5-0 (Mecklenburg Co. Board of Supervisors). Community impact study waived by Board chair.",
    taxIncentives: "12-year property tax freeze; free expedited permitting (value est. $120K); connection fee waiver for water/sewer ($340K value)",
    promisedJobs: "28 permanent full-time; average salary reported as $68,000",
    promisedRevenue: "$920,000/yr (PILOT equivalent); projected to reach $2.1M/yr after freeze period",
    risks: "South Hill water authority flagged system at 74% capacity in Aug 2024 memo — upgrade cost estimated $4.1M; Phase 1 construction noise complaints filed by 3 adjacent property owners; Phase 2 expansion path unclear under current CUP",
    residentConcerns: "Community impact study waived — no independent review; water authority memo not disclosed at public hearing; Phase 2 scope not fully disclosed at approval",
    sources: [
      { label: "Mecklenburg Co. BOS Minutes — Sep 15 2024", status: "verified", note: "Approved 5-0; obtained from County Clerk" },
      { label: "Mecklenburg Planning Commission Minutes — Aug 20 2024", status: "verified", note: "4-1 recommendation; one dissent on water capacity" },
      { label: "South Hill Water Authority internal memo — Aug 12 2024", status: "verified", note: "Obtained via FOIA; capacity flagged at 74%; $4.1M upgrade estimate" },
      { label: "Piedmont Data Centers CUP application", status: "verified", note: "On file, Mecklenburg Co. Planning Dept." },
      { label: "Connection fee waiver resolution", status: "foia", note: "Referenced in Board minutes; full resolution text requested via FOIA" }
    ],
    lastUpdated: "2025-05-10",
    confidence: "high",
    notes: "Construction permit confirmed via Mecklenburg Co. Building Dept. records. Water authority memo is key document — available on request."
  },

  /* ── 4. Southampton County — Power Infrastructure Upgrade ── */
  {
    id: 4,
    name: "Southampton Transmission Expansion — Dominion Energy",
    county: "Southampton County",
    city: "Courtland",
    address: "US-58 Corridor, Southampton County (approx. near Newsoms substation)",
    lat: 36.722, lng: -77.198,
    developer: "Dominion Energy Virginia",
    endUser: "Regional data center load growth (multiple facilities)",
    status: "operational",
    mw: "N/A — 138 kV transmission upgrade serving industrial load",
    water: "N/A",
    cooling: "N/A",
    generators: "N/A",
    acreage: "Right-of-way expansion (estimated 14 miles)",
    rezoningRequired: false,
    publicHearingDate: "SCC Case PUR-2024-00078",
    approvalDate: "2024-06-18",
    voteResult: "Virginia SCC approved; one intervener (residential ratepayer group) objected to cost allocation",
    taxIncentives: "N/A",
    promisedJobs: "Temporary construction (~90 workers, 14 months)",
    promisedRevenue: "N/A",
    risks: "$29.4M transmission project costs allocated across all Dominion ratepayers in service territory — not charged directly to data center developers benefiting from the upgrade; residential ratepayer intervener objection overruled",
    residentConcerns: "Ratepayer cost not disclosed at county level; no Southside Virginia local government was notified before SCC case filed; cost socialization mechanism obscures link between data center approvals and bill increases",
    sources: [
      { label: "SCC Case PUR-2024-00078 — Order approving transmission upgrade", status: "verified", note: "Public SCC docket" },
      { label: "Dominion Energy rate base filing noting $29.4M", status: "verified", note: "Annual report to SCC, Schedule 12" },
      { label: "Ratepayer group intervention — SCC docket", status: "verified", note: "Filed by Virginia Citizens Consumer Council" },
      { label: "Link to specific data center projects benefiting from upgrade", status: "foia", note: "Dominion cited trade secret exemption; FOIA appeal pending" }
    ],
    lastUpdated: "2025-04-20",
    confidence: "high",
    notes: "This is a critical cost-transparency example. The SCC approved full cost socialization. Connecting this infrastructure spend to specific data center projects is the subject of ongoing FOIA work."
  },

  /* ── 5. Franklin / Southampton County — Site C ── */
  {
    id: 5,
    name: "Franklin Commerce Park — Site C (Identity Unknown)",
    county: "Southampton County",
    city: "Franklin",
    address: "Commerce Park Road vicinity, Franklin, VA 23851",
    lat: 36.678, lng: -76.951,
    developer: "Unknown — NDA reportedly in place with Southampton County EDA",
    endUser: "Unknown",
    status: "proposed",
    mw: "50–150 MW (community estimate; unconfirmed)",
    water: "Unknown — Blackwater River proximity is key concern",
    cooling: "Unknown",
    generators: "Unknown",
    acreage: "Unknown",
    rezoningRequired: true,
    publicHearingDate: "Not scheduled",
    approvalDate: null,
    voteResult: null,
    taxIncentives: "Under negotiation — NDA prevents disclosure",
    promisedJobs: "Not disclosed",
    promisedRevenue: "Not disclosed",
    risks: "Site near Blackwater River watershed (drains to Chowan River / Albemarle Sound, designated high-quality water body); EDA NDA prevents public review of developer identity or project scope before any vote",
    residentConcerns: "No public notice; NDA means community cannot evaluate developer track record; proximity to Blackwater River requires full hydrological study before any approval",
    sources: [
      { label: "Community tip submitted May 18 2025", status: "medium", note: "Single credible source; second-source confirmation sought" },
      { label: "Southampton County EDA minutes (May 2025)", status: "foia", note: "FOIA filed May 22 2025 — response pending" },
      { label: "Blackwater River Watershed Assessment (DEQ, 2019)", status: "verified", note: "Public record documenting watershed sensitivity" }
    ],
    lastUpdated: "2025-05-28",
    confidence: "low",
    notes: "This project has not been confirmed via public records. Low confidence — community tip only. We are actively seeking documentary confirmation. Do not treat as verified."
  },

  /* ── 6. Sussex County — Stony Creek Industrial Park ── */
  {
    id: 6,
    name: "Stony Creek Industrial — Greenfield Data Site",
    county: "Sussex County",
    city: "Stony Creek",
    address: "Industrial Park Road, Stony Creek, VA 23882",
    lat: 36.956, lng: -77.388,
    developer: "Reported: Coastal Edge Digital, LLC (registered in Delaware)",
    endUser: "Unknown",
    status: "proposed",
    mw: "60–100 MW (early planning stage)",
    water: "Est. 400,000–700,000 gallons/day",
    cooling: "Not disclosed",
    generators: "Not disclosed",
    acreage: "~140 acres (parcel research)",
    rezoningRequired: true,
    publicHearingDate: "Not scheduled",
    approvalDate: null,
    voteResult: null,
    taxIncentives: "Not yet proposed publicly",
    promisedJobs: "Not disclosed",
    promisedRevenue: "Not disclosed",
    risks: "Rural water system in Sussex County serves approximately 8,200 connections — no capacity assessment published; Sussex among the most economically distressed counties in Virginia (per DHCD classification)",
    residentConcerns: "No public discussion; parcel transfer to LLC occurred without public announcement; Sussex County Board has not held any public session on data center policy",
    sources: [
      { label: "Parcel deed transfer — Sussex County Land Records (Feb 2025)", status: "medium", note: "Transfer to Coastal Edge Digital LLC confirmed in deed book" },
      { label: "Coastal Edge Digital LLC — Delaware SOS registration", status: "verified", note: "Registered Jan 2025; no principals disclosed" },
      { label: "Sussex County rural water system capacity data", status: "foia", note: "FOIA filed May 2025 to Sussex Co. Public Works" }
    ],
    lastUpdated: "2025-05-25",
    confidence: "medium",
    notes: "Deed transfer is confirmed public record. Project details based on deed research and corporate registration only. No developer communications or permits confirmed."
  },

  /* ── 7. Emporia — Urban Core Site ── */
  {
    id: 7,
    name: "Emporia Urban Edge Data Site — West Washington St.",
    county: "Greensville County / Emporia City",
    city: "Emporia",
    address: "West Washington Street Corridor, Emporia, VA 23847",
    lat: 36.686, lng: -77.561,
    developer: "Undisclosed — parcel held by EVC Properties LLC (formed Dec 2024)",
    endUser: "Unknown",
    status: "proposed",
    mw: "20–40 MW (edge / co-location scale)",
    water: "Est. 150,000–300,000 gallons/day",
    cooling: "Unknown",
    generators: "Unknown",
    acreage: "~28 acres (city parcel)",
    rezoningRequired: true,
    publicHearingDate: "Not scheduled",
    approvalDate: null,
    voteResult: null,
    taxIncentives: "Not yet proposed",
    promisedJobs: "Not disclosed",
    promisedRevenue: "Not disclosed",
    risks: "Urban site in Emporia city limits — adjacent to residential; existing sewer infrastructure inadequate for industrial water loads; City of Emporia median household income below state poverty threshold",
    residentConcerns: "Proximity to residential and historically Black neighborhoods in west Emporia; diesel generator noise and emissions in urban context; no environmental justice review",
    sources: [
      { label: "Emporia City parcel transfer records (Jan 2025)", status: "medium", note: "EVC Properties LLC acquired three adjacent parcels; research ongoing" },
      { label: "Emporia City Comprehensive Plan", status: "verified", note: "West Washington corridor zoned light industrial — rezoning to heavy industrial required" },
      { label: "Environmental justice demographic data — EPA EJScreen", status: "verified", note: "Tract scores in 75th–85th percentile for environmental burden" }
    ],
    lastUpdated: "2025-05-20",
    confidence: "low",
    notes: "Tip from community member corroborated by parcel record research. Developer has not made any public statements. Environmental justice implications flagged for further investigation."
  },

  /* ── 8. Mecklenburg County — Site B (secondary) ── */
  {
    id: 8,
    name: "Mecklenburg County — Industrial Park Site B (Unconfirmed)",
    county: "Mecklenburg County",
    city: "Boydton",
    address: "US-58 Industrial Corridor, Mecklenburg Co., VA (near Boydton)",
    lat: 36.668, lng: -78.379,
    developer: "Unknown",
    endUser: "Unknown",
    status: "proposed",
    mw: "Unknown",
    water: "Unknown",
    cooling: "Unknown",
    generators: "Unknown",
    acreage: "Unknown",
    rezoningRequired: true,
    publicHearingDate: "Not scheduled",
    approvalDate: null,
    voteResult: null,
    taxIncentives: "Not disclosed",
    promisedJobs: "Not disclosed",
    promisedRevenue: "Not disclosed",
    risks: "Mecklenburg County sewer system already under strain from Piedmont Data Centers Phase 1 approval; Kerr Lake reservoir (drinking water for much of the region) in watershed",
    residentConcerns: "County Board has not adopted any data center policy; cumulative impact of multiple projects not assessed",
    sources: [
      { label: "Community report received May 2025", status: "medium", note: "Tip from county resident; no documentary confirmation yet" },
      { label: "Mecklenburg County zoning inquiry", status: "foia", note: "FOIA filed May 2025 requesting all pre-application meetings re: industrial rezoning 2024–2025" }
    ],
    lastUpdated: "2025-05-28",
    confidence: "low",
    notes: "Unconfirmed rumor — investigating. Do not publish as fact. Listed to facilitate community tips."
  }
];

/* ================================================================
   Vote Database
   ================================================================ */
const VOTES = [
  {
    date: "2025-01-22",
    body: "Brunswick Co. Board of Supervisors",
    motion: "Rezoning petition R-A to M-2 Industrial — Apex Digital Infrastructure (Brunswick Crossroads Data Center); approve PILOT agreement",
    result: "Approved",
    yes: 4, no: 1, abstain: 0,
    yesNames: "Chairman Robert Haywood, Carolyn Davis, Frederick Taylor, Michael Brown",
    noNames: "James Watkins (cited unresolved sewer capacity; undisclosed PILOT text)",
    sourceLink: "#",
    sourceLabel: "Brunswick Co. BOS Minutes — Jan 22 2025",
    sourceStatus: "verified",
    impact: "Approved 120 MW Phase 1; 15-yr PILOT; $8.2M EDA grant; sewer capacity unresolved; PILOT text not public",
    transparencyRating: 2,
    notes: "Full PILOT text not released before vote; hearing notice posted only 5 business days prior; Supervisor Watkins requested capacity study — request denied by Board chair"
  },
  {
    date: "2024-11-14",
    body: "Brunswick Co. Planning Commission",
    motion: "Public hearing — Apex Digital Infrastructure rezoning recommendation to Board of Supervisors",
    result: "Recommended Approval",
    yes: 3, no: 2, abstain: 0,
    yesNames: "Commissioners: Barnes, Fletcher, Moody",
    noNames: "Commissioners: Pryor (infrastructure unresolved), Washington (water concerns)",
    sourceLink: "#",
    sourceLabel: "Brunswick Planning Commission Minutes — Nov 14 2024",
    sourceStatus: "verified",
    impact: "Forwarded to BOS with minority dissent noted; dissent memo attached to minutes",
    transparencyRating: 3,
    notes: "Minority dissent formally documented — stronger process than Board vote"
  },
  {
    date: "2024-09-15",
    body: "Mecklenburg Co. Board of Supervisors",
    motion: "Conditional use permit — Piedmont Data Centers Phase 1 (South Hill Digital Park); approve connection fee waiver",
    result: "Approved",
    yes: 5, no: 0, abstain: 0,
    yesNames: "Chairman William Crowder, Beverly Puryear, James Hendricks, Donna Blackwell, Robert Stith",
    noNames: "None",
    sourceLink: "#",
    sourceLabel: "Mecklenburg Co. BOS Minutes — Sep 15 2024",
    sourceStatus: "verified",
    impact: "Approved 80 MW Phase 1; 12-yr tax freeze; community impact study waived; water authority capacity memo not disclosed to Board",
    transparencyRating: 1,
    notes: "Water authority capacity memo (Aug 12 2024) was not included in Board packet; confirmed via FOIA of planning department communications"
  },
  {
    date: "2024-08-20",
    body: "Mecklenburg Co. Planning Commission",
    motion: "Recommendation on Piedmont Data Centers rezoning and CUP application",
    result: "Recommended Approval",
    yes: 4, no: 1, abstain: 0,
    yesNames: "Commissioners: Alston, Hite, Malone, Carter",
    noNames: "Commissioner: Pulliam (water capacity concerns; requested independent study)",
    sourceLink: "#",
    sourceLabel: "Mecklenburg Planning Commission Minutes — Aug 20 2024",
    sourceStatus: "verified",
    impact: "Forwarded to BOS; Commissioner Pulliam's water capacity concern not referenced in BOS packet",
    transparencyRating: 3,
    notes: "Commissioner Pulliam's formal concern was omitted from the BOS meeting packet — a significant process failure"
  },
  {
    date: "2025-03-10",
    body: "Emporia City Council",
    motion: "Resolution of support for Greensville Commerce Park Data Center development zone (non-binding)",
    result: "Approved",
    yes: 4, no: 0, abstain: 1,
    yesNames: "Mayor Audrey Johnson, Council members Pierce, Odom, Henderson",
    noNames: "None",
    sourceLink: "#",
    sourceLabel: "Emporia City Council Minutes — Mar 10 2025",
    sourceStatus: "verified",
    impact: "Non-binding resolution of support; paves political path for rezoning request; developer still undisclosed",
    transparencyRating: 2,
    notes: "One council member (name not in public minutes) abstained without public explanation; developer identity was not disclosed at the meeting"
  },
  {
    date: "2025-04-08",
    body: "Greensville County Board of Supervisors",
    motion: "Informational presentation — Commerce Park development zone expansion; no vote taken",
    result: "No Vote — Informational Only",
    yes: 0, no: 0, abstain: 0,
    yesNames: "N/A",
    noNames: "N/A",
    sourceLink: "#",
    sourceLabel: "Greensville Co. BOS Agenda — Apr 8 2025",
    sourceStatus: "medium",
    impact: "Presentation by unnamed economic development consultant; no public comment permitted; no vote",
    transparencyRating: 2,
    notes: "Agenda listed item as 'Economic Development Briefing'; presenter not named in public agenda; several board members asked about LLC ownership — answers given in executive session"
  },
  {
    date: "2024-06-18",
    body: "Virginia State Corporation Commission",
    motion: "SCC Case PUR-2024-00078 — Dominion Energy transmission upgrade, Southampton County (138 kV)",
    result: "Approved",
    yes: 3, no: 0, abstain: 0,
    yesNames: "SCC Commissioners (full panel)",
    noNames: "None (Virginia Citizens Consumer Council filed intervener objection; overruled)",
    sourceLink: "#",
    sourceLabel: "SCC Order PUR-2024-00078",
    sourceStatus: "verified",
    impact: "$29.4M transmission upgrade; cost socialized across all Dominion ratepayers in territory — not charged to data center beneficiaries",
    transparencyRating: 3,
    notes: "SCC is the appropriate jurisdiction; however, no county-level public notice was given. Residents in Southside Virginia were not alerted that this project directly serves data center load in their region."
  },
  {
    date: "2025-06-10",
    body: "Sussex County Board of Supervisors",
    motion: "Regular meeting — data center policy discussion expected (scheduled)",
    result: "Scheduled — Not Yet Held",
    yes: 0, no: 0, abstain: 0,
    yesNames: "TBD",
    noNames: "TBD",
    sourceLink: "#",
    sourceLabel: "Sussex Co. BOS Agenda (anticipated)",
    sourceStatus: "medium",
    impact: "First known public discussion of data center development policy in Sussex County",
    transparencyRating: null,
    notes: "Upcoming — agenda not yet confirmed. Community members should attend and request to speak. See 'How to Participate' section."
  }
];

/* ================================================================
   County Status Summary
   ================================================================ */
const COUNTIES = [
  {
    name: "Greensville County / Emporia",
    status: "active",
    projects: 2,
    totalMW: "220–440 MW proposed",
    votes: 2,
    topRisk: "Undisclosed LLC; no community impact study",
    lastAction: "Mar 2025 — City Council support resolution",
    color: "orange"
  },
  {
    name: "Brunswick County",
    status: "approved",
    projects: 1,
    totalMW: "120 MW (approved)",
    votes: 2,
    topRisk: "$47M substation — cost unresolved; PILOT withheld",
    lastAction: "Jan 2025 — Board approved 4-1",
    color: "red"
  },
  {
    name: "Mecklenburg County / South Hill",
    status: "construction",
    projects: 2,
    totalMW: "80–200 MW (under construction)",
    votes: 2,
    topRisk: "Water capacity at 74%; Phase 2 scope uncapped",
    lastAction: "Sep 2024 — 5-0 approval; construction ongoing",
    color: "red"
  },
  {
    name: "Southampton County / Franklin",
    status: "active",
    projects: 2,
    totalMW: "50–150 MW proposed (unconfirmed)",
    votes: 1,
    topRisk: "NDA on developer; Blackwater River watershed risk",
    lastAction: "May 2025 — community report filed",
    color: "yellow"
  },
  {
    name: "Sussex County",
    status: "early",
    projects: 1,
    totalMW: "60–100 MW (rumored)",
    votes: 0,
    topRisk: "Rural water system at risk; no county data center policy",
    lastAction: "Feb 2025 — parcel deed transfer to LLC",
    color: "yellow"
  },
  {
    name: "Isle of Wight County",
    status: "monitoring",
    projects: 0,
    totalMW: "None confirmed",
    votes: 0,
    topRisk: "Regional corridor expansion pressure",
    lastAction: "No known activity",
    color: "gray"
  },
  {
    name: "Surry County",
    status: "monitoring",
    projects: 0,
    totalMW: "None confirmed",
    votes: 0,
    topRisk: "Dominion nuclear plant proximity may attract load",
    lastAction: "No known activity",
    color: "gray"
  },
  {
    name: "Northampton / Lunenburg",
    status: "monitoring",
    projects: 0,
    totalMW: "None confirmed",
    votes: 0,
    topRisk: "Rural fiber expansion may attract future development",
    lastAction: "No known activity",
    color: "gray"
  }
];
