/**
 * Contracts between the mission-control workspace shell (owned by the lead) and its panels.
 * Every number passed through these props is computed from public/data (results.json, heightfields).
 */
import type { Results } from "@/lib/types";
import type { CameraMode, DriveState } from "@/lib/terrain-engine";

export type WorkspaceMode = "explore" | "compare" | "simulate";
export type EvidenceSection = "overview" | "terrain" | "candidates" | "method" | "validation" | "sources";

export interface RightPanelProps {
  results: Results;
  mode: WorkspaceMode;
  /** compare_scenes[].id of the Earth scene on stage (e.g. "cmp_g1"), or null */
  selectedSceneId: string | null;
  onSelectScene: (compareSceneId: string) => void;
  onOpenEvidence: (section: EvidenceSection) => void;
  /** Fine-scale HiRISE numbers are in results.hirise; shown in explore/simulate modes. */
}

export interface ProfileSeries {
  id: string;
  label: string;
  tone: "mars" | "earth";
  /** distance along the profile (m) and value (elevation m, or slope deg) */
  points: { d: number; v: number }[];
}

export interface ProfileData {
  /** short title of what the profile is, e.g. "Centre transect W→E" or "PAX demonstration loop" */
  title: string;
  /** explains datum/processing, e.g. "relative elevation, plane-detrended (CTX & NASADEM, 30 m grid)" */
  note: string;
  elevation: ProfileSeries[];
  slope: ProfileSeries[];
  /** baseline (m) used for the slope series */
  slopeBaselineM: number;
  /** stats rows shown beside the chart (real, computed) */
  stats: { label: string; value: string; unit?: string }[];
}

export interface TimelinePanelProps {
  mode: WorkspaceMode;
  /** null until PAX is loaded into the terrain scene */
  drive: DriveState | null;
  paxStatus: "idle" | "loading" | "ready" | "error";
  /** demonstration loop period in seconds (time-lapsed playback, not a travel time) */
  periodS: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReplay: () => void;
  onStop: () => void;
  /** reposition PAX along the loop (0..1); starts it paused if needed */
  onSeek: (frac: number) => void;
  /** jump to the next point of interest */
  onSkip: () => void;
  /** time-lapse playback multiplier */
  onSpeed: (m: number) => void;
  /** positions (0..1) of the points of interest on the loop */
  poiFracs: number[];
  onCamera: (m: CameraMode) => void;
  /** go to the Simulate mode (from explore/compare) */
  onOpenSimulate: () => void;
  profile: ProfileData | null;
  /** 0..1 position of the cursor along the profile (e.g. PAX progress), or null */
  cursorFrac: number | null;
  onCursor: (frac: number | null) => void;
}
