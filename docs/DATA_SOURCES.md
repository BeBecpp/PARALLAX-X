# Data sources

All data are public. The machine-readable manifest is in [`public/data/sources.json`](../public/data/sources.json). Per-file download URLs, sizes and SHA-256 hashes are in [`science/acquisition_log.json`](../science/acquisition_log.json) (NASADEM + Natural Earth) and [`science/acquisition_log_glo30.json`](../science/acquisition_log_glo30.json) (GLO-30).

| Source | Product | Provider / archive | Posting | Used for | NASA Resources-tab route |
|---|---|---|---|---|---|
| **HiRISE DTM** | `DTEEC_009609_1675_010453_1675_A01` ([PDS file](https://hirise-pds.lpl.arizona.edu/PDS/DTM/PSP/ORB_009600_009699/PSP_009609_1675_PSP_010453_1675/DTEEC_009609_1675_010453_1675_A01.IMG)) | NASA Planetary Data System — HiRISE / MRO, University of Arizona | 1.01 m | 3D hero terrain; measured fine- vs coarse-scale slope statistics; rover-scale lens (Mars side) | **PDS** ✔ |
| **CTX DTM** | `P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W` ([COG](https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W/P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W_dtm.tif)); [USGS docs](https://stac.astrogeology.usgs.gov/docs/data/mars/ctxdtms), DOI 10.5066/P9JKVWR3 | USGS Astrogeology, controlled MRO CTX DTMs (CC0), derived from NASA CTX images archived in PDS | 20.2 m | Mars terrain fingerprint and Mars comparison window | Not a Resources-tab item; cited separately |
| **NASADEM** | NASADEM_HGT v001, 43 1° tiles (doi:10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001) | NASA JPL / LP DAAC. **Retrieved from the Microsoft Planetary Computer mirror** (`nasadem` collection), not via an Earthdata login | 1″ (~30 m) | All Earth windows (primary run) | NASADEM is an LP DAAC product discoverable in **Earthdata Search**; this copy came from a mirror |
| **Copernicus GLO-30** | Same 43 tiles | ESA Copernicus DEM, AWS open data `copernicus-dem-30m` (© DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the EU and ESA) | 1″ (~30 m) | Independent-DEM sensitivity check | ESA Copernicus (partner resource) |
| **MOLA** | `Mars_MGS_MOLA_DEM_mosaic_global_463m` ([USGS](https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif)) | MGS MOLA (NASA/GSFC), USGS Astrogeology mosaic | 463 m | Location-selection map only | MOLA data are archived in PDS |
| **ESA WorldCover 2021 v200** | 10 m land-cover map, tiles N42E096 / N42E099 / N45E096 (COG, `esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/`) | ESA WorldCover consortium, Zanaga et al. 2022, doi:10.5281/zenodo.7254221; **CC BY 4.0**; © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) | 10 m | **Post-hoc context only:** land-cover fractions inside the candidate footprints (`public/data/fieldtest.json`). Global overall accuracy 76.7 % ± 0.5. Not soil or rock type | ESA (partner resource) |
| **Natural Earth** | `ne_50m_admin_0_countries` | Natural Earth (public domain) | — | Clip the Gobi search box to Mongolia | — |

## Literature used to place reference areas
- Ehsani, A. H. & Quiel, F. (2008). *Remote Sensing of Environment* 112:3284–3294. doi:10.1016/j.rse.2008.04.007. Lut Kaluts yardangs.
- Xiao, L. et al. (2017). *Earth-Science Reviews* 164:84–101. doi:10.1016/j.earscirev.2016.11.003. Qaidam Basin Mars analogs.
- Wang, J. et al. (2018). *JGR Planets* 123:2336–2364. doi:10.1029/2018JE005719. Qaidam yardangs.
- de Silva, S. L. et al. (2010). *Planetary and Space Science* 58:459–471. doi:10.1016/j.pss.2009.10.002. Puna ignimbrite yardangs.
- Golombek, M. et al. (2012). *Space Science Reviews* 170:641–737. doi:10.1007/s11214-012-9916-y. Slope criteria at 2–5 m baselines.
- Hoover, Golombek & Calef (2012). GSA abstract. MSL slope limits of 15° (cohesionless) and 30° (outcrop) on 1 m HiRISE slope maps.
- Kirk, R. L. et al. (2021). *Remote Sensing* 13(17):3511. Effective resolution of stereo DTMs.
- Kreslavsky, M. A. & Head, J. W. (2000). *JGR* 105(E11):26695. doi:10.1029/2000JE001259.
- NASA Mars Fact Sheet: https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html

## Other assets (not data)
- **Rover 3D model.** NASA/JPL-Caltech "Mars 2020 Perseverance Rover" from NASA 3D Resources, modified (insignia
  removed). See [`ROVER_MODEL.md`](ROVER_MODEL.md).
- **Concept films.** By Khuslen (V01D-404). See [`VISUAL_ASSETS.md`](VISUAL_ASSETS.md). They are AI-generated
  creative media, not data.

