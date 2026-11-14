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
      <li>Earth elevation: NASA NASADEM via the Microsoft Planetary Computer mirror</li>
      <li>Boundaries: Natural Earth</li>
    </ul>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline px-6 py-8 md:px-8">
      <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="font-display text-[18px] font-semibold text-ink">About</h2>
          <div className="mt-3">
            <AboutText />
          </div>
        </div>
        <div>
          <h2 className="font-display text-[18px] font-semibold text-ink">Data credits</h2>
          <div className="mt-3">
            <Credits />
          </div>
          <p className="mt-4 text-[14px] text-muted">
            Code:{" "}
            <a className="text-ink underline decoration-hairline underline-offset-4 hover:decoration-copper" href={REPO_URL} target="_blank" rel="noreferrer">
              github.com/BeBecpp/PARALLAX-X
            </a>
          </p>
          <p className="mt-2 text-[14px] text-muted">NASA Space Apps 2026 project. Not affiliated with or endorsed by NASA.</p>
        </div>
      </div>
    </footer>
  );
}
