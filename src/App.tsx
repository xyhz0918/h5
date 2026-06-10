import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { assets } from "./lib/assets";
import { AudioDirector } from "./lib/audioDirector";
import { bugOptions, factoryAreaSequence, reportSlogan } from "./lib/content";
import { trackFunnelEvent, type FunnelEventName } from "./lib/tracking";
import { timestamp, workOrderId } from "./lib/time";
import { IntroMascotMorph, LoadingPage, warmIntroMascotMorphImage } from "./components/loading";
import { BakingLivePage, HomePage, IngredientScanPage, PackingLivePage, ProofingLivePage, ReportPage, SelectPage, SoftRepairPage, WorkOrderPage } from "./pages";
import type { AudioCueName, AudioLoopName, AudioSceneId, BugOption, FactoryAreaId, PageId, TransitionPhase, WorkOrder } from "./types";

const productPurchaseUrl = "https://item.jd.com/10074510939302.html";
const purchaseReturnSnapshotKey = "horsh:purchase-return:v1";
const purchaseReturnSnapshotTtlMs = 15 * 60 * 1000;
const AdminPage = lazy(() => import("./AdminPage").then((module) => ({ default: module.AdminPage })));
const reportShareTitle = "豪士透明工厂 早餐透明报告";
const reportNoticeText = {
  saveSuccess: "透明报告图片已生成，浏览器正在下载。",
  saveFailed: "保存图片失败，请截图保存当前透明报告。",
  shareOpened: "分享面板已打开。",
  shareCancelled: "已取消分享。",
  shareCopied: "当前浏览器不支持直接分享，已复制分享文案。",
  shareFailed: "当前浏览器不支持直接分享，请手动截图分享透明报告。"
} as const;

type PurchaseReturnSnapshot = {
  page: "report";
  order: WorkOrder;
  selectedBugId: string | null;
  description: string;
  liked: boolean;
  missionStage: number;
  factoryReveal: number;
  factoryAreaId: FactoryAreaId;
  viewedFactoryAreaIds: FactoryAreaId[];
  repairCharge: number;
  ingredientIds: string[];
  savedAt: number;
};

type ReportImageCache = {
  key: string;
  blob: Blob;
};

const reportExportLayoutVersion = "guardian-slogan-v3";

type IdleWindow = typeof window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const h5PagePreloadOrder: PageId[] = [
  "home",
  "select",
  "workOrder",
  "ingredientScan",
  "softRepair",
  "proofingLive",
  "bakingLive",
  "packingLive",
  "report"
];

const h5PageImagePreloadMap: Record<PageId, string[]> = {
  home: [
    assets.bgPortal,
    assets.logoCompact,
    assets.homePanelOnline,
    assets.homePanelPlan,
    assets.homePanelBread,
    assets.homePanelScan,
    assets.homePanelComplete,
    assets.homeMascot,
    assets.homePlatform
  ],
  select: [assets.bgCards, assets.mascotField],
  workOrder: [assets.bgFactory, assets.factoryCutout, assets.mascotOperator],
  ingredientScan: [
    assets.bgTerminal,
    assets.ingredientMixer,
    assets.ingredientCardGluten,
    assets.ingredientCardYeast,
    assets.ingredientCardWheat,
    assets.ingredientCardQuinoa
  ],
  softRepair: [assets.bgToastLab, assets.mascotOperator],
  proofingLive: [
    assets.bgToastLab,
    assets.proofingChamber,
    assets.proofingSliderTrack,
    assets.proofingMarkerLow,
    assets.proofingMarkerIdeal,
    assets.proofingMarkerHigh
  ],
  bakingLive: [assets.bgFactory, assets.bakingOven, assets.toastDough, assets.toastRaw, assets.toastOverdone, assets.heatTrack, assets.heatThumb],
  packingLive: [assets.bgFactory, assets.productBoxCropped, assets.productFrontCropped],
  report: [assets.bgTerminal, assets.productBoxCropped, assets.productFrontCropped, assets.mascotGuardianShield]
};

function getReportShareText(order: WorkOrder, solution: BugOption) {
  return `我的早餐透明报告 ${order.id} 已生成：${order.bugType} 通过豪士透明工厂验证。当前身份：${solution.identity}，推荐方案：${solution.recommendation}。${solution.scenarioCopy} ${reportSlogan}`;
}

