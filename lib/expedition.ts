/**
 * EXPEDITION LAB — deterministic field-test dossiers for the exploratory Earth candidates.
 *
 * Pure functions: (results.json, fieldtest.json, candidate, experiment) -> dossier. Every value is either read from
 * those files (and labelled with its evidence class and source field) or explicitly marked as not measured.
 * Nothing here estimates traction, sinkage, drill performance, battery endurance or temperature. The dossier is a
 * PROPOSAL for a future experiment; no field test has been performed.
 */
import type { FieldTest } from "./data";
import type { Results } from "./types";

export type EvidenceClass = "measured" | "derived" | "contextual" | "not-measured" | "field-required";
export type ExperimentId = "mobility" | "sampling" | "thermal";

export const EVIDENCE_LABEL: Record<EvidenceClass, string> = {
  measured: "Measured",
  derived: "Derived",
  contextual: "Contextual",
  "not-measured": "Not measured",
  "field-required": "Field verification required",
};

export const EVIDENCE_HELP: Record<EvidenceClass, string> = {
  measured: "A value computed from documented source data.",
  derived: "An explicit calculation based on measured inputs.",
  contextual: "Information from a relevant external source, with scale and limitations.",
  "not-measured": "A property with no sufficient evidence.",
  "field-required": "An open scientific or engineering question.",
};

export interface Evidence {
  label: string;
  value: string;
  cls: EvidenceClass;
  source?: string;
  note?: string;
}

export interface Citation {
  text: string;
  url?: string;
}

export interface Formula {
  name: string;
  expr: string;
  note: string;
}

export interface Dossier {
  experiment: ExperimentId;
  title: string;
  question: string;
  candidate: { id: string; lon: number; lat: number; nWindows: number; areaKm2: number; bestWindow: string; sceneId: string };
  objective: string;
  hypothesis: string;
  evidence: Evidence[];
  instruments: string[];
  procedure: string[];
  variables: { name: string; unit: string; status: string }[];
  criteria: string[];
  limitations: string[];
  citations: Citation[];
  disclaimer: string;
  /** physical properties this experiment exists to measure — always unknown until field data exist */
  unknowns: string[];
  formulas: Formula[];
  roverConfig: string[];
  trials: string[];
  qualityChecks: string[];
  environment: string[];
  safety: string[];
  impact: string;
}

/** Aliases matching the planning vocabulary used in the docs. */
export type ExperimentType = ExperimentId;
export type FieldExperimentProtocol = Dossier;
export type UncertaintyStatus = EvidenceClass;
export type SourceReference = Citation;

export const EXPERIMENTS: { id: ExperimentId; n: string; title: string; question: string }[] = [
  { id: "mobility", n: "01", title: "Wheel mobility", question: "Could a rover traverse terrain like this, and what would we need to measure to find out?" },
  { id: "sampling", n: "02", title: "Rock sampling & drilling", question: "Would this Earth candidate be suitable for testing a rover's sampling workflow?" },
  { id: "thermal", n: "03", title: "Thermal & energy", question: "Could the candidate support a useful thermal or energy-system field test?" },
];

const CITE = {
  nasadem: { text: "NASA JPL (2020). NASADEM Merged DEM Global 1 arc second V001. NASA EOSDIS LP DAAC.", url: "https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001" },
  ctx: { text: "USGS Astrogeology, controlled MRO CTX DTM P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W (CC0).", url: "https://astrogeology.usgs.gov" },
  prereg: { text: "PARALLAX X pre-registration and primary run (science/prereg.md, public/data/results.json)." },
  wong: { text: "Wong, J. Y. (2008). Theory of Ground Vehicles, 4th ed. Wiley. (Slip and sinkage definitions.)" },
  bekker: { text: "Bekker, M. G. (1969). Introduction to Terrain-Vehicle Systems. University of Michigan Press. (Bevameter method.)" },
  maimone: { text: "Maimone, M., Cheng, Y. & Matthies, L. (2007). Two years of visual odometry on the Mars Exploration Rovers. Journal of Field Robotics 24(3), 169–186." },
  zacny: { text: "Zacny, K. et al. (2008). Drilling systems for extraterrestrial subsurface exploration. Astrobiology 8(3), 665–706." },
  marsFacts: { text: "NASA NSSDCA Mars Fact Sheet (gravity 3.71 m/s², mean surface pressure ≈ 0.6 kPa).", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html" },
  rems: { text: "Gómez-Elvira, J. et al. (2014). Curiosity's rover environmental monitoring station: overview of the first 100 sols. JGR Planets 119, 1680–1688." },
};

const r2 = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? null : v.toFixed(d));
const pct = (v: number | null | undefined) => (v === null || v === undefined ? null : `${(v * 100).toFixed(1)}%`);

