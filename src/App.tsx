import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assets } from "./lib/assets";
import { bugOptions, factoryAreaSequence } from "./lib/content";
import { trackFunnelEvent, type FunnelEventName } from "./lib/tracking";
import { timestamp, workOrderId } from "./lib/time";
import { AdminPage } from "./AdminPage";
import { IntroMascotMorph, LoadingPage } from "./components/loading";
import { BakingLivePage, HomePage, IngredientScanPage, PackingLivePage, ProofingLivePage, ReportPage, SelectPage, SoftRepairPage, WorkOrderPage } from "./pages";
import type { FactoryAreaId, PageId, TransitionPhase, WorkOrder } from "./types";

const productPurchaseUrl = "https://item.jd.com/10074510939302.html";
const purchaseReturnSnapshotKey = "horsh:purchase-return:v1";
const purchaseReturnSnapshotTtlMs = 15 * 60 * 1000;

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
    assets.homePlatform,
    assets.homeMascot,
    assets.homePanelOnline,
    assets.homePanelPlan,
    assets.homePanelBread,
    assets.homePanelScan,
    assets.homePanelComplete
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
  report: [assets.bgTerminal, assets.productBoxCropped, assets.productFrontCropped]
};

const imagePreloadCache = new Set<string>();
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

  const image = new Image();
  image.decoding = "async";
  image.loading = loading;
  image.src = src;

  if (image.decode) {
    void image.decode().catch(() => undefined);
  }
}

function preloadPageImages(pageId: PageId, lookahead = 2, loading: "eager" | "lazy" = "eager") {
  const pageIndex = h5PagePreloadOrder.indexOf(pageId);
  const preloadPages =
    pageIndex >= 0 ? h5PagePreloadOrder.slice(pageIndex, pageIndex + lookahead + 1) : [pageId];

  preloadPages.forEach((page) => {
    h5PageImagePreloadMap[page].forEach((src) => preloadImage(src, loading));
  });
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
    return <AdminPage />;
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
  const introTimelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const trackedCompletionKeysRef = useRef<Set<string>>(new Set());
  const trackedReportIdsRef = useRef<Set<string>>(new Set());

  const selectedBug = useMemo(
    () => bugOptions.find((bug) => bug.id === selectedBugId) ?? null,
    [selectedBugId]
  );

  useEffect(() => {
    preloadPageImages("home", 1, "eager");
  }, []);

  useEffect(() => scheduleIdlePreload(() => preloadPageImages(page, 2)), [page]);

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
    introTimelineRef.current?.kill();

    setHasEntered(true);
    setTransitionPhase("handoff");
    setLoadingExiting(true);
    setHomeArrivalActive(true);
    setHomeRepairActive(true);

    const hideLoadingLayer = () => {
      setShowLoading(false);
      setLoadingExiting(false);
    };

    const completeIntroToHome = (killTimeline = false) => {
      clearIntroTimers();
      if (killTimeline) {
        introTimelineRef.current?.kill();
      }
      setShowLoading(false);
      setLoadingExiting(false);
      setHomeArrivalActive(false);
      setHomeRepairActive(false);
      setTransitionPhase("home");
      introTimelineRef.current = null;
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
      completeIntroToHome(true);
    }, 1700);

    const timeline = gsap.timeline({
      defaults: { ease: "power2.out", overwrite: "auto" },
      onComplete: () => {
        completeIntroToHome();
      }
    });

    timeline
      .addLabel("handoff", 0)
      .to({}, { duration: 1.7 }, "handoff")
      .call(
        () => {
          hideLoadingLayer();
        },
        [],
        "handoff+=0.22"
      )
      .call(() => setHomeRepairActive(false), [], "handoff+=1.58")
      .call(
        () => {
          setHomeArrivalActive(false);
          setTransitionPhase("home");
        },
        [],
        "handoff+=1.7"
      );

    introTimelineRef.current = timeline;
  }, [clearIntroTimers]);

  const enterHomeFromLoading = useCallback(() => {
    runIntroToHomeTimeline();
  }, [runIntroToHomeTimeline]);

  useEffect(
    () => () => {
      clearIntroTimers();
      introTimelineRef.current?.kill();
      introTimelineRef.current = null;
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
      setNotice("请先选择一个早餐困扰，再接入豪士透明工厂。");
      return;
    }

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
    if (!reportRef.current) return null;

    if (reportImageCacheRef.current?.key === reportImageCacheKey) {
      return reportImageCacheRef.current.blob;
    }

    const { toBlob } = await import("html-to-image");

    const blob = await toBlob(reportRef.current, {
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
      setNotice("透明报告图片已生成，浏览器正在下载。");
    } catch {
      trackEvent("report_save_failed", {
        stage: "report"
      });
      setNotice("保存图片失败，请截图保存当前透明报告。");
    }
  };

  const shareReport = async () => {
    const text = `我的早餐透明报告 ${currentOrder.id} 已生成：${currentOrder.bugType} 通过豪士透明工厂验证。当前身份：${solution.identity}，推荐方案：${solution.recommendation}。豪士藜麦吐司，好吃看得见。`;
    const title = "豪士透明工厂 早餐透明报告";

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
            setNotice("分享面板已打开。");
            return;
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          trackEvent("report_share_cancelled", {
            stage: "report",
            method: "web_share_file"
          });
          setNotice("已取消分享。");
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
        setNotice("分享面板已打开。");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          trackEvent("report_share_cancelled", {
            stage: "report",
            method: "web_share_text"
          });
          setNotice("已取消分享。");
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
      setNotice("当前浏览器不支持直接分享，已复制分享文案。");
    } catch {
      trackEvent("report_share_failed", {
        stage: "report"
      });
      setNotice("当前浏览器不支持直接分享，请手动截图分享透明报告。");
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
    homeRepairActive
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
        <LoadingPage phase={transitionPhase} isExiting={loadingExiting} onEnter={enterHomeFromLoading} />
      )}
      {transitionPhase === "handoff" && <IntroMascotMorph />}
    </>
  );
}

export default App;
