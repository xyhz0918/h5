import type { LucideIcon } from "lucide-react";
import type { Dispatch, RefObject, SetStateAction } from "react";

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
};