/** Candidate identity from results.json (cluster centroid, best window and its comparison scene). */
export function candidateOf(r: Results, id: string) {
  const c = r.candidates.find((x) => x.id === id);
  if (!c) return null;
  return { id: c.id, lon: c.centroid[0], lat: c.centroid[1], nWindows: c.n_windows, areaKm2: c.area_km2, bestWindow: c.best_window ?? "—", sceneId: c.compare_scene_id ?? "" };
}

/** Terrain evidence shared by every experiment: pre-registered features (measured) + post-hoc layers. */
export function terrainEvidence(r: Results, ft: FieldTest | null, id: string): Evidence[] {
  const c = r.candidates.find((x) => x.id === id);
  const scene = c ? r.compare_scenes.find((s) => s.id === c.compare_scene_id) : undefined;
  const mars = r.mars?.median_raw ?? {};
  const raw = scene?.median_raw ?? {};
  const out: Evidence[] = [];
  if (scene) {
    out.push({
      label: "Fingerprint rank (best window)",
      value: `${r2(scene.pct_full, 2)}th percentile of ${r.null_set.n_windows.toLocaleString("en-US")} declared Earth windows`,
      cls: "measured",
      source: `results.json › compare_scenes[${scene.id}].pct_full`,
      note: "Terrain geometry only. The pre-registered validation of this method FAILED, so the rank is an exploratory lead, not evidence of an analog.",
    });
  }
  const feat = (k: string, label: string, unit: string, d = 2) => {
    if (raw[k] === undefined) return;
    out.push({
      label,
      value: `${r2(raw[k], d)} ${unit} (Mars CTX ${r2(mars[k], d)} ${unit})`,
      cls: "measured",
      source: `results.json › compare_scenes.median_raw.${k} · mars.median_raw.${k}`,
      note: "Median over the 10 km window on the common 30 m grid.",
    });
  };
  feat("F2", "DEM slope, 180 m baseline (F2 median)", "°");
  feat("F3", "DEM slope, 600 m baseline (F3 median)", "°");
  feat("F1", "Local relief, 1.98 km cells (F1 median)", "m", 1);
  const rough = ft?.roughness.candidate_clusters[id];
  const mr = ft?.roughness.scenes.cmp_mars;
  if (rough && mr) {
    out.push({
      label: "Detrended RMS roughness, 330 m cells (post-hoc)",
      value: `median ${r2(rough["330m"].median_m)} m, P90 ${r2(rough["330m"].p90_m)} m (Mars CTX median ${r2(mr["330m"].median_m)} m)`,
      cls: "derived",
      source: "fieldtest.json › roughness.candidate_clusters · science/pipeline/fieldtest_posthoc.py",
      note: "RMS of plane-fit residuals on the 30 m grid. Describes 30–330 m relief texture, not rocks or wheel-scale hazards.",
    });
  }
  const wc = ft?.worldcover.candidates[id];
  if (wc && ft) {
    out.push({
      label: `Surface cover · ESA WorldCover ${ft.worldcover.year} (10 m)`,
      value: `Bare / sparse vegetation ${pct(wc.cluster.fractions["Bare / sparse vegetation"]) ?? "—"}, grassland ${pct(wc.cluster.fractions["Grassland"] ?? 0)}`,
      cls: "contextual",
      source: "fieldtest.json › worldcover.candidates",
      note: "Satellite land-cover class (global overall accuracy 76.7 % ± 0.5). It does not identify sand, gravel, rock or crust.",
    });
  }
  out.push({ label: "Elevation data resolution", value: "NASADEM 1 arc-second, analysed on a 30 m grid (Gaussian σ = 30 m)", cls: "contextual", source: "sources.json › nasadem", note: "Features smaller than ~60 m are not resolved." });
  return out;
}

