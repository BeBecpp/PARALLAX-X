# AI usage disclosure

PARALLAX X used AI assistance (Anthropic **Claude**, via Claude Code) as follows:

- **Research synthesis.** Claude checked challenge rules, data availability and prior art, and summarised published literature. Citations were checked against DOIs and publisher pages where possible. Anything not verified is marked "needs verification".
- **Simulated advisory critique.** During planning, seven AI role-play "advisors" critiqued the concept (planetary science, GIS, rover engineering, methods, UX, platform, judging). **They are not real human experts, and no human expert reviewed this project** unless a team member says so explicitly. Their reports are in `planning/ADVISORY_REVIEWS.md`.
- **Code generation.** Most of the science pipeline (`science/`) and the web application were written with Claude Code under the team's direction. The team chose the thesis and approved the plan.
- **Writing.** Claude drafted documentation text.

What AI was **not** used for:
- **No AI model was trained.** Rankings are deterministic computations on public elevation data (`science/pipeline/`).
- **No LLM produces any measurement, rank or score.** The app makes no live AI calls.
- **The in-app "Research analyst" is rule-based, not AI.** It answers five fixed questions with sentence templates filled from `results.json` at runtime, and lists the exact fields it used. It is labelled "Rule-based · not an AI model" in the UI. A live Claude explainer was **intentionally omitted**: the site is a static export with no server, and putting an API key in the browser would expose it.
- **No AI-generated imagery appears in the application.** Every terrain view is rendered from real elevation data. The PARALLAX X logo in the app is a self-authored vector reconstruction (lib/brand.ts) of the team's brand direction; no raster AI image is embedded. The team's earlier AI-generated brand concept boards are **not** used in the public app. If any are used in submission media, they must carry a visible "AI-generated" watermark and must not include NASA marks.

Per the NASA Space Apps 2026 Project Submission Guide, the team should also list these tools in the submission's "Use of SI" field.

- **Expedition Lab protocols** are deterministic templates written with Claude Code and reviewed for honesty rules.
  - They are not generated at runtime, and no model fills in values.
  - The numbers come from `results.json` / `fieldtest.json`.
  - Every physical property without data is labelled not measured.

