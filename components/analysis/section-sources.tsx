"use client";

import type { SourceRecord } from "@/lib/types";
import { Card, ExtLink, SectionHeader, SubHeader } from "./primitives";

export const AI_USE_STATEMENT =
  "AI assistance (Anthropic Claude) was used for research synthesis, simulated advisory critique, and code generation; rankings are deterministic computations on public elevation data; no AI model was trained; no AI-generated imagery is used in the app.";

export function SourcesSection({ sources }: { sources: SourceRecord[] | null }) {
  return (
    <section id="sources" aria-labelledby="sources-title" className="scroll-mt-8">
      <SectionHeader id="sources" kicker="Sources & AI use" title="Data sources and how AI was used" />

      <SubHeader title="Data sources" />
      {sources && sources.length ? (
        <div className="overflow-x-auto rounded-[10px] border border-hairline">
          <table className="w-full border-collapse text-left text-[15px]">
            <caption className="sr-only">Data sources used in this analysis</caption>
            <thead>
              <tr className="border-b border-hairline bg-[#0e131a] text-[14px] text-muted">
                <th scope="col" className="px-4 py-2 font-medium">
                  Dataset
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Posting
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Used for
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Licence
                </th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-hairline/60 align-top last:border-b-0">
                  <th scope="row" className="max-w-[340px] px-4 py-3 font-normal">
                    <p className="text-ink">
                      <span className={s.planet === "Earth" ? "text-[#9cc3d1]" : "text-copper-light"}>{s.planet}</span> · {s.provider}
                    </p>
                    <p className="num mt-1 break-all text-[13px] text-muted">{s.product_id}</p>
                    <p className="mt-1 text-[14px]">
                      <ExtLink href={s.url}>Source link</ExtLink>
                      {s.mirror_url ? (
                        <>
                          {" · "}
                          <ExtLink href={s.mirror_url}>Mirror</ExtLink>
                        </>
                      ) : null}
                    </p>
                  </th>
                  <td className="num whitespace-nowrap px-4 py-3 text-ink">{s.posting_m !== null && s.posting_m !== undefined ? `${s.posting_m} m` : "—"}</td>
                  <td className="px-4 py-3 text-[#d6d3ce]">
                    {s.usage}
                    {s.effective_resolution_note ? <p className="mt-1 text-[13px] text-muted">{s.effective_resolution_note}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{s.licence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[16px] text-muted">Source records (sources.json) are not available.</p>
      )}

      <div className="mt-14">
        <SubHeader title="AI use" />
        <Card className="p-6">
          <p className="text-[17px] leading-[1.65] text-[#d6d3ce]">{AI_USE_STATEMENT}</p>
        </Card>
        <p className="mt-6 text-[15px] text-muted">
          PARALLAX X is a NASA Space Apps 2026 project. It is not affiliated with or endorsed by NASA. NASA data are used under their public-data terms.
        </p>
      </div>
    </section>
  );
}
