# AI usage disclosure

This page separates who decided what, which AI tools helped build the project, and what the deployed website does at
runtime.

## Human contributions
- **What the team did.** The PARALLAX X team chose the project idea, the scientific questions and the mission scope.
  It set the requirements, the UX and brand direction, the priorities and every critical decision. That includes the
  decision to pre-register the study, report the FAILED validation and treat the Gobi sites as exploratory.
- **Interpretation.** Interpretations of the results are the team's.
- **Credits by name.** Individual contributions are not listed here because they have not been confirmed by each
  member. The concept films are credited to **Khuslen (V01D-404)** (see below).

## Claude Code (Anthropic): development assistant
- **What it did.** Claude Code was the primary coding assistant. Under the team's direction it generated or wrote most
  of the web application (Next.js, three.js), the Python science pipeline (`science/`), the tests and most of the
  documentation.
- **What is AI-generated.** We state this openly: much of the code was AI-generated and then reviewed, run and
  accepted by the team. It was not written entirely by hand.
- **Role-play critique.** During planning, Claude role-played seven "advisors" (planetary science, GIS, rover
  engineering, methods, UX, platform, judging) to critique the concept. **They are simulated, not real human
  experts.** No human expert reviewed this project unless a team member says so explicitly.
- **Development only.** Claude Code accesses an AI model *during development*. That does not mean the deployed
  website calls an AI API; see "What the live website does" below.

## ChatGPT (OpenAI): smaller, supporting role
- **What it was used for.** The team used ChatGPT to a smaller extent for research discussion, concept refinement,
  scientific explanations, critical feedback, scope selection and drafting prompts.
- **What it was not.** It was not the primary source-code tool. Discussion with a chatbot is not external scientific
  validation. Literature claims are cited to their sources and checked against DOIs or publisher pages where possible.

## Concept films (AI-generated)
- **What they are.** Five concept and motion films were created and provided by team member **Khuslen (V01D-404)**.
  They are AI-generated creative media, and several carry on-screen watermarks such as "AI-generated concept trailer"
  or "AI-generated video & voice".
- **Who made them.** The exact generation tools, voice and music sources, and editing steps are **to be confirmed by
  the creator**.
- **How they appear.** In the website they appear only in the optional **Films & concepts** gallery and behind
  "Watch the brand film" buttons. Each is labelled as an AI-generated concept, not app footage and not a scientific
  simulation.
- **More.** Details and rights status: [`VISUAL_ASSETS.md`](VISUAL_ASSETS.md).

## Other AI services
- No other AI services are known to have been used. If a team member used one, it should be added here.

## What the live website does (runtime)
- **No AI or LLM API calls.** The source contains no Claude API, Anthropic API, OpenAI API or other model endpoints,
  no API keys, and no environment-secret reads. This was checked by scanning `app/`, `components/`, `lib/` and
  `public/data/`.
- **No backend.** The site is a static export.
- **Its network requests.** Its own `public/` files, plus the concept films, which are streamed from the creator's
  GitHub repository only when a visitor presses play.
- **Ranking.** No machine-learning model was trained or is used. The F1–F5 / Wasserstein-1 ranking is a deterministic
  numerical computation on cited NASA, USGS and ESA data (`science/pipeline/`). The five Gobi candidates are
  exploratory, and the pre-registered validation **FAILED**.
- **Expedition Lab.** It uses deterministic protocol templates (`lib/expedition.ts`) filled only with values from
  `results.json` and `fieldtest.json`. Unknown properties stay labelled "not measured". It is not generated at
  runtime, and no field test has been performed.
- **Research analyst.** It uses rule-based sentence templates over `results.json`, labelled "not an AI model".
- **Terrain.** All 3D terrain is rendered from documented elevation data (NASA PDS HiRISE, USGS CTX, NASA NASADEM).
- **Logo.** The PARALLAX X logo is a vector reconstruction of the team's brand direction (`lib/brand.ts`).
- **Rover.** The rover is NASA/JPL-Caltech's Perseverance 3D model with the insignia removed
  ([`ROVER_MODEL.md`](ROVER_MODEL.md)).
- **AI-generated media.** The concept films (and their poster stills) are the only AI-generated media in the site.

## Short summary for the submission's "Use of AI" field
> We used Claude Code (Anthropic) as our primary coding assistant: under our direction it generated most of the web
> app, the Python science pipeline, tests and documentation, which we reviewed and ran. ChatGPT (OpenAI) was used to
> a smaller extent for research discussion and concept refinement. Team member Khuslen created AI-generated concept
> films, which are labelled as such. The deployed website makes no AI API calls: the analog ranking is deterministic
> computation on NASA/USGS/ESA data, no model was trained, and the field-test planner uses fixed templates. Planning
> "advisors" were AI role-play, not human experts.
