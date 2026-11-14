"use client";

import type { Results } from "@/lib/types";
import { fracToPercent } from "@/lib/format";
import { AttenuationBars, DumbbellChart, FingerprintChart, HiriseBars, SiteStripChart, SpectrumChart } from "./charts";
import { COLORS, ChartFigure, DataTable, LegendItem, SectionHeader, fmt, groupId } from "./primitives";

const ORDER = ["P1", "P2", "P3", "N1", "N2", "D1", "D2"];

export function TerrainSection({ results: r }: { results: Results }) {
  const threshold = Number(r.run.parameters.pass_percentile);
  const groups = [...(r.diagnostics?.groups ?? [])].sort((a, b) => ORDER.indexOf(groupId(a.group)) - ORDER.indexOf(groupId(b.group)));
  const marsMedian = r.mars?.median_raw;
  const spec = r.diagnostics?.ctx_ridge_spectrum;
  const diagStatus = r.diagnostics?.status;
  const f2 = r.features.find((f) => f.id === "F2");
  const sitesOrdered = [...r.sites].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const resolution = r.breakdown.find((b) => b.id === "resolution_limit");
  const positives = r.sites.filter((s) => s.role === "positive");
  const posAbove = positives.filter((s) => typeof s.median_pct_full === "number" && s.median_pct_full >= threshold).length;

  return (
    <section id="terrain" aria-labelledby="terrain-title" className="scroll-mt-8">
      <SectionHeader
        id="terrain"
        kicker="Terrain analysis"
        title="What the fingerprint measured, and where it fell short"
        lead={
          <p>
            Four views of the same run: the raw feature values, where the reference sites rank, whether the full fingerprint beats a slope-only
            baseline, and the resolution limit that likely explains the result.
          </p>
        }
      />

      <div className="space-y-20">
        {/* a. Feature fingerprint */}
        {marsMedian && groups.length ? (
          <ChartFigure
            title="1 · Feature fingerprint: Mars vs Earth groups"
            caption={
              <p>
                Median value of each feature for the Mars fingerprint (copper diamond and dashed line) and for each Earth group. Closer to the dashed
                line means more Mars-like on that feature. Units and measurement baselines are listed in the table.
              </p>
            }
            status={diagStatus ? "post-hoc descriptive diagnostic" : undefined}
            legend={
              <>
                <LegendItem swatch={<rect x={4} y={2} width={9} height={9} transform="rotate(45 8.5 6.5)" fill={COLORS.copper} />}>Mars (MFF)</LegendItem>
                <LegendItem swatch={<circle cx={9} cy={7} r={5} fill={COLORS.copperLight} />}>Published yardang sites</LegendItem>
                <LegendItem swatch={<circle cx={9} cy={7} r={5} fill={COLORS.earth} />}>Process-different controls</LegendItem>
                <LegendItem swatch={<circle cx={9} cy={7} r={5} fill={COLORS.neutral} />}>Search domains</LegendItem>
              </>
            }
            table={
              <DataTable
                caption="Median feature values"
                head={["Group", "n", ...r.features.map((f) => `${f.id} (${f.units})`)]}
                rows={[
                  ["Mars · MFF fingerprint", "—", ...r.features.map((f) => fmt(marsMedian[f.id], 2))],
                  ...groups.map((g) => [g.group, String(g.n), ...r.features.map((f) => fmt(g.median_raw?.[f.id], 2))]),
                  ["Measurement baseline", "", ...r.features.map((f) => `${f.baseline_m} m`)],
                ]}
              />
            }
          >
            <FingerprintChart features={r.features} marsMedian={marsMedian} groups={groups} />
          </ChartFigure>
        ) : null}

        {/* b. Where reference sites rank */}
        <ChartFigure
          title="2 · Where the reference sites rank"
          caption={
            <p>
              Each dot is one Earth window inside a reference polygon, placed by its percentile against the{" "}
              <span className="num text-ink">{r.null_set.n_windows.toLocaleString("en-US")}</span> declared search windows. The white bar is the site
              median, which is what the pre-registered test used. To pass, at least two published yardang sites needed a median right of the dashed
              line. <span className="text-ink">{posAbove} of {positives.length}</span> reached it.
            </p>
          }
          legend={
            <>
              <LegendItem swatch={<circle cx={9} cy={7} r={5} fill={COLORS.copper} />}>Published yardang site windows</LegendItem>
              <LegendItem swatch={<circle cx={9} cy={7} r={5} fill={COLORS.earth} />}>Control (look-alike) windows</LegendItem>
              <LegendItem swatch={<line x1={9} x2={9} y1={0} y2={14} stroke={COLORS.ink} strokeWidth={2.5} />}>Site median</LegendItem>
              <LegendItem swatch={<line x1={9} x2={9} y1={0} y2={14} stroke={COLORS.ink} strokeDasharray="3 2" />}>Pass threshold</LegendItem>
            </>
          }
          table={
            <DataTable
              caption="Reference site percentiles"
              head={["Site", "Role", "Windows", "Median pct", "Best pct", `≥ ${threshold}?`]}
              rows={sitesOrdered.map((s) => [
                `${s.id} ${s.name}`,
                s.role,
                String(s.n_windows),
                fmt(s.median_pct_full),
                fmt(s.best_pct_full),
                typeof s.median_pct_full === "number" ? (s.median_pct_full >= threshold ? "yes" : "no") : "—",
              ])}
            />
          }
        >
          <SiteStripChart windows={r.windows} sites={sitesOrdered} threshold={threshold} nNull={r.null_set.n_windows} />
        </ChartFigure>

        {/* c. Full vs B0 */}
        <ChartFigure
          title="3 · Full fingerprint vs slope-only baseline (B0)"
          caption={
            <p>
              The full five-feature score (filled circle) should rank published yardangs higher than a single slope feature (hollow circle) does.
              {typeof r.decision.mean_pos_full === "number" && typeof r.decision.mean_pos_b0 === "number"
                ? r.decision.mean_pos_full > r.decision.mean_pos_b0
                  ? " On average it did."
                  : " It did not: on average the slope-only baseline placed the positives higher than the full fingerprint."
                : null}
            </p>
          }
          legend={
            <>
              <LegendItem swatch={<circle cx={9} cy={7} r={5.5} fill={COLORS.copper} />}>Full fingerprint (F1–F5)</LegendItem>
              <LegendItem swatch={<circle cx={9} cy={7} r={5} fill="none" stroke={COLORS.muted} strokeWidth={2} />}>Slope-only baseline B0 (F2)</LegendItem>
            </>
          }
          table={
            <DataTable
              caption="Median percentile, full vs B0"
              head={["Site", "Full", "B0", "Full − B0"]}
              rows={[
                ...sitesOrdered.map((s) => [
                  `${s.id} ${s.name}`,
                  fmt(s.median_pct_full),
                  fmt(s.median_pct_b0),
                  typeof s.median_pct_full === "number" && typeof s.median_pct_b0 === "number" ? fmt(s.median_pct_full - s.median_pct_b0) : "—",
                ]),
                ...(typeof r.decision.mean_pos_full === "number" && typeof r.decision.mean_pos_b0 === "number"
                  ? [["Mean of positives", fmt(r.decision.mean_pos_full), fmt(r.decision.mean_pos_b0), fmt(r.decision.mean_pos_full - r.decision.mean_pos_b0)]]
                  : []),
              ]}
            />
          }
        >
          <DumbbellChart sites={sitesOrdered} threshold={threshold} meanFull={r.decision.mean_pos_full} meanB0={r.decision.mean_pos_b0} />
        </ChartFigure>

        {/* d. Resolution limit */}
        {spec?.spectrum ? (
          <ChartFigure
            title="4 · Resolution limit: Mars ridge spacing vs the slope baseline"
            status={diagStatus ? "post-hoc descriptive diagnostic" : undefined}
            caption={
              <>
                <p>
                  Spectrum of across-wind elevation profiles through the CTX yardang field
                  {typeof spec.segments === "number" ? (
                    <>
                      {" "}
                      (<span className="num text-ink">{spec.segments}</span> segments)
                    </>
                  ) : null}
                  . Peaks mark the dominant ridge spacing. The pre-registered slope feature F2 uses a{" "}
                  <span className="num text-ink">{f2?.baseline_m ?? "—"} m</span> baseline, close to that spacing, so it flattens these ridges.
                </p>
                {diagStatus ? <p className="mt-2 text-[15px]">Status: {diagStatus}.</p> : null}
              </>
            }
            table={
              <DataTable
                caption="Ridge spectrum peaks and F2 attenuation"
                head={["Quantity", "Value"]}
                rows={[
                  ["Compensated peak wavelengths (m)", (spec.compensated_peak_wavelengths_m ?? []).map((v) => fmt(v, 0)).join(", ")],
                  ...Object.entries(spec.f2_gradient_attenuation_at ?? {}).map(([k, v]) => [`F2 gradient retained at ${k} m`, fracToPercent(v, 0)]),
                  ...(typeof spec.ew_variance_fraction_lt300m === "number" ? [["Variance at wavelengths < 300 m", fracToPercent(spec.ew_variance_fraction_lt300m)]] : []),
                  ...(typeof spec.ew_variance_fraction_lt150m === "number" ? [["Variance at wavelengths < 150 m", fracToPercent(spec.ew_variance_fraction_lt150m)]] : []),
                ]}
              />
            }
          >
            <SpectrumChart wavelength={spec.spectrum.wavelength_m} power={spec.spectrum.power_k2} peaks={spec.compensated_peak_wavelengths_m ?? []} f2BaselineM={f2?.baseline_m} />
            {spec.f2_gradient_attenuation_at ? (
              <div className="mt-6 border-t border-hairline pt-5">
                <p className="mb-4 text-[15px] text-muted">Share of a ridge&apos;s slope that the {f2?.baseline_m ?? ""} m F2 operator keeps, by ridge spacing</p>
                <AttenuationBars attenuation={spec.f2_gradient_attenuation_at} />
              </div>
            ) : null}
          </ChartFigure>
        ) : null}

        {resolution ? <p className="-mt-12 max-w-[72ch] text-[16px] leading-[1.6] text-muted">{resolution.text}</p> : null}

        <ChartFigure
          title="5 · What a 30 m grid cannot see (HiRISE scarp)"
          caption={
            <p>
              Share of the HiRISE patch steeper than 15° and 30°, measured at a fine (~4 m) baseline and at the 180 m analysis baseline. Steep terrain
              almost disappears at the scale used for the Earth comparison.
            </p>
          }
          table={
            <DataTable
              caption="HiRISE slope fractions"
              head={["Slope class", "≈4 m baseline", "180 m baseline"]}
              rows={[
                ["> 15°", fracToPercent(r.hirise.frac_area_slope_gt15_baseline_4m), fracToPercent(r.hirise.frac_area_slope_gt15_baseline_180m)],
                ["> 30°", fracToPercent(r.hirise.frac_area_slope_gt30_baseline_4m), fracToPercent(r.hirise.frac_area_slope_gt30_baseline_180m)],
              ]}
            />
          }
        >
          <HiriseBars hirise={r.hirise} />
          <p className="mt-5 border-t border-hairline pt-4 text-[14px] leading-[1.6] text-muted">{r.hirise.note}</p>
        </ChartFigure>
      </div>
    </section>
  );
}
