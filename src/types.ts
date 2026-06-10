import type { LucideIcon } from "lucide-react";
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";

export type PageId =
  | "home"
  | "select"
  | "workOrder"
  | "softRepair"
  | "proofingLive"
  | "ingredientScan"
  | "bakingLive"
  | "packingLive"
  | "report";

export type FactoryAreaId = "material" | "pressing" | "proofing" | "baking" | "packing";
export type TransitionPhase = "loading" | "handoff" | "home";
export type AudioSceneId = PageId | "entry";
export type AudioCueName =
  | "soft_power_on"
  | "digital_wake"
  | "system_ready_beep"
  | "enter_confirm"
  | "short_whoosh"
  | "soft_ui_tap"
  | "bug_select"
  | "system_upload"
  | "data_confirm"
  | "soft_pick"
  | "data_blip"
  | "confirm_tick"
  | "success_rise"
  | "machine_start"
  | "machine_stop"
  | "machine_complete"
  | "soft_slider_tick"
  | "stable_confirm"
  | "soft_warning"
  | "target_near_beep"
  | "short_warning_glitch"
  | "bake_success"
  | "package_rotate_tick"
  | "package_rotate_ready"
  | "scan_sweep"
  | "code_confirm_beep"
  | "transparent_success"
  | "report_generate"
  | "save_confirm"
  | "share_confirm"
  | "copy_success";
export type AudioLoopName = "machine_loop_low" | "digital_reading_loop";

export type BugOption = {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  reportLabel: string;
  orderLabel: string;
  defaultDescription: string;
  abnormalRole: string;
  identity: string;
  recommendation: string;
  keywords: string[];
  scenarioCopy: string;
};

export type WorkOrder = {
  id: string;
  bugType: string;
  description: string;
  createdAt: string;
  priority: string;
};

export type PageProps = {
  go: (target: PageId) => void;
  notice: string;
  setNotice: (value: string) => void;
  unlockStage: (stage: number) => void;
  lockedNotice: (message: string) => void;
  missionStage: number;
  selectedBugId: string | null;
  selectedBug: BugOption | null;
  description: string;
  setDescription: (value: string) => void;
  selectBug: (id: string) => void;
  submitBug: () => void;
  order: WorkOrder;
  solution: BugOption;
  factoryReveal: number;
  setFactoryReveal: Dispatch<SetStateAction<number>>;
  factoryAreaId: FactoryAreaId;
  viewedFactoryAreaIds: FactoryAreaId[];
  selectFactoryArea: (areaId: FactoryAreaId) => void;
  openFactoryAreaLive: (areaId: FactoryAreaId) => void;
  repairCharge: number;
  setRepairCharge: Dispatch<SetStateAction<number>>;
  ingredientIds: string[];
  setIngredientIds: Dispatch<SetStateAction<string[]>>;
  liked: boolean;
  setLiked: (value: boolean) => void;
  saveReport: () => Promise<void>;
  shareReport: () => Promise<void>;
  openPurchasePage: () => void;
  reportRef: RefObject<HTMLDivElement>;
  transitionPhase: TransitionPhase;
  homeArrivalActive: boolean;
  homeRepairActive: boolean;
  playAudioCue: (name: AudioCueName) => void;
  startAudioLoop: (name: AudioLoopName) => void;
  stopAudioLoop: (name: AudioLoopName) => void;
  audioToggle?: ReactNode;
};
