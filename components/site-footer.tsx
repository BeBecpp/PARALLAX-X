export const REPO_URL = "https://github.com/BeBecpp/PARALLAX-X";

export function AboutText() {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-muted">
      <p className="text-ink">
        PARALLAX X asks one question: where on Earth does a specific piece of Mars terrain have the same shape? It
        compares a real HiRISE stereo terrain model of wind-carved Medusae Fossae ridges with public Earth elevation
        data, at a common grid both planets&apos; data can actually resolve.
      </p>
      <p>
        Rankings are deterministic computations on public elevation data, tested against a pre-registered protocol.
        A rank says a landscape&apos;s shape statistics are similar; it does not say the rock, climate or history are
        the same. The Limits tab in the evidence drawer lists where the analogy breaks down.
      </p>
    </div>
  );
}

export function Credits() {
  return (
    <ul className="space-y-1 text-[14px] text-muted">
      <li>Mars elevation: NASA Planetary Data System — HiRISE (MRO, University of Arizona)</li>
      <li>Mars context: USGS Astrogeology CTX DTM</li>
      <li>Mars locator: MGS MOLA global DEM 463 m (NASA/GSFC; USGS Astrogeology mosaic)</li>
      <li>Earth elevation: NASA NASADEM via the Microsoft Planetary Computer mirror; Copernicus GLO-30</li>
      <li>Boundaries: Natural Earth</li>
    </ul>
  );
}

const PROVENANCE = ["PDS HiRISE", "USGS CTX", "NASADEM (Planetary Computer mirror)", "Copernicus GLO-30", "MGS MOLA"];

/** Compact provenance strip. Full credits live in the About dialog. */
export function SiteFooter({ onOpenAbout }: { onOpenAbout?: () => void }) {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-3 px-6 py-5 text-[14px] text-muted md:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 leading-relaxed">
          <span className="mr-1 text-[12px] font-medium uppercase tracking-[0.14em] text-muted/80">Data</span>
          {PROVENANCE.map((p, i) => (
            <span key={p} className="whitespace-nowrap">
              {i ? <span className="mr-2 text-hairline" aria-hidden="true">/</span> : null}
              <span className="text-ink/85">{p}</span>
            </span>
          ))}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {onOpenAbout ? (
            <button type="button" onClick={onOpenAbout} className="min-h-[32px] text-muted underline decoration-hairline underline-offset-4 hover:text-ink hover:decoration-copper">
              Credits &amp; methods
            </button>
          ) : null}
          <a className="text-muted underline decoration-hairline underline-offset-4 hover:text-ink hover:decoration-copper" href={REPO_URL} target="_blank" rel="noreferrer">
            Source code
          </a>
          <span>NASA Space Apps 2026 · Not affiliated with NASA</span>
        </p>
      </div>
    </footer>
  );
}
