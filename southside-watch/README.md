# Southside Virginia Data Center Watch

A civic transparency website tracking data center development, energy costs, water impacts, and public votes across Southside Virginia communities.

## Pages

- `index.html` — Homepage
- `map.html` — Interactive Leaflet map of all tracked projects
- `vote-tracker.html` — Every public vote on data centers
- `news.html` — News, documents, and FOIA tracker
- `energy.html` — Energy bills and grid impact
- `water.html` — Water and sewer impact
- `who-benefits.html` — Ownership and who benefits
- `tax-breaks.html` — Tax incentives and public money
- `questions.html` — Resident checklist (printable)
- `report.html` — Submit a concern or document
- `about.html` — About the project

## Structure

```
index.html
css/style.css
js/main.js
js/nav.js
assets/
```

## Tech Stack

Pure static HTML/CSS/JavaScript. No build system required. Leaflet.js for the interactive map.

## Local Development

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000