/** "Why this location?" — what matches, what is uncertain, what must be tested. */
export function whyThisLocation(r: Results, id: string) {
  const c = r.candidates.find((x) => x.id === id);
  const scene = c ? r.compare_scenes.find((s) => s.id === c.compare_scene_id) : undefined;
  const w1 = scene?.per_feature_w1 ?? {};
  const name = (k: string) => r.features.find((f) => f.id === k)?.name ?? k;
  const sorted = Object.entries(w1).sort((a, b) => a[1] - b[1]);
  const matches: Evidence[] = sorted.slice(0, 3).map(([k, v]) => ({
    label: name(k),
    value: `W1 = ${v.toFixed(3)} (normalised 0–1; smaller is closer to Mars)`,
    cls: "measured",
    source: `results.json › compare_scenes[${scene?.id}].per_feature_w1.${k}`,
    note: "Distribution of a 30 m terrain-shape feature, not a geological match.",
  }));
  const uncertain: Evidence[] = [
    { label: "Formation process", value: "Unknown — wind erosion not verified", cls: "field-required", note: "The Namib dune control ranked 85.1: similar shape can come from different processes." },
    { label: "Material composition", value: "Not measured", cls: "not-measured", note: "No verified lithology at the candidate in this project." },
    { label: "Soil mechanics", value: "Not measured", cls: "not-measured" },
    { label: "Fine-scale roughness", value: "Not resolved by a 30 m grid", cls: "not-measured" },
    { label: "Environmental conditions", value: "Not assessed", cls: "not-measured" },
    { label: "Sensor differences", value: "Mars CTX stereo DTM vs Earth NASADEM (SRTM-based); both resampled to 30 m", cls: "contextual" },
    { label: "Field verification", value: "None performed", cls: "field-required" },
  ];
  return { matches, uncertain };
}

