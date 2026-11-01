# RenewableOps

**Renewable Energy AI Operations Advisor** — a browser-based decision-support prototype for forecast-informed solar and wind generation estimates, battery scheduling, grid-import planning, and operational advisories.

**Live demo:** http://imaginative-hamster-36ff51.netlify.app

## Overview

RenewableOps combines hourly weather forecasts with user-entered plant scenario settings to estimate renewable generation and produce a 24-hour battery charge/discharge plan. It presents estimated grid energy and cost, battery reserve information, weather-related advisories, and illustrative renewable-output sensitivity scenarios.

This is an educational decision-support prototype. It does not control real plant equipment.

## Features

- Hourly weather forecast data from the Open-Meteo API for approximate Pinnapuram-area coordinates.
- Simplified solar and wind generation estimates.
- Manager prompt and editable plant scenario inputs.
- 24-hour battery scheduling using bounded heuristic search (Beam Search).
- Cost, renewable-use, and backup/reliability-oriented planning priorities.
- Weather risk assessment, operational precautions, and illustrative ±20% renewable-output scenarios.
- Battery constraints, reserve handling, and state merging.

## Technology

- HTML, CSS, and JavaScript
- Open-Meteo forecast API
- Netlify hosting
- Client-side planning logic; no separate backend server or trained ML model

## Run locally

1. Download or clone this repository.
2. Open the project folder in a terminal.
3. Start a local static web server:

   ```bash
   python -m http.server 8000
   ```

4. Open <http://localhost:8000> in your browser.

You can also open `index.html` directly, but using a local server is recommended for browser API behaviour.

## Repository structure

```text
RenewableOps/
├── index.html
├── styles.css
├── app.js
├── advisor.js
├── background.js
├── README.md
├── readme.md
├── .gitignore
└── docs/
    ├── RenewableOps_Technical_Report.docx
    └── RenewableOps_Presentation.pptx
```

## Documentation

- [`docs/RenewableOps_Technical_Report.docx`](docs/RenewableOps_Technical_Report.docx) — technical report and viva preparation guide.
- [`docs/RenewableOps_Presentation.pptx`](docs/RenewableOps_Presentation.pptx) — project presentation and worked planning example.

## AI concepts used

- **Rule-based reasoning:** interprets supported manager prompt terms and applies configured alert thresholds.
- **State-space search:** represents hourly battery decisions as candidate states.
- **Beam Search:** expands candidate schedules and retains a bounded set of promising states (beam width 120).
- **Heuristic evaluation:** estimates future grid requirements and applies reserve-shortfall penalties.
- **Sensitivity analysis:** reruns planning under illustrative 80% and 120% renewable-generation scenarios.

## Limitations and responsible use

- Weather values are forecasts for approximate coordinates, not live plant telemetry.
- Solar and wind generation use simplified estimation models, not detailed turbine or panel models.
- Weather advisories use configured forecast thresholds; they are not official IMD warnings or plant-sensor alerts.
- The ±20% scenarios are illustrative sensitivity tests, not statistical confidence intervals.
- Beam Search is approximate and does not guarantee a globally optimal schedule.
- The prototype does not automatically operate or control plant equipment.
- Hydro generation is not optimized without reservoir, inflow, head, and efficiency inputs.
- Maintenance prompts do not produce outage-adjusted dispatch unless outage details are modelled.

Always verify official weather warnings, site conditions, and operating procedures before making real operational decisions.

## Author

**A. Rishith Bhargav**  
Roll Number: **2024007395**  
AI Applications | Renewable Energy