async function waitForReportCaptureAssets(root: HTMLElement) {
  await document.fonts?.ready.catch(() => undefined);

  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
      }

      if (image.decode) {
        return image.decode().catch(() => undefined);
      }

      return new Promise<void>((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }

        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    })
  );
}

const imagePreloadCache = new Set<string>();
const imagePreloadQueue = new Set<string>();
const warmImageCache = new Map<string, HTMLImageElement>();
const imageFilePattern = /\.(avif|gif|jpe?g|png|svg|webp)(\?|$)/i;
const stageByPage: Partial<Record<PageId, string>> = {
  select: "bug_select",
  workOrder: "work_order",
  ingredientScan: "ingredient",
  softRepair: "pressing",
  proofingLive: "proofing",
  bakingLive: "baking",
  packingLive: "packing",
  report: "report"
};
const completedStageByTransition: Partial<Record<`${PageId}->${PageId}`, string>> = {
  "home->select": "home",
  "select->workOrder": "bug_select",
  "workOrder->ingredientScan": "work_order",
  "ingredientScan->softRepair": "ingredient",
  "softRepair->proofingLive": "pressing",
  "proofingLive->bakingLive": "proofing",
  "bakingLive->packingLive": "baking",
  "packingLive->report": "packing"
};

function preloadImage(src: string, loading: "eager" | "lazy" = "eager") {
  if (!src || imagePreloadCache.has(src) || !imageFilePattern.test(src)) return;
  imagePreloadCache.add(src);
  imagePreloadQueue.delete(src);

  const image = new Image();
  image.decoding = "async";
  image.loading = loading;
  image.src = src;

  if (image.decode) {
    void image.decode().catch(() => undefined);
  }
}

function warmPersistentImage(src: string, loading: "eager" | "lazy" = "eager") {
  if (typeof window === "undefined" || !src || warmImageCache.has(src) || !imageFilePattern.test(src)) {
    return;
  }

  const image = new Image();
  image.decoding = "async";
  image.loading = loading;
  (image as HTMLImageElement & { fetchPriority?: "high" | "low" | "auto" }).fetchPriority =
    loading === "eager" ? "high" : "auto";
  image.src = src;
  warmImageCache.set(src, image);
  void image.decode?.().catch(() => undefined);
}

function warmHomeVisualImages() {
  h5PageImagePreloadMap.home.forEach((src) => warmPersistentImage(src, "eager"));
}

function getPageImagePreloadSources(pageId: PageId, lookahead = 2) {
  const pageIndex = h5PagePreloadOrder.indexOf(pageId);
  const preloadPages =
    pageIndex >= 0 ? h5PagePreloadOrder.slice(pageIndex, pageIndex + lookahead + 1) : [pageId];
  const sources = new Set<string>();

  preloadPages.forEach((page) => {
    h5PageImagePreloadMap[page].forEach((src) => sources.add(src));
  });

  return Array.from(sources);
}

function preloadPageImages(pageId: PageId, lookahead = 2, loading: "eager" | "lazy" = "eager") {
  getPageImagePreloadSources(pageId, lookahead).forEach((src) => preloadImage(src, loading));
}

function scheduleIdlePreload(task: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const idleWindow = window as IdleWindow;
  let cancelled = false;
  const runTask = () => {
    if (!cancelled) task();
  };

  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(runTask, { timeout: 1600 });
    return () => {
      cancelled = true;
      idleWindow.cancelIdleCallback?.(handle);
    };
  }

  const handle = window.setTimeout(runTask, 260);
  return () => {
    cancelled = true;
    window.clearTimeout(handle);
  };
}

function preloadImagesInBatches(
  sources: string[],
  {
    loading = "lazy",
    batchSize = 2,
    delayMs = 220
  }: { loading?: "eager" | "lazy"; batchSize?: number; delayMs?: number } = {}
) {
  if (typeof window === "undefined") return () => undefined;

  const queuedSources: string[] = [];
  sources.forEach((src) => {
    if (!src || imagePreloadCache.has(src) || imagePreloadQueue.has(src) || !imageFilePattern.test(src)) {
      return;
    }
    imagePreloadQueue.add(src);
    queuedSources.push(src);
  });

  if (queuedSources.length === 0) return () => undefined;

  let cancelled = false;
  let index = 0;
  const timeouts: number[] = [];
  const idleCleanups: Array<() => void> = [];

  const runBatch = () => {
    if (cancelled) return;

    const end = Math.min(index + batchSize, queuedSources.length);
    while (index < end) {
      preloadImage(queuedSources[index], loading);
      index += 1;
    }

    if (index < queuedSources.length) {
      const timeout = window.setTimeout(scheduleNextBatch, delayMs);
      timeouts.push(timeout);
    }
  };

  const scheduleNextBatch = () => {
    if (cancelled) return;
    idleCleanups.push(scheduleIdlePreload(runBatch));
  };

  scheduleNextBatch();

  return () => {
    cancelled = true;
    timeouts.forEach((timeout) => window.clearTimeout(timeout));
    idleCleanups.forEach((cleanup) => cleanup());
    queuedSources.forEach((src) => {
      if (!imagePreloadCache.has(src)) {
        imagePreloadQueue.delete(src);
      }
    });
  };
}