export function buildDossier(r: Results, ft: FieldTest | null, id: string, exp: ExperimentId): Dossier | null {
  const cand = candidateOf(r, id);
  if (!cand) return null;
  const meta = EXPERIMENTS.find((e) => e.id === exp)!;
  const terrain = terrainEvidence(r, ft, id);
  const common = {
    experiment: exp,
    title: `${meta.title} field test · ${id}`,
    question: meta.question,
    candidate: cand,
    disclaimer: "Proposal for a future experiment. No field test has been performed and no result below is a measurement of rover performance.",
  };
  if (exp === "mobility") {
    return {
      ...common,
      objective: `Measure how a wheeled rover actually moves over the terrain of exploratory candidate ${id}, and whether its 30 m slope and relief statistics predict that behaviour.`,
      hypothesis: "Wheel slip and sinkage measured on routes of known slope will differ between surface types in ways that a 30 m DEM cannot predict.",
      evidence: [
        ...terrain,
        { label: "Traction", value: "Not measured", cls: "not-measured" },
        { label: "Wheel sinkage", value: "Not measured", cls: "not-measured" },
        { label: "Rover mobility", value: "Requires physical testing", cls: "field-required" },
      ],
      instruments: [
        "Wheel encoders (wheel rotation ω) and motor-current sensors",
        "Ground-truth positioning: RTK-GNSS or total station (travel distance and speed)",
        "Sinkage measurement: wheel-rut depth profiling (laser line or photogrammetry)",
        "Cone penetrometer and, if available, a bevameter for soil strength",
        "Inclinometer / IMU and a short-baseline route survey for actual slope",
        "Camera survey of rocks and obstacles along each route",
      ],
      procedure: [
        "Select routes inside the candidate footprint that span the DEM slope range shown above; record GNSS start and end points.",
        "Survey each route at ≤ 1 m resolution (photogrammetry or lidar) to measure actual slope and obstacles.",
        "Characterise ground material at each route: grain size, cone-penetrometer index, moisture.",
        "Drive each route at constant commanded speed, repeating each run ≥ 3 times per direction.",
        "Log wheel rotation, motor current, IMU attitude and ground-truth position at a fixed rate.",
        "Measure rut depth at marked stations after each run.",
      ],
      variables: [
        { name: "Wheel rotation ω", unit: "rad/s", status: "not measured" },
        { name: "Travel distance and speed (ground truth)", unit: "m, m/s", status: "not measured" },
        { name: "Slip ratio i = 1 − v / (r·ω)", unit: "—", status: "not measured" },
        { name: "Wheel sinkage", unit: "mm", status: "not measured" },
        { name: "Motor current", unit: "A", status: "not measured" },
        { name: "Ground material (grain size, penetration resistance)", unit: "mm, kPa", status: "not measured" },
        { name: "Actual route slope", unit: "°", status: "not measured" },
        { name: "Obstacle size and density", unit: "m, count/m²", status: "not measured" },
      ],
      criteria: [
        "Report slip ratio and sinkage as mean ± SD per slope bin and per material class; state the number of runs.",
        "Compare field-measured route slope with the DEM slope at the same location to quantify the 30 m resolution error.",
        "Acceptance thresholds for slip, sinkage and energy per metre: TO BE DEFINED from explicit mission or hardware requirements (none are supplied, so none are invented here).",
        "The site is useful for mobility testing only if results are repeatable across trials and span the conditions of interest.",
      ],
      limitations: [
        "Earth gravity (9.81 m/s²) is about 2.6× Mars gravity (3.71 m/s²): wheel loads and slip will differ from Mars.",
        "The 30 m DEM cannot resolve rocks, ripples or wheel-scale slopes.",
        "WorldCover classes describe surface cover, not soil strength.",
        "The rover animation in this app follows a hand-drawn loop on the Mars HiRISE scene; it is a visualization, not a mobility simulation.",
      ],
      citations: [CITE.prereg, CITE.nasadem, CITE.ctx, CITE.wong, CITE.bekker, CITE.maimone, CITE.marsFacts],
      unknowns: ["Wheel traction", "Soil bearing strength", "Wheel sinkage", "Soil shear strength", "Rock and obstacle distribution at wheel scale", "Mobility safety"],
      formulas: [
        { name: "Wheel slip ratio", expr: "s = 1 − v_ground / (r · ω)", note: "Driven-wheel convention, valid for r·ω > 0. Needs a calibrated effective radius r, wheel speed ω from encoders and an independent ground speed v_ground. Interpretation depends on the slip convention and operating regime. Not computed here: no field inputs exist." },
        { name: "Energy per distance", expr: "E/d = ∫ V · I dt / d_measured", note: "Integrate logged bus voltage × current over the run and divide by ground-truth travel distance. Sensor accuracy and sampling rate set the uncertainty. Not computed here." },
        { name: "Wheel sinkage", expr: "z = h_reference − h_rut", note: "Depth of the rut below a documented reference surface, measured at marked stations during controlled trials. Not measured." },
      ],
      roverConfig: ["Rover mass and wheel load per wheel (or known ballast configuration)", "Wheel diameter, width, grouser geometry and calibrated effective radius", "Commanded speed and control mode", "Tyre/wheel material and condition", "Sensor models, sampling rates and calibration records"],
      trials: ["≥ 3 repeats per route, per direction and per commanded speed", "Randomise run order across routes and slopes", "Include a firm, level reference surface as a baseline in every session"],
      qualityChecks: ["Encoder and current-sensor calibration before and after each session", "Ground-truth position accuracy documented (RTK fix quality)", "Reject runs with wheel-to-ground contact loss, obstacle strikes or logging gaps; record the reason", "Cross-check rut depth by two methods at a subset of stations"],
      environment: ["Air temperature and wind", "Soil moisture and recent precipitation", "Surface condition (crust, loose layer thickness)", "Time of day and illumination for imaging"],
      safety: ["Site access, land ownership and permits in Mongolia must be confirmed before travel", "Field team safety plan for remote desert operations (water, heat/cold, communications)", "Rover tether or stop procedure on slopes"],
      impact: "The available terrain data can identify questions worth investigating. Real wheel–soil measurements are required to determine mobility performance.",
    };
  }
  if (exp === "sampling") {
    return {
      ...common,
      objective: `Determine whether exploratory candidate ${id} offers verified, accessible rock or sediment targets for rehearsing a rover sampling and drilling workflow.`,
      hypothesis: "Field identification will show whether the candidate's surface is consolidated rock, loose sediment or a mix — something its terrain shape alone cannot reveal.",
      evidence: [
        ...terrain.filter((e) => /Fingerprint|WorldCover|resolution/i.test(e.label)),
        { label: "Regional lithology data", value: "Not integrated in this project", cls: "not-measured", note: "Geological maps exist for Mongolia but were not obtained or verified here." },
        { label: "Rock type at the candidate", value: "Not verified", cls: "field-required" },
        { label: "Rock strength, induration, abrasivity", value: "Not measured", cls: "not-measured" },
        { label: "Drill success", value: "Cannot be inferred from topography", cls: "field-required" },
      ],
      instruments: [
        "Field geology kit: hand lens, hammer, GPS-tagged photography, sample bags",
        "Schmidt hammer or point-load tester (rock strength)",
        "Instrumented rotary-percussive test drill with torque, thrust and power logging",
        "Depth and penetration-rate logging; drill-bit wear inspection",
        "Core / cuttings recovery containers and mass balance",
      ],
      procedure: [
        "Check published geological maps for the candidate footprint before travel; record map source and scale.",
        "On site, identify and photograph rock or sediment units at stations across the footprint.",
        "Measure rock strength at each station (Schmidt rebound or point-load index).",
        "Drill test holes at representative stations; log torque, thrust, penetration rate and power continuously.",
        "Record recovered sample mass versus drilled volume and inspect bit wear after each hole.",
      ],
      variables: [
        { name: "Rock / sediment identification", unit: "class", status: "not measured" },
        { name: "Rock strength (rebound or point-load index)", unit: "—, MPa", status: "not measured" },
        { name: "Drilling torque", unit: "N·m", status: "not measured" },
        { name: "Penetration rate", unit: "mm/min", status: "not measured" },
        { name: "Drill-bit wear", unit: "mm", status: "not measured" },
        { name: "Sample recovery", unit: "%", status: "not measured" },
        { name: "Power consumption", unit: "W, Wh", status: "not measured" },
      ],
      criteria: [
        "Report drilling metrics per identified rock unit with the number of holes.",
        "Document whether materials relevant to the Mars target (wind-eroded, fine-grained deposits) are actually present.",
        "No suitability is claimed unless rock type is verified on site.",
      ],
      limitations: [
        "Topography does not determine rock type or drillability.",
        "Earth weathering, moisture and biology differ from the Medusae Fossae Formation.",
        "Bare-ground land cover does not mean exposed bedrock.",
      ],
      citations: [CITE.prereg, CITE.nasadem, CITE.zacny, CITE.marsFacts],
      unknowns: ["Lithology at the site", "Grain size", "Rock compressive strength", "Drill torque and penetration rate", "Tool wear", "Sample recovery", "Energy use"],
      formulas: [{ name: "Specific drilling energy", expr: "SE = ∫ P dt / V_removed", note: "Electrical (or mechanical) energy per volume of material removed; needs logged power and measured hole volume. Not computed here." }],
      roverConfig: ["Drill type (rotary or rotary-percussive), bit geometry and material", "Weight-on-bit / thrust limit", "Power and torque limits"],
      trials: ["Several holes per identified unit", "Repeat with a fresh bit to separate wear from material effects"],
      qualityChecks: ["Torque and thrust sensor calibration", "Photograph and log every sample with GPS position"],
      environment: ["Surface and near-surface moisture", "Temperature during drilling"],
      safety: ["Permits for sampling and sample export must be confirmed", "Dust and eye protection during drilling"],
      impact: "Terrain shape cannot tell us what the ground is made of. Only identified, tested samples can show whether this site is useful for rehearsing rover sampling.",
    };
  }
  return {
    ...common,
    objective: `Measure the thermal and electrical-energy conditions a rover would experience at exploratory candidate ${id}, to plan a thermal-control or energy-system field test.`,
    hypothesis: "On-site logging will show the diurnal range of air, ground and battery temperatures and the resulting energy use — values that cannot be read from terrain data.",
    evidence: [
      ...terrain.filter((e) => /Fingerprint|WorldCover|resolution/i.test(e.label)),
      { label: "Air temperature at the site", value: "Not measured", cls: "not-measured" },
      { label: "Ground surface temperature", value: "Not measured", cls: "not-measured" },
      { label: "Solar exposure", value: "Not measured", cls: "not-measured" },
      { label: "Battery temperature and endurance", value: "Not computed (no rover hardware parameters)", cls: "field-required" },
    ],
    instruments: [
      "Shielded air-temperature and humidity logger (≈ 2 m height)",
      "Ground-surface temperature sensors (contact and/or infrared)",
      "Pyranometer for incoming solar irradiance",
      "Wind speed and direction sensor",
      "Battery-pack temperature sensors and an energy meter on the rover bus",
    ],
    procedure: [
      "Log air and ground temperature, irradiance and wind continuously for the planned test duration (several full diurnal cycles).",
      "Record battery temperature and electrical energy consumption during representative rover activities (idle, driving, heating).",
      "Note cloud cover, dust events and shading at the test station.",
      "Repeat in the season(s) intended for future tests.",
    ],
    variables: [
      { name: "Air temperature", unit: "°C", status: "not measured" },
      { name: "Ground surface temperature", unit: "°C", status: "not measured" },
      { name: "Battery temperature", unit: "°C", status: "not measured" },
      { name: "Electrical energy consumption", unit: "Wh", status: "not measured" },
      { name: "Solar irradiance (if the test needs it)", unit: "W/m²", status: "not measured" },
      { name: "Test duration", unit: "h", status: "to be planned" },
    ],
    criteria: [
      "Report diurnal minimum, maximum and range for air, ground and battery temperature separately.",
      "Report energy per activity type with the logging interval and sensor accuracy.",
      "State explicitly which Mars conditions the test does not reproduce.",
    ],
    limitations: [
      "Earth cannot reproduce Mars gravity (0.38 g), atmospheric pressure (≈ 0.6 kPa vs ≈ 101 kPa) or the full radiation environment.",
      "Thin Martian air changes convective cooling: Earth thermal results do not transfer directly.",
      "No battery endurance is estimated without real rover hardware parameters.",
    ],
    citations: [CITE.prereg, CITE.marsFacts, CITE.rems],
    unknowns: ["Air temperature range at the site", "Ground surface temperature", "Battery temperature in operation", "Energy consumption per activity", "Solar irradiance"],
    formulas: [{ name: "Energy per activity", expr: "E = ∫ V · I dt", note: "Logged per activity (idle, drive, heater). No endurance is predicted without real hardware parameters." }],
    roverConfig: ["Battery chemistry, capacity and thermal-control hardware", "Logging interval and sensor accuracy"],
    trials: ["Several complete diurnal cycles", "Repeat in each season intended for future tests"],
    qualityChecks: ["Radiation-shielded air sensor", "Sensor cross-calibration before deployment"],
    environment: ["Cloud cover, dust events and shading", "Wind speed and direction"],
    safety: ["Battery handling and transport rules", "Extreme-temperature field safety plan"],
    impact: "An Earth campaign can characterise thermal and energy behaviour under measured terrestrial conditions; it cannot reproduce Martian pressure, gravity or radiation.",
  };
}

