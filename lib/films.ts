/**
 * Team concept films by Khuslen (GitHub: V01D-404). These are AI-generated creative media, not app footage and not a
 * scientific simulation. The original files stay in the creator's repository; the site streams them from there on
 * explicit user action (preload="none") and only bundles small poster stills. See docs/VISUAL_ASSETS.md.
 */

export const FILM_REPO = "https://github.com/V01D-404/All-demo-and-loading";

export type FilmRole = "brand" | "boot" | "mission" | "interface" | "character";

export interface Film {
  n: string;
  id: string;
  title: string;
  role: FilmRole;
  durationS: number;
  resolution: string;
  file: string;
  poster: string;
  /** what it shows, verified by frame inspection */
  summary: string;
  /** mandatory on-screen disclosure */
  label: string;
  /** where the concept differs from the implemented, measured app */
  mismatch?: string;
}

const RAW = "https://raw.githubusercontent.com/V01D-404/All-demo-and-loading/main/";

export const FILMS: Film[] = [
  {
    n: "05",
    id: "brand",
    title: "Brand film",
    role: "brand",
    durationS: 22,
    resolution: "1280×720",
    file: "sp-MA0PXF2Ej67IDvi0kpA.mp4",
    poster: "/media/films/brand-film-05-poster.jpg",
    summary: "A small rover character crosses Mars and arrives on Earth, ending on the PARALLAX X logo and “Find the right Earth experiment for Mars.”",
    label: "AI-generated concept brand film — not live app footage or a scientific simulation",
    mismatch: "The green Earth landscape is stylised; our Gobi candidates are arid. The cartoon rover is a concept character, not the rover model used in the app.",
  },
  {
    n: "01",
    id: "mission",
    title: "Mission concept",
    role: "mission",
    durationS: 29,
    resolution: "1280×720",
    file: "9pI2U-Trq3OJg750Em2SOA.mp4",
    poster: "/media/films/mission-concept-01-poster.jpg",
    summary: "A narrated storyboard of the Mars-to-Earth comparison idea (AI-generated video and voice).",
    label: "AI-generated storyboard — not recorded software capability",
    mismatch: "It shows rover ‘slope limits’ and a terrain-safety overlay that the implemented app does not compute.",
  },
  {
    n: "02",
    id: "boot",
    title: "Boot sequence concept",
    role: "boot",
    durationS: 17,
    resolution: "1920×1080",
    file: "BhQdikMpZvAtfHuSe7zAGA.mp4",
    poster: "/media/films/boot-concept-02-poster.jpg",
    summary: "Logo reveal, then a mission-control style boot log, then an earlier version of the select screen.",
    label: "AI-generated concept intro — motion reference, not a loading screen of the app",
    mismatch: "Its final shots show an earlier interface with the retired PAX mascot.",
  },
  {
    n: "04",
    id: "interface",
    title: "Expedition Lab interface concept",
    role: "interface",
    durationS: 28,
    resolution: "1280×720",
    file: "XMBeQxLFT_O4OuPIsVrD5w.mp4",
    poster: "/media/films/expedition-lab-concept-04-poster.jpg",
    summary: "An early concept of a rover field-testing interface with Mars and Earth terrain tiles.",
    label: "Early AI-generated interface concept — illustrative; not the implemented research workflow",
    mismatch: "It depicts Jezero Crater, candidates C1–C3 and Rover A/B slope limits. The real study uses the CTX Medusae Fossae yardangs and exploratory Gobi candidates G-1…G-5, and computes no rover safety.",
  },
  {
    n: "03",
    id: "character",
    title: "Character study",
    role: "character",
    durationS: 12.5,
    resolution: "1280×720",
    file: "QxKAs5cM7ujcN5VVWQ8ycg.mp4",
    poster: "/media/films/character-study-03-poster.jpg",
    summary: "Early motion exploration: the rover character travels from Mars to a green Earth meadow.",
    label: "AI-generated early motion exploration — creative process, not science",
    mismatch: "The forest setting does not represent any candidate site; the Gobi candidates are arid.",
  },
];

export const filmUrl = (f: Film) => RAW + f.file;
export const filmPage = (f: Film) => `${FILM_REPO}/blob/main/${f.file}`;
export const BRAND_FILM = FILMS[0];
