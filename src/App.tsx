import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assets } from "./lib/assets";
import { bugOptions, factoryAreaSequence } from "./lib/content";
import { timestamp, workOrderId } from "./lib/time";
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

  const selectedBug = useMemo(
    () => bugOptions.find((bug) => bug.id === selectedBugId) ?? null,
    [selectedBugId]
  );

  useEffect(() => {
    const preloadSources = [
      assets.homePlatform,
      assets.homeMascot,
      assets.homePanelOnline,
      assets.homePanelPlan,
      assets.homePanelBread,
      assets.homePanelScan,
      assets.homePanelComplete
    ];

    const preloadedImages = preloadSources.map((src) => {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = src;
      if (image.decode) {
        void image.decode().catch(() => undefined);
      }
      return image;
    });

    return () => {
      preloadedImages.length = 0;
    };
  }, []);

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

  const go = (target: PageId) => {
    setNotice("");
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
  };

  const submitBug = () => {
    if (!selectedBug) {
      setNotice("请先选择一个早餐困扰，再接入豪士透明工厂。");
      return;
    }

    clearPurchaseReturnSnapshot();
    const now = new Date();
    setOrder({
      id: workOrderId(now),
      bugType: selectedBug.reportLabel,
      description: description.trim() || selectedBug.defaultDescription,
      createdAt: timestamp(now),
      priority: "★★★★★ 最高"
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
      setNotice("透明报告图片已生成，浏览器正在下载。");
    } catch {
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
            setNotice("分享面板已打开。");
            return;
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setNotice("已取消分享。");
          return;
        }
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        setNotice("分享面板已打开。");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setNotice("已取消分享。");
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setNotice("当前浏览器不支持直接分享，已复制分享文案。");
    } catch {
      setNotice("当前浏览器不支持直接分享，请手动截图分享透明报告。");
    }
  };

  const openPurchasePage = () => {
    const currentHref = window.location.href;

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
    setLiked,
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
