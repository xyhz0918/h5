import { toPng } from "html-to-image";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assets } from "./lib/assets";
import { bugOptions, factoryAreaSequence } from "./lib/content";
import { timestamp, workOrderId } from "./lib/time";
import { IntroMascotMorph, LoadingPage } from "./components/loading";
import { BakingLivePage, HomePage, IngredientScanPage, PackingLivePage, ProofingLivePage, ReportPage, SelectPage, SoftRepairPage, WorkOrderPage } from "./pages";
import type { FactoryAreaId, PageId, TransitionPhase, WorkOrder } from "./types";

function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("loading");
  const [homeArrivalActive, setHomeArrivalActive] = useState(false);
  const [homeRepairActive, setHomeRepairActive] = useState(false);
  const [page, setPage] = useState<PageId>("home");
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [notice, setNotice] = useState("");
  const [liked, setLiked] = useState(false);
  const [missionStage, setMissionStage] = useState(0);
  const [factoryReveal, setFactoryReveal] = useState(0);
  const [factoryAreaId, setFactoryAreaId] = useState<FactoryAreaId>("material");
  const [viewedFactoryAreaIds, setViewedFactoryAreaIds] = useState<FactoryAreaId[]>(["material"]);
  const [repairCharge, setRepairCharge] = useState(0);
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
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

  const go = (target: PageId) => {
    setNotice("");
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

    const timeline = gsap.timeline({
      defaults: { ease: "power2.out", overwrite: "auto" },
      onComplete: () => {
        setShowLoading(false);
        setLoadingExiting(false);
        setHomeArrivalActive(false);
        setHomeRepairActive(false);
        setTransitionPhase("home");
        introTimelineRef.current = null;
      }
    });

    timeline
      .addLabel("handoff", 0)
      .to({}, { duration: 1.7 }, "handoff")
      .call(
        () => {
          setShowLoading(false);
          setLoadingExiting(false);
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

  const saveReport = async () => {
    if (!reportRef.current) return;

    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#020805"
      });
      const link = document.createElement("a");
      link.download = `豪士早餐透明报告-${currentOrder.id}.png`;
      link.href = dataUrl;
      link.click();
      setNotice("透明报告图片已生成，浏览器正在下载。");
    } catch {
      setNotice("保存图片失败，请截图保存当前透明报告。");
    }
  };

  const shareReport = async () => {
    const text = `我的早餐小 BUG 已完成透明工厂验证：${currentOrder.bugType}。当前身份：${solution.identity}，推荐方案：${solution.recommendation}。豪士豪士，好吃好吃。`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "豪士透明工厂 早餐透明报告", text });
        setNotice("分享面板已打开。");
        return;
      } catch {
        setNotice("已取消分享。");
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setNotice("当前浏览器不支持直接分享，已复制分享文案。");
    } catch {
      setNotice("当前浏览器不支持直接分享，请手动截图分享透明报告。");
    }
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