/** Plain-text / Markdown export of a dossier (copy or download). */
export function dossierToMarkdown(d: Dossier): string {
  const sections: [string, string[]][] = [
    ["Research question", [d.question]],
    ["Research objective", [d.objective]],
    ["Hypothesis", [d.hypothesis]],
    ["Candidate site", [`${d.candidate.id} — exploratory morphometric candidate (not a confirmed Mars analog). Cluster centroid ${d.candidate.lat.toFixed(4)}° N, ${d.candidate.lon.toFixed(4)}° E; ${d.candidate.nWindows} windows, ${Math.round(d.candidate.areaKm2)} km²; best window ${d.candidate.bestWindow}.`]],
    ["Available satellite-derived evidence", d.evidence.map((e) => `- [${EVIDENCE_LABEL[e.cls]}] ${e.label}: ${e.value}${e.note ? ` — ${e.note}` : ""}${e.source ? ` (source: ${e.source})` : ""}`)],
    ["Unknown properties this test must measure", d.unknowns.map((u) => `- ${u} — NOT MEASURED`)],
    ["Required field instruments", d.instruments.map((x) => `- ${x}`)],
    ["Rover configuration to document", d.roverConfig.map((x) => `- ${x}`)],
    ["Measurement procedure", d.procedure.map((x, i) => `${i + 1}. ${x}`)],
    ["Measurements and units", [...d.variables.map((v) => `- ${v.name} [${v.unit}] — ${v.status}`), ...d.formulas.map((f) => `- ${f.name}: ${f.expr} — ${f.note}`)]],
    ["Repeated-trial strategy", d.trials.map((x) => `- ${x}`)],
    ["Data-quality checks", d.qualityChecks.map((x) => `- ${x}`)],
    ["Criteria for evaluating the field measurements", d.criteria.map((x) => `- ${x}`)],
    ["Environmental conditions to record", d.environment.map((x) => `- ${x}`)],
    ["Safety and field access", d.safety.map((x) => `- ${x}`)],
    ["Uncertainties and Earth-to-Mars limitations", d.limitations.map((x) => `- ${x}`)],
    ["Sources", d.citations.map((c) => `- ${c.text}${c.url ? ` ${c.url}` : ""}`)],
  ];
  const L: string[] = [`# ${d.title}`, "", `> ${d.disclaimer}`, ""];
  sections.forEach(([h, body], i) => L.push(`## ${i + 1}. ${h}`, ...body, ""));
  L.push(`**Why it matters.** ${d.impact}`, "", "Generated by PARALLAX X Expedition Lab from results.json and fieldtest.json.");
  return L.join("\n");
}
