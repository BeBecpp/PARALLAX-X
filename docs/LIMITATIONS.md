# Limitations — what PARALLAX X cannot tell you

1. **Geometry is not geology.** The fingerprint measures terrain shape at baselines of 180 m and above. Similar shapes can come from different processes: wind erosion, fluvial dissection, tectonic folding, dunes. A high-ranking window is a **morphometric candidate**, not a confirmed analog, and it was not "discovered".
2. **No lithology, induration, mineralogy, age, wind regime or climate is measured.** The analogy-breakdown panel lists these and marks unverified statements "needs verification".
3. **Scale.** All Earth–Mars comparisons use a common 30 m grid smoothed identically (σ = 30 m). Nothing finer than about 150 m is compared. The HiRISE statistics show directly how much steep terrain disappears at that scale.
4. **Effective resolution.** Stereo DTMs (CTX, HiRISE) resolve less detail than their posting, and SRTM-derived NASADEM is noise-limited in low relief. A common Gaussian filter is a conservative approximation, not exact spectral matching.
5. **Different instruments.** Mars heights come from CTX stereo photogrammetry; Earth heights come from SRTM radar (NASADEM) or TanDEM-X (GLO-30). Their error structures differ.
6. **NASADEM void-fill** cells could not be masked, because the quality layer is not in the Planetary Computer mirror. NASADEM was retrieved from that mirror, not via an Earthdata login.
7. **Reference sites.**
   - The positive and negative polygons were placed from NASADEM hillshade and literature *before* scoring.
   - The Puna polygon is a low-confidence location, and its decametre-scale yardangs may not be resolvable at 30 m.
   - Site results use the median window, so a single good window cannot carry a site.
8. **Search scope.** Only two declared Earth domains were searched (the Trans-Altai Gobi box clipped to Mongolia, and the Lut box). This is **not a global search**. Percentiles are relative to these windows only, and are not probabilities.
9. **Rover-scale questions are not evaluable for Earth candidates** with public 30 m data. The Mars-side slope classes at a ~4 m baseline are a **proxy**, not trafficability. There is no rock, soil, slip, power or logistics data, and no mobility simulation.
10. **Mars gravity (0.38 g) and atmosphere (~0.6 kPa)** are not reproduced at any Earth site.
11. **Candidate checks are pending** unless stated otherwise: optical imagery, geologic maps and field verification of the Gobi candidates have not been carried out by this tool.
12. **No human expert review.** The planning-stage "advisors" were simulated by AI (see `AI_USAGE.md`).
13. **The rover is a visualization, not a rover simulation.** The six-wheel rover is NASA/JPL-Caltech's Perseverance 3D model, with the NASA/JPL insignia removed; see `ROVER_MODEL.md`. It follows a **hand-drawn loop** over the rendered HiRISE surface. Height comes from the displayed mesh, and tilt from a 4-point sample across the displayed wheelbase.
    - **Animated:**
      - each wheel spins from the distance travelled;
      - the mast raises using the model's own rigged clip;
      - the head pans during surveys;
      - the throttle is eased.
    - **Not modelled:**
      - rocker-bogie articulation;
      - corner-wheel steering;
      - traction, slip, wheel–soil interaction, obstacles, power and route safety.
    - **Not computed:** the loop is not a least-cost or safety-optimized path.
    - **Time:** playback is time-lapsed.
    - **Scale:** "Cinematic" mode enlarges the rover (the factor is shown on screen). "True scale" shows its ~3 m body.
    - **Endorsement:** PARALLAX X is not affiliated with or endorsed by NASA. The model is credited wherever the rover appears.
14. **Cinematic view vs survey view.** The default 3D view uses a filmic camera, a sky gradient, distance haze and a soft edge dissolve. These are **illustrative atmosphere, not data**: they are drawn on top of, and never change, the measured heightfield. The viewport says "sky & haze: illustrative". The **survey view** (footprint button on the tool rail) removes the haze and fade, frames the whole tile and draws the **exact data-footprint boundary**.
15. **Points of interest.** During the drive the rover brakes at three fixed points on the hand-drawn loop and sweeps its mast camera. These points are evenly spaced positions on the loop, not detected features. Playback speed (0.5×/1×/2×) is time-lapse only.
16. **Performance mode** (HI/LO button) uses about 4× fewer mesh triangles and a lower pixel ratio. The full-resolution normal map, heightfield values and every number shown are unchanged.
17. **Sound** is synthesized in the browser and illustrative only (see `AUDIO_CREDITS.md`). It is off until the user enables it.