function preloadPageImagesBatched(pageId: PageId, lookahead = 2, loading: "eager" | "lazy" = "lazy") {
  return preloadImagesInBatches(getPageImagePreloadSources(pageId, lookahead), {
    loading,
    batchSize: 2,
    delayMs: 180
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWorkOrder(value: unknown): value is WorkOrder {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.bugType === "string" &&
    typeof value.description === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.priority === "string"
  );
}

function isFactoryAreaId(value: unknown): value is FactoryAreaId {
  return typeof value === "string" && factoryAreaSequence.includes(value as FactoryAreaId);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFactoryAreaIdArray(value: unknown): value is FactoryAreaId[] {
  return Array.isArray(value) && value.every(isFactoryAreaId);
}

function readPurchaseReturnSnapshot(): PurchaseReturnSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const rawSnapshot = window.sessionStorage.getItem(purchaseReturnSnapshotKey);
    if (!rawSnapshot) return null;

    const snapshot: unknown = JSON.parse(rawSnapshot);
    if (!isRecord(snapshot)) throw new Error("invalid purchase return snapshot");

    const {
      order,
      description,
      liked,
      missionStage,
      factoryReveal,
      factoryAreaId,
      viewedFactoryAreaIds,
      repairCharge,
      ingredientIds,
      savedAt
    } = snapshot;
    const selectedBugId =
      typeof snapshot.selectedBugId === "string" || snapshot.selectedBugId === null
        ? snapshot.selectedBugId
        : null;

    const isValid =
      snapshot.page === "report" &&
      isWorkOrder(order) &&
      typeof description === "string" &&
      typeof liked === "boolean" &&
      typeof missionStage === "number" &&
      Number.isFinite(missionStage) &&
      typeof factoryReveal === "number" &&
      Number.isFinite(factoryReveal) &&
      isFactoryAreaId(factoryAreaId) &&
      isFactoryAreaIdArray(viewedFactoryAreaIds) &&
      typeof repairCharge === "number" &&
      Number.isFinite(repairCharge) &&
      isStringArray(ingredientIds) &&
      typeof savedAt === "number" &&
      Number.isFinite(savedAt) &&
      Date.now() - savedAt <= purchaseReturnSnapshotTtlMs;

    if (!isValid) throw new Error("expired purchase return snapshot");

    return {
      page: "report",
      order,
      selectedBugId,
      description,
      liked,
      missionStage,
      factoryReveal,
      factoryAreaId,
      viewedFactoryAreaIds,
      repairCharge,
      ingredientIds,
      savedAt
    } satisfies PurchaseReturnSnapshot;
  } catch {
    window.sessionStorage.removeItem(purchaseReturnSnapshotKey);
    return null;
  }
}

function clearPurchaseReturnSnapshot() {
  try {
    window.sessionStorage.removeItem(purchaseReturnSnapshotKey);
  } catch {
    // Ignore storage failures so navigation still works.
  }
}

function App() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return (
      <Suspense
        fallback={
          <main className="admin-page admin-page-loading">
            <div className="admin-loading-card">后台加载中...</div>
          </main>
        }
      >
        <AdminPage />
      </Suspense>
    );
  }

  const purchaseReturnSnapshot = useMemo(() => readPurchaseReturnSnapshot(), []);
  const [hasEntered, setHasEntered] = useState(Boolean(purchaseReturnSnapshot));
  const [showLoading, setShowLoading] = useState(!purchaseReturnSnapshot);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>(purchaseReturnSnapshot ? "home" : "loading");
  const [homeArrivalActive, setHomeArrivalActive] = useState(false);
  const [homeRepairActive, setHomeRepairActive] = useState(false);
  const [page, setPage] = useState<PageId>(purchaseReturnSnapshot?.page ?? "home");
  const [selectedBugId, setSelectedBugId] = useState<string | null>(purchaseReturnSnapshot?.selectedBugId ?? null);
  const [description, setDescription] = useState(purchaseReturnSnapshot?.description ?? "");
  const [order, setOrder] = useState<WorkOrder | null>(purchaseReturnSnapshot?.order ?? null);
  const [notice, setNotice] = useState("");
  const [liked, setLiked] = useState(purchaseReturnSnapshot?.liked ?? false);
  const [missionStage, setMissionStage] = useState(purchaseReturnSnapshot?.missionStage ?? 0);
  const [factoryReveal, setFactoryReveal] = useState(purchaseReturnSnapshot?.factoryReveal ?? 0);
  const [factoryAreaId, setFactoryAreaId] = useState<FactoryAreaId>(purchaseReturnSnapshot?.factoryAreaId ?? "material");
  const [viewedFactoryAreaIds, setViewedFactoryAreaIds] = useState<FactoryAreaId[]>(
    purchaseReturnSnapshot?.viewedFactoryAreaIds ?? ["material"]
  );
  const [repairCharge, setRepairCharge] = useState(purchaseReturnSnapshot?.repairCharge ?? 0);
  const [ingredientIds, setIngredientIds] = useState<string[]>(purchaseReturnSnapshot?.ingredientIds ?? []);
  const reportRef = useRef<HTMLDivElement>(null);
  const reportImageCacheRef = useRef<ReportImageCache | null>(null);
  const arrivalTimerRef = useRef<number | null>(null);
  const loadingExitTimerRef = useRef<number | null>(null);
  const homeRepairTimerRef = useRef<number | null>(null);
  const audioDirectorRef = useRef<AudioDirector | null>(null);
  const trackedCompletionKeysRef = useRef<Set<string>>(new Set());
  const trackedReportIdsRef = useRef<Set<string>>(new Set());
  const [audioEnabled, setAudioEnabled] = useState(false);

  const selectedBug = useMemo(
    () => bugOptions.find((bug) => bug.id === selectedBugId) ?? null,
    [selectedBugId]
  );

  useEffect(() => {
    warmHomeVisualImages();
    preloadPageImages("home", 0, "eager");
  }, []);

  useEffect(() => {
    if (!hasEntered || showLoading || transitionPhase === "handoff") {
      return undefined;
    }

    return preloadPageImagesBatched(page, page === "home" ? 1 : 2, "lazy");
  }, [hasEntered, page, showLoading, transitionPhase]);

  useEffect(() => {
    if (hasEntered) {
      warmHomeVisualImages();
      warmIntroMascotMorphImage();
    }
  }, [hasEntered]);

  const getAudioDirector = useCallback(() => {
    if (!audioDirectorRef.current) {
      audioDirectorRef.current = new AudioDirector();
    }

    return audioDirectorRef.current;
  }, []);

  const currentAudioScene = useMemo<AudioSceneId>(() => {
    if (showLoading || transitionPhase === "loading") return "entry";
    return page;
  }, [page, showLoading, transitionPhase]);

  const playAudioCue = useCallback(
    (name: AudioCueName) => {
      getAudioDirector().playSfx(name);
    },
    [getAudioDirector]
  );

  const startAudioLoop = useCallback(
    (name: AudioLoopName) => {
      getAudioDirector().startLoop(name);
    },
    [getAudioDirector]
  );

  const stopAudioLoop = useCallback(
    (name: AudioLoopName) => {
      getAudioDirector().stopLoop(name);
    },
    [getAudioDirector]
  );

  const enableAudio = useCallback(
    async (scene: AudioSceneId = currentAudioScene) => {
      const audio = getAudioDirector();
      await audio.unlock();
      audio.setScene(scene);
      audio.setEnabled(true);
      setAudioEnabled(true);
    },
    [currentAudioScene, getAudioDirector]
  );

  const toggleAudio = useCallback(() => {
    const audio = getAudioDirector();

    if (audioEnabled) {
      audio.setEnabled(false);
      setAudioEnabled(false);
      setNotice("声音已关闭。");
      return;
    }

    void enableAudio(currentAudioScene)
      .then(() => {
        playAudioCue("soft_ui_tap");
        setNotice("声音已开启，BGM 将按页面氛围自动调整。");
      })
      .catch(() => {
        setNotice("当前浏览器暂时无法启动声音，请再点一次声音按钮。");
      });
  }, [audioEnabled, currentAudioScene, enableAudio, getAudioDirector, playAudioCue]);

  useEffect(() => {
    if (!showLoading || transitionPhase !== "loading" || audioEnabled) return;

    void enableAudio("entry").catch(() => {
      // Mobile browsers may block autoplay before a user gesture.
    });
  }, [audioEnabled, enableAudio, showLoading, transitionPhase]);

  useEffect(() => {
    getAudioDirector().setScene(currentAudioScene);
  }, [currentAudioScene, getAudioDirector]);

  useEffect(
    () => () => {
      audioDirectorRef.current?.destroy();
    },
    []
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!audioEnabled) return;

      if (document.hidden) {
        audioDirectorRef.current?.suspend();
        return;
      }

      void audioDirectorRef.current?.resume().catch(() => undefined);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [audioEnabled]);

  const solution = selectedBug ?? bugOptions[0];

  const fallbackOrder = useMemo(() => {
    const now = new Date();

    return {
      id: workOrderId(now),
      bugType: solution.reportLabel,
      description: description.trim() || solution.defaultDescription,
      createdAt: timestamp(now),
      priority: "★★★★★ 最高"
    } satisfies WorkOrder;
  }, [description, solution]);

  const currentOrder = order ?? fallbackOrder;
  const trackEvent = useCallback(
    (eventName: FunnelEventName, data: Record<string, unknown> = {}) => {
      trackFunnelEvent({
        eventName,
        page,
        order,
        selectedBugId,
        bugType: selectedBug?.reportLabel ?? order?.bugType,
        description: description.trim() || order?.description,
        stage: typeof data.stage === "string" ? data.stage : stageByPage[page],
        progress: typeof data.progress === "number" ? data.progress : undefined,
        data: {
          missionStage,
          factoryReveal,
          factoryAreaId,
          viewedFactoryAreaIds,
          repairCharge,
          ingredientCount: ingredientIds.length,
          ...data
        }
      });
    },
    [
      description,
      factoryAreaId,
      factoryReveal,
      ingredientIds.length,
      missionStage,
      order,
      page,
      repairCharge,
      selectedBug,
      selectedBugId,
      viewedFactoryAreaIds
    ]
  );
  const reportImageCacheKey = useMemo(
    () =>
      JSON.stringify({
        layoutVersion: reportExportLayoutVersion,
        orderId: currentOrder.id,
        bugType: currentOrder.bugType,
        description: currentOrder.description,
        priority: currentOrder.priority,
        solutionId: solution.id,
        recommendation: solution.recommendation,
        identity: solution.identity
      }),
    [
      currentOrder.bugType,
      currentOrder.description,
      currentOrder.id,
      currentOrder.priority,
      solution.id,
      solution.identity,
      solution.recommendation
    ]
  );

  useEffect(() => {
    reportImageCacheRef.current = null;
  }, [reportImageCacheKey]);

  useEffect(() => {
    trackEvent("page_view", {
      stage: stageByPage[page] ?? page
    });
  }, [page]);

  useEffect(() => {
    if (ingredientIds.length === 0) return;

    trackEvent("ingredient_progress", {
      stage: "ingredient",
      progress: ingredientIds.length,
      ingredientIds
    });

    if (ingredientIds.length >= 4) {
      const key = `${currentOrder.id}:ingredient`;
      if (!trackedCompletionKeysRef.current.has(key)) {
        trackedCompletionKeysRef.current.add(key);
        trackEvent("stage_completed", {
          stage: "ingredient",
          progress: 100,
          ingredientIds
        });
      }
    }
  }, [ingredientIds]);

  useEffect(() => {
    if (repairCharge < 100) return;

    const key = `${currentOrder.id}:pressing`;
    if (trackedCompletionKeysRef.current.has(key)) return;

    trackedCompletionKeysRef.current.add(key);
    trackEvent("stage_completed", {
      stage: "pressing",
      progress: 100
    });
  }, [currentOrder.id, repairCharge, trackEvent]);

  useEffect(() => {
    if (page !== "report" || trackedReportIdsRef.current.has(currentOrder.id)) return;

    trackedReportIdsRef.current.add(currentOrder.id);
    trackEvent("report_generated", {
      stage: "report",
      progress: 100
    });
  }, [currentOrder.id, page, trackEvent]);

  const go = (target: PageId) => {
    setNotice("");
    playAudioCue("soft_ui_tap");
    const completedStage = completedStageByTransition[`${page}->${target}` as `${PageId}->${PageId}`];

    if (completedStage) {
      const completionKey = `${currentOrder.id}:${completedStage}`;
      if (!trackedCompletionKeysRef.current.has(completionKey)) {
        trackedCompletionKeysRef.current.add(completionKey);
        trackEvent("stage_completed", {
          stage: completedStage,
          fromPage: page,
          toPage: target
        });
      }
    }

    if (stageByPage[target]) {
      trackFunnelEvent({
        eventName: "stage_entered",
        page: target,
        order,
        selectedBugId,
        bugType: selectedBug?.reportLabel ?? order?.bugType,
        description: description.trim() || order?.description,
        stage: stageByPage[target],
        data: {
          fromPage: page,
          missionStage,
          factoryReveal
        }
      });
    }

    if (target === "home") {
      clearPurchaseReturnSnapshot();
      setPage(target);
      if (hasEntered) {
        runIntroToHomeTimeline();
      }
      return;
    }
    if (target === "select") {
      setSelectedBugId(null);
    }
    setPage(target);
  };

  const clearIntroTimers = useCallback(() => {
    if (arrivalTimerRef.current !== null) {
      window.clearTimeout(arrivalTimerRef.current);
      arrivalTimerRef.current = null;
    }
    if (loadingExitTimerRef.current !== null) {
      window.clearTimeout(loadingExitTimerRef.current);
      loadingExitTimerRef.current = null;
    }
    if (homeRepairTimerRef.current !== null) {
      window.clearTimeout(homeRepairTimerRef.current);
      homeRepairTimerRef.current = null;
    }
  }, []);

  const runIntroToHomeTimeline = useCallback(() => {
    clearIntroTimers();

    setHasEntered(true);
    setTransitionPhase("handoff");
    setLoadingExiting(true);
    setHomeArrivalActive(true);
    setHomeRepairActive(true);

    const hideLoadingLayer = () => {
      setShowLoading(false);
      setLoadingExiting(false);
    };

    const completeIntroToHome = () => {
      clearIntroTimers();
      setShowLoading(false);
      setLoadingExiting(false);
      setHomeArrivalActive(false);
      setHomeRepairActive(false);
      setTransitionPhase("home");
    };

    loadingExitTimerRef.current = window.setTimeout(() => {
      loadingExitTimerRef.current = null;
      hideLoadingLayer();
    }, 220);

    homeRepairTimerRef.current = window.setTimeout(() => {
      homeRepairTimerRef.current = null;
      setHomeRepairActive(false);
    }, 1580);

    arrivalTimerRef.current = window.setTimeout(() => {
      arrivalTimerRef.current = null;
      completeIntroToHome();
    }, 1700);
  }, [clearIntroTimers]);

  const enterHomeFromLoading = useCallback(() => {
    runIntroToHomeTimeline();
  }, [runIntroToHomeTimeline]);

  useEffect(
    () => () => {
      clearIntroTimers();
    },
    [clearIntroTimers]
  );

  const unlockStage = (stage: number) => {
    setMissionStage((current) => Math.max(current, stage));
  };

  const lockedNotice = (message: string) => {
    setNotice(message);
  };

  const selectFactoryArea = (areaId: FactoryAreaId) => {
    const nextViewedAreaIds = viewedFactoryAreaIds.includes(areaId)
      ? viewedFactoryAreaIds
      : [...viewedFactoryAreaIds, areaId];

    setFactoryAreaId(areaId);
    setViewedFactoryAreaIds(nextViewedAreaIds);
    setFactoryReveal((current) =>
      Math.max(current, Math.round((nextViewedAreaIds.length / factoryAreaSequence.length) * 100))
    );
  };

  const openFactoryAreaLive = (areaId: FactoryAreaId) => {
    selectFactoryArea(areaId);

    if (areaId === "material") {
      unlockStage(3);
      go("ingredientScan");
      return;
    }

    if (areaId === "pressing") {
      unlockStage(3);
      go("softRepair");
      return;
    }

    if (areaId === "proofing") {
      unlockStage(3);
      go("proofingLive");
      return;
    }

    if (areaId === "baking") {
      unlockStage(4);
      go("bakingLive");
      return;
    }

    unlockStage(4);
    go("packingLive");
  };

  const selectBug = (id: string) => {
    playAudioCue("bug_select");
    setSelectedBugId((current) => (current === id ? current : id));
    const bug = bugOptions.find((option) => option.id === id);
    trackFunnelEvent({
      eventName: "bug_selected",
      page,
      order,
      selectedBugId: id,
      bugType: bug?.reportLabel,
      description,
      stage: "bug_select",
      data: {
        bugTitle: bug?.title,
        recommendation: bug?.recommendation
      }
    });
  };

  const submitBug = () => {
    if (!selectedBug) {
      playAudioCue("soft_warning");
      setNotice("请先选择一个早餐困扰，再接入豪士透明工厂。");
      return;
    }

    playAudioCue("system_upload");
    clearPurchaseReturnSnapshot();
    const now = new Date();
    const nextOrder = {
      id: workOrderId(now),
      bugType: selectedBug.reportLabel,
      description: description.trim() || selectedBug.defaultDescription,
      createdAt: timestamp(now),
      priority: "★★★★★ 最高"
    } satisfies WorkOrder;

    setOrder(nextOrder);
    trackFunnelEvent({
      eventName: "order_created",
      page,
      order: nextOrder,
      selectedBugId,
      bugType: selectedBug.reportLabel,
      description: nextOrder.description,
      stage: "work_order",
      data: {
        bugTitle: selectedBug.title,
        identity: selectedBug.identity,
        recommendation: selectedBug.recommendation
      }
    });
    setFactoryReveal(0);
    setFactoryAreaId("material");
    setViewedFactoryAreaIds(["material"]);
    setRepairCharge(0);
    setIngredientIds([]);
    unlockStage(1);
    go("workOrder");
  };

  const reportImageFileName = `豪士早餐透明报告-${currentOrder.id}.png`;

  const createReportImageBlob = async () => {
    const reportElement = reportRef.current;
    if (!reportElement) return null;

    if (reportImageCacheRef.current?.key === reportImageCacheKey) {
      return reportImageCacheRef.current.blob;
    }

    const { toBlob } = await import("html-to-image");
    const captureHost = document.createElement("div");
    const captureNode = reportElement.cloneNode(true) as HTMLDivElement;
    const captureWidth = reportElement.offsetWidth || 610;

    captureHost.className = "report-page report-export-host";
    captureHost.setAttribute("aria-hidden", "true");
    captureHost.style.position = "fixed";
    captureHost.style.left = "-10000px";
    captureHost.style.top = "0";
    captureHost.style.width = `${captureWidth}px`;
    captureHost.style.pointerEvents = "none";
    captureHost.style.zIndex = "-1";

    captureNode.classList.add("report-export-capture");
    captureNode.style.width = `${captureWidth}px`;
    captureHost.appendChild(captureNode);
    document.body.appendChild(captureHost);

    try {
      await waitForReportCaptureAssets(captureNode);

      const blob = await toBlob(captureNode, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#020805"
      });

      if (blob) {
        reportImageCacheRef.current = {
          key: reportImageCacheKey,
          blob
        };
      }

      return blob;
    } finally {
      captureHost.remove();
    }
  };

  const saveReport = async () => {
    if (!reportRef.current) return;

    try {
      const blob = await createReportImageBlob();
      if (!blob) throw new Error("empty report image");

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = reportImageFileName;
      link.href = objectUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      trackEvent("report_saved", {
        stage: "report",
        fileName: reportImageFileName
      });
      playAudioCue("save_confirm");
      setNotice(reportNoticeText.saveSuccess);
    } catch {
      trackEvent("report_save_failed", {
        stage: "report"
      });
      setNotice(reportNoticeText.saveFailed);
    }
  };

  const shareReport = async () => {
    const text = getReportShareText(currentOrder, solution);
    const title = reportShareTitle;

    if (navigator.share) {
      try {
        const blob = await createReportImageBlob();
        if (blob) {
          const file = new File([blob], reportImageFileName, { type: blob.type || "image/png" });
          const shareData: ShareData = { title, text, files: [file] };

          if (!navigator.canShare || navigator.canShare(shareData)) {
            await navigator.share(shareData);
            trackEvent("report_shared", {
              stage: "report",
              method: "web_share_file"
            });
            playAudioCue("share_confirm");
            setNotice(reportNoticeText.shareOpened);
            return;
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          trackEvent("report_share_cancelled", {
            stage: "report",
            method: "web_share_file"
          });
          setNotice(reportNoticeText.shareCancelled);
          return;
        }
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        trackEvent("report_shared", {
          stage: "report",
          method: "web_share_text"
        });
        playAudioCue("share_confirm");
        setNotice(reportNoticeText.shareOpened);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          trackEvent("report_share_cancelled", {
            stage: "report",
            method: "web_share_text"
          });
          setNotice(reportNoticeText.shareCancelled);
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      trackEvent("report_shared", {
        stage: "report",
        method: "clipboard"
      });
      playAudioCue("copy_success");
      setNotice(reportNoticeText.shareCopied);
    } catch {
      trackEvent("report_share_failed", {
        stage: "report"
      });
      setNotice(reportNoticeText.shareFailed);
    }
  };

  const openPurchasePage = () => {
    const currentHref = window.location.href;
    trackEvent("purchase_clicked", {
      stage: "report",
      url: productPurchaseUrl
    });

    try {
      const snapshot = {
        page: "report",
        order: currentOrder,
        selectedBugId,
        description,
        liked,
        missionStage,
        factoryReveal,
        factoryAreaId,
        viewedFactoryAreaIds,
        repairCharge,
        ingredientIds,
        savedAt: Date.now()
      } satisfies PurchaseReturnSnapshot;

      window.sessionStorage.setItem(purchaseReturnSnapshotKey, JSON.stringify(snapshot));
    } catch {
      // Purchase still opens even if storage is unavailable.
    }

    setNotice("正在打开购买页。");
    window.setTimeout(() => {
      try {
        window.location.assign(productPurchaseUrl);
      } catch {
        setNotice("购买页打开失败，请稍后重试。");
      }
    }, 80);

    window.setTimeout(() => {
      if (window.location.href === currentHref) {
        setNotice("购买页可能被预览浏览器拦截，请在手机浏览器测试。");
      }
    }, 1200);
  };

  const setLikedWithTracking = (value: boolean) => {
    setLiked(value);
    trackEvent("liked_changed", {
      liked: value
    });
  };

  const audioToggle = hasEntered && !showLoading && transitionPhase !== "handoff" ? (
    <button
      type="button"
      className={`cyber-audio-toggle ${audioEnabled ? "is-on" : ""}`}
      onClick={toggleAudio}
      aria-label={audioEnabled ? "关闭声音" : "开启声音"}
      title={audioEnabled ? "关闭声音" : "开启声音"}
    >
      {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  ) : null;

  const common = {
    go,
    notice,
    setNotice,
    unlockStage,
    lockedNotice,
    missionStage,
    selectedBugId,
    selectedBug,
    description,
    setDescription,
    selectBug,
    submitBug,
    order: currentOrder,
    solution,
    factoryReveal,
    setFactoryReveal,
    factoryAreaId,
    viewedFactoryAreaIds,
    selectFactoryArea,
    openFactoryAreaLive,
    repairCharge,
    setRepairCharge,
    ingredientIds,
    setIngredientIds,
    liked,
    setLiked: setLikedWithTracking,
    saveReport,
    shareReport,
    openPurchasePage,
    reportRef,
    transitionPhase,
    homeArrivalActive,
    homeRepairActive,
    playAudioCue,
    startAudioLoop,
    stopAudioLoop,
    audioToggle
  };

  return (
    <>
      {hasEntered && (
        <>
          {page === "home" && <HomePage {...common} />}
          {page === "select" && <SelectPage {...common} />}
          {page === "workOrder" && <WorkOrderPage {...common} />}
          {page === "softRepair" && <SoftRepairPage {...common} />}
          {page === "proofingLive" && <ProofingLivePage {...common} />}
          {page === "ingredientScan" && <IngredientScanPage {...common} />}
          {page === "bakingLive" && <BakingLivePage {...common} />}
          {page === "packingLive" && <PackingLivePage {...common} />}
          {page === "report" && <ReportPage {...common} />}
        </>
      )}
      {showLoading && (
        <LoadingPage
          phase={transitionPhase}
          isExiting={loadingExiting}
          onEnter={enterHomeFromLoading}
          onAudioCue={playAudioCue}
        />
      )}
      {false && hasEntered && !showLoading && transitionPhase !== "handoff" && (
        <button
          type="button"
          className={`cyber-audio-toggle ${audioEnabled ? "is-on" : ""}`}
          onClick={toggleAudio}
          aria-label={audioEnabled ? "关闭声音" : "开启声音"}
          title={audioEnabled ? "关闭声音" : "开启声音"}
        >
          {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      )}
      {transitionPhase === "handoff" && <IntroMascotMorph />}
    </>
  );
}

export default App;
