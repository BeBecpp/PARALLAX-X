# Expedition rover model: source, licence, modifications

PARALLAX X shows one realistic six-wheel rover in the Select stage, the intro and the terrain demonstration. It
replaces the earlier cartoon mascot (PAX), which now appears only in the team's AI-generated concept films (see `VISUAL_ASSETS.md`).

## Source

| | |
|---|---|
| Asset | "Mars 2020 Perseverance Rover", glTF binary (`Mars 2020 Perseverance Rover.glb`, 4,987,176 bytes, SHA-256 `10DB7C03…727F`) |
| Publisher | NASA 3D Resources, listed source: NASA/Jet Propulsion Laboratory |
| Page | https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/ |
| Mirror | https://github.com/nasa/NASA-3D-Resources (README: "These assets are free and without copyright") |
| Usage terms | NASA Images and Media Usage Guidelines, https://www.nasa.gov/nasa-brand-center/images-and-media/. NASA material is generally not subject to US copyright and may be used for educational and informational purposes, including websites. NASA should be credited. Use must not imply NASA endorsement. **The NASA insignia, logotype and identifiers are not in the public domain.** |
| Credit shown in the app | "3D model NASA/JPL-Caltech (insignia removed) · Not affiliated with or endorsed by NASA" |

## What we checked before using it

- **Licence and redistribution.** The model is published for free use without copyright. NASA's guidelines permit
  this kind of informational use with credit. Modification is not restricted for non-insignia content.
- **Insignia.** The textures contained protected marks:
  - the NASA "meatball" on two textures (`arm_graphics`, `blade`);
  - the JPL logotype on two textures (`arm_graphics`, `blade`);
  - a perforated "NASA" logotype plate and a "JPL" plate on `mars_2020_03`.

  All of these were painted out with flat neutral fills (see below), together with the "MARS 2020 / PERSEVERANCE"
  mission wordmarks. The US flag decal was left as part of the vehicle.
- **Endorsement.** The rover is labelled a *visualization rover*. Every view says the model is NASA/JPL-Caltech's and
  that PARALLAX X is not affiliated with or endorsed by NASA. Nothing claims NASA designed or operates "our"
  rover.
- **Geometry and rig.**
  - About 200k triangles, Draco-compressed, 68 meshes.
  - The source ships 23 animation clips. We use only two, `CylinderAction` and `topAction`: the mast raise
    (0–1.5 s) and the head unfold (1.5–2.6 s).
  - All six wheels are one mesh in the source.

## Modifications (reproducible)

1. **Insignia removal** (`scripts/rover/1-strip-insignia.mjs`).
   - Replaces the cleaned JPEGs and drops the matching WebP duplicates, so no copy of a mark remains in the file.
   - Fill rectangles, in source pixel coordinates:
     - `arm_graphics` (512²): (4,30,500×66), (26,155,460×45), (104,272,190×68).
     - `mars_2020_03` (1024²): (189,897,88×35), (398,845,65×38).
     - `blade` (1024×512): (18,160,140×50), (884,394,140×118), with four bolt heads redrawn.
2. **Web textures** (`scripts/rover/2-web-textures.mjs`).
   - Each referenced texture is downscaled to ≤ 512 px WebP in the browser (canvas encoder) and repacked, one image
     per texture.
   - Result: 4.99 MB → 1.69 MB (`public/models/expedition-rover.glb`, SHA-256 `E3278B8A…8750`).
3. **At load time** (`lib/rover-rig.ts`).
   - Materials are folded into one `MeshStandardMaterial` feature set. This means about 3 shader programs instead of
     dozens, and no transmission pass.
   - A light dust tint is applied to non-metal surfaces.
   - The six-wheel mesh is split into six pivots by triangle position (index subsets over the shared vertex data),
     so each wheel can spin about its own axle.

## What the animation is and is not

- **Wheels:** they spin from the distance actually travelled along the path, divided by the wheel radius.
- **Chassis:** it follows the rendered DEM surface, using a 4-point tilt over the displayed wheelbase.
- **Mast:** it raises using the source's own rigged clip, and the head pans about the rover's vertical axis during a
  survey.
- **Speed:** acceleration and braking come from an eased throttle into each point of interest.
- **Not modelled:**
  - suspension (rocker-bogie) articulation;
  - steering of the corner wheels;
  - wheel–soil interaction, slip, traction, energy, obstacles, traversability.

  The drive is an illustrative terrain-following visualization along a hand-drawn loop.
- **Scale:** in cinematic size the rover is shown enlarged (about ×40, stated on screen). The 30 m comparison grid
  resolves nothing at wheel or rock scale.
