import { toPng } from "html-to-image";
import gsap from "gsap";
import {
  ArrowLeft,
  Bug,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  Factory,
  Heart,
  HeartPulse,
  Leaf,
  LockKeyhole,
  MoreHorizontal,
  PackageOpen,
  ScanLine,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Thermometer,
  Timer,
  Utensils,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
  SetStateAction
} from "react";

type PageId =
  | "home"
  | "select"
  | "workOrder"
  | "factory"
  | "softRepair"
  | "ingredientScan"
  | "bakingLive"
  | "packingLive"
  | "complete"
  | "report";

type FactoryAreaId = "material" | "proofing" | "baking" | "packing";
type TransitionPhase = "loading" | "handoff" | "home";

type BugOption = {
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

type WorkOrder = {
  id: string;
  bugType: string;
  description: string;
  createdAt: string;
  priority: string;
};

const screenEntranceTargets = [
  ".top-bar",
  ".page-title",
  ".flow-nav",
  ".panel",
  ".live-card",
  ".metric-card",
  ".repair-status",
  ".check-row",
  ".report-card",
  ".bottom-actions"
].join(", ");

function useScreenEntranceMotion(rootRef: RefObject<HTMLElement>, enabled = true) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.set(screenEntranceTargets, { willChange: "transform, opacity" });

        const timeline = gsap.timeline({
          defaults: {
            duration: 0.42,
            ease: "power2.out",
            overwrite: "auto"
          },
          onComplete: () => {
            gsap.set(screenEntranceTargets, {
              clearProps: "transform,opacity,visibility,willChange"
            });
          }
        });

        timeline
          .from(".top-bar", { y: -12, autoAlpha: 0, duration: 0.32 }, 0)
          .from(".page-title", { y: 14, autoAlpha: 0 }, 0.06)
          .from(
            ".panel, .live-card, .metric-card, .repair-status, .check-row, .report-card",
            {
              y: 16,
              autoAlpha: 0,
              stagger: { each: 0.035, from: "start" }
            },
            0.14
          )
          .from(".flow-nav, .bottom-actions", { y: 16, autoAlpha: 0, duration: 0.36 }, 0.24);
      }, root);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, [rootRef, enabled]);
}

const assets = {
  logoCompact: new URL("../assets/brand/logo/horsh-logo-compact.png", import.meta.url).href,
  logoPrimary: new URL("../assets/brand/logo/horsh-logo-primary.png", import.meta.url).href,
  bgPortal: new URL("../assets/images/backgrounds/bg-portal-platform.webp", import.meta.url).href,
  bgCards: new URL("../assets/images/backgrounds/bg-card-slots.png", import.meta.url).href,
  bgFactory: new URL("../assets/images/backgrounds/bg-factory-line.png", import.meta.url).href,
  bgToastLab: new URL("../assets/images/backgrounds/bg-toast-lab.png", import.meta.url).href,
  bgTerminal: new URL("../assets/images/backgrounds/bg-terminal-corridor.png", import.meta.url).href,
  bgShield: new URL("../assets/images/backgrounds/bg-shield-platform.png", import.meta.url).href,
  homePlatform: new URL("../assets/images/home/home-platform.webp", import.meta.url).href,
  homeMascot: new URL("../assets/images/home/home-mascot.webp", import.meta.url).href,
  homePanelOnline: new URL("../assets/images/home/home-panel-online.webp", import.meta.url).href,
  homePanelPlan: new URL("../assets/images/home/home-panel-plan.webp", import.meta.url).href,
  homePanelBread: new URL("../assets/images/home/home-panel-bread.webp", import.meta.url).href,
  homePanelScan: new URL("../assets/images/home/home-panel-scan.webp", import.meta.url).href,
  homePanelComplete: new URL("../assets/images/home/home-panel-complete.webp", import.meta.url).href,
  mascotRepair: new URL("../assets/images/mascot/mascot-repair-master.png", import.meta.url).href,
  mascotField: new URL("../assets/images/mascot/mascot-field-agent_attr1_subject.png", import.meta.url).href,
  mascotOperator: new URL("../assets/images/mascot/mascot-operator-console.png", import.meta.url).href,
  mascotScan: new URL("../assets/images/mascot/mascot-toast-scan.png", import.meta.url).href,
  mascotGuardian: new URL("../assets/images/mascot/mascot-guardian-shield.png", import.meta.url).href,
  factoryHologram: new URL("../assets/images/factory/transparent-factory-hologram.webp", import.meta.url).href,
  ingredientMixer: new URL("../assets/images/ingredient/mixing-core-transparent.webp", import.meta.url).href,
  ingredientCardGluten: new URL("../assets/images/ui/图层 1.webp", import.meta.url).href,
  ingredientCardYeast: new URL("../assets/images/ui/图层 2.webp", import.meta.url).href,
  ingredientCardWheat: new URL("../assets/images/ui/图层 3.webp", import.meta.url).href,
  ingredientCardQuinoa: new URL("../assets/images/ui/图层 4.webp", import.meta.url).href,
  bakingOven: new URL("../assets/images/baking/oven-cavity.webp", import.meta.url).href,
  toastDough: new URL("../assets/images/baking/toast-dough.webp", import.meta.url).href,
  toastRaw: new URL("../assets/images/baking/toast-raw.webp", import.meta.url).href,
  toastOverdone: new URL("../assets/images/baking/toast-overdone.webp", import.meta.url).href,
  heatThumb: new URL("../assets/images/baking/heat-thumb-yellow.webp", import.meta.url).href,
  heatTrack: new URL("../assets/images/baking/heat-temperature-track.webp", import.meta.url).href,
  badgeRepair: new URL(
    "../assets/images/badges/badge-repair-success-transparent.png",
    import.meta.url
  ).href,
  productBox: new URL("../assets/product/quinoa-toast/box-420g-3d.png", import.meta.url).href,
  productFront: new URL("../assets/product/quinoa-toast/pouch-front.png", import.meta.url).href
};

const bugOptions: BugOption[] = [
  {
    id: "morning-class",
    title: "早八空腹危机",
    desc: "闹钟响了，人还没醒，早餐状态已经掉线",
    icon: Timer,
    reportLabel: "早八空腹危机",
    orderLabel: "早八空腹危机",
    defaultDescription: "早八时间紧，早餐状态出现 BUG，上午容易掉线。",
    abnormalRole: "早八空腹怪",
    identity: "三分钟早餐战士",
    recommendation: "豪士吐司 + 牛奶",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "早八可以赶，早餐别将就。"
  },
  {
    id: "commute",
    title: "通勤早餐加载失败",
    desc: "包、手机、地铁卡都在线，早餐入口却卡住",
    icon: PackageOpen,
    reportLabel: "通勤早餐加载失败",
    orderLabel: "通勤早餐加载失败",
    defaultDescription: "通勤路上节奏太快，早餐状态加载失败，希望更省心、更好入口。",
    abnormalRole: "通勤加载怪",
    identity: "移动早餐玩家",
    recommendation: "豪士吐司便携组合",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "通勤路上，也能安排一口好吃。"
  },
  {
    id: "dorm",
    title: "宿舍早餐系统休眠",
    desc: "人还在床上，早餐程序迟迟没有启动",
    icon: Utensils,
    reportLabel: "宿舍早餐系统休眠",
    orderLabel: "宿舍早餐系统休眠",
    defaultDescription: "宿舍早餐状态休眠，希望不用折腾也能快速接入好吃。",
    abnormalRole: "宿舍休眠怪",
    identity: "宿舍早餐唤醒员",
    recommendation: "豪士吐司 + 热饮",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "不下楼，也能把早餐安排好。"
  },
  {
    id: "fitness",
    title: "健身后早餐选择卡顿",
    desc: "运动结束，早餐选择界面突然转圈",
    icon: HeartPulse,
    reportLabel: "健身后早餐选择卡顿",
    orderLabel: "健身后早餐选择卡顿",
    defaultDescription: "运动后想补充点能量，早餐选择却卡顿，希望轻松、方便、好入口。",
    abnormalRole: "补给卡顿怪",
    identity: "轻松补给派",
    recommendation: "豪士吐司 + 鸡蛋 / 牛奶",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "运动之后，给自己一份轻松补给。"
  },
  {
    id: "weekend",
    title: "周末仪式感启动失败",
    desc: "想认真吃顿早餐，但启动按钮一直没亮",
    icon: Star,
    reportLabel: "周末仪式感启动失败",
    orderLabel: "周末仪式感启动失败",
    defaultDescription: "周末想吃得认真一点，但早餐仪式感启动失败，希望搭配简单又看得见好吃过程。",
    abnormalRole: "仪式感掉线怪",
    identity: "周末慢早餐家",
    recommendation: "豪士吐司 + 水果 + 咖啡",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "不用复杂，也能吃得认真。"
  }
];

const flowSteps = [
  { label: "识别异常", icon: Bug },
  { label: "数据接入", icon: ClipboardList },
  { label: "控制舱启动", icon: Factory },
  { label: "生成报告", icon: ScanLine }
];

const matrixBinaryTokens = [
  "0",
  "1",
  "0",
  "1",
  "0",
  "1",
  "0",
  "1",
  "0",
  "1"
];

const matrixStoryTokens = [
  "\u8c6a",
  "\u58eb",
  "\u597d",
  "\u5403"
];

const matrixRainPhrases = [
  ["\u8c6a", "\u58eb"],
  ["\u597d", "\u5403"],
  ["\u8c6a", "\u58eb", "\u597d", "\u5403"]
];

const factoryAreaSequence: FactoryAreaId[] = ["material", "proofing", "baking", "packing"];
const designCanvasWidth = 640;
const designCanvasHeight = 1030;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function timestamp(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function workOrderId(date: Date) {
  return `WO-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}`;
}

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

  const currentOrder =
    order ??
    ({
      id: "WO-20250520-0901",
      bugType: solution.reportLabel,
      description: description.trim() || solution.defaultDescription,
      createdAt: "2025-05-20 09:01",
      priority: "★★★★★ 最高"
    } satisfies WorkOrder);

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
        "handoff+=0.72"
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

    if (areaId === "proofing") {
      unlockStage(3);
      go("softRepair");
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
      setNotice("请先选择一个早餐异常状态，再接入豪士透明工厂。");
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
      link.download = `豪士早餐系统重启报告-${currentOrder.id}.png`;
      link.href = dataUrl;
      link.click();
      setNotice("重启报告图片已生成，浏览器正在下载。");
    } catch {
      setNotice("保存图片失败，请使用系统截图保存当前重启报告。");
    }
  };

  const shareReport = async () => {
    const text = `我的早餐系统已重启：${currentOrder.bugType}。当前身份：${solution.identity}，推荐方案：${solution.recommendation}。豪士豪士，好吃好吃。`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "豪士透明工厂 早餐系统重启报告", text });
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
      setNotice("当前浏览器不支持直接分享，请手动截图分享重启报告。");
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
          {page === "factory" && <FactoryPage {...common} />}
          {page === "softRepair" && <SoftRepairPage {...common} />}
          {page === "ingredientScan" && <IngredientScanPage {...common} />}
          {page === "bakingLive" && <BakingLivePage {...common} />}
          {page === "packingLive" && <PackingLivePage {...common} />}
          {page === "complete" && <CompletePage {...common} />}
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

type PageProps = {
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
  reportRef: RefObject<HTMLDivElement>;
  transitionPhase: TransitionPhase;
  homeArrivalActive: boolean;
  homeRepairActive: boolean;
};

function Screen({
  children,
  background,
  className = "",
  entranceMotion = true
}: {
  children: ReactNode;
  background: string;
  className?: string;
  entranceMotion?: boolean;
}) {
  const screenRef = useRef<HTMLElement>(null);
  const [designScale, setDesignScale] = useState(1);
  useScreenEntranceMotion(screenRef, entranceMotion);

  useLayoutEffect(() => {
    const updateScale = () => {
      const viewport = window.visualViewport;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const nextScale = Math.min(viewportWidth / designCanvasWidth, viewportHeight / designCanvasHeight, 1);

      setDesignScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();

    window.addEventListener("resize", updateScale);
    window.visualViewport?.addEventListener("resize", updateScale);
    window.visualViewport?.addEventListener("scroll", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
      window.visualViewport?.removeEventListener("resize", updateScale);
      window.visualViewport?.removeEventListener("scroll", updateScale);
    };
  }, []);

  useLayoutEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = 0;
    }
  }, []);

  return (
    <main
      ref={screenRef}
      className={`screen ${className}`}
      style={{ "--screen-bg": `url(${background})`, "--design-scale": designScale } as CSSProperties}
    >
      <div className="screen-frame-shell">
        <div className="screen-frame">
          <MotionLayer />
          <div className="screen-body">{children}</div>
        </div>
      </div>
    </main>
  );
}

function MotionLayer() {
  return (
    <div className="motion-layer" aria-hidden="true">
      <div className="digital-rain rain-a" />
      <div className="digital-rain rain-b" />
      <div className="scan-beam-horizontal" />
      <div className="hud-sweep" />
      <div className="particle-field">
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

function IntroMascotMorph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    type MorphPoint = {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      arc: number;
      sway: number;
      size: number;
      alpha: number;
      delay: number;
      token: string;
      seed: number;
    };

    type MorphBox = {
      left: number;
      top: number;
      width: number;
      height: number;
    };

    const tokens = ["0", "1", "\u8c6a", "\u58eb", "\u597d", "\u5403"];
    const playhead = { progress: 0, alpha: 1 };
    let disposed = false;
    let timeline: ReturnType<typeof gsap.timeline> | null = null;
    let setupFrame = 0;
    let imageStarted = false;
    let morphStarted = false;
    let pixelRatio = 1;
    let width = 0;
    let height = 0;
    let points: MorphPoint[] = [];

    const resizeCanvas = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const rectToBox = (rect: DOMRect): MorphBox => ({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    });

    const fallbackBox = (kind: "start" | "end"): MorphBox => {
      const boxWidth = Math.min(width * 0.88, 356);
      const boxHeight = Math.min(height * 0.46, 374);
      return {
        left: (width - boxWidth) / 2,
        top: kind === "start" ? Math.max(0, height * 0.04) : Math.max(0, height * 0.08),
        width: boxWidth,
        height: boxHeight
      };
    };

    const getElementBox = (selector: string, kind: "start" | "end") => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return fallbackBox(kind);

      const rect = element.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return fallbackBox(kind);

      return rectToBox(rect);
    };

    const containImageBox = (box: MorphBox, image: HTMLImageElement): MorphBox => {
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const boxRatio = box.width / box.height;

      if (boxRatio > imageRatio) {
        const drawHeight = box.height;
        const drawWidth = drawHeight * imageRatio;
        return {
          left: box.left + (box.width - drawWidth) / 2,
          top: box.top,
          width: drawWidth,
          height: drawHeight
        };
      }

      const drawWidth = box.width;
      const drawHeight = drawWidth / imageRatio;
      return {
        left: box.left,
        top: box.top + (box.height - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight
      };
    };

    const buildMaskPoints = (image: HTMLImageElement) => {
      const mask = document.createElement("canvas");
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return [];

      const maskWidth = 96;
      const maskHeight = Math.max(108, Math.round(maskWidth * image.naturalHeight / image.naturalWidth));
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const maskRatio = maskWidth / maskHeight;
      const drawWidth = maskRatio > imageRatio ? maskHeight * imageRatio : maskWidth;
      const drawHeight = drawWidth / imageRatio;
      const offsetX = (maskWidth - drawWidth) / 2;
      const offsetY = (maskHeight - drawHeight) / 2;

      mask.width = maskWidth;
      mask.height = maskHeight;
      maskContext.clearRect(0, 0, maskWidth, maskHeight);
      maskContext.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

      const data = maskContext.getImageData(0, 0, maskWidth, maskHeight).data;
      const candidates: Array<{ x: number; y: number; alpha: number }> = [];
      const step = 4;

      for (let y = Math.floor(offsetY); y < offsetY + drawHeight; y += step) {
        for (let x = Math.floor(offsetX); x < offsetX + drawWidth; x += step) {
          const alpha = data[(y * maskWidth + x) * 4 + 3] / 255;
          if (alpha < 0.2 || Math.random() > Math.min(0.96, alpha + 0.18)) continue;

          candidates.push({
            x: (x - offsetX) / drawWidth,
            y: (y - offsetY) / drawHeight,
            alpha
          });
        }
      }

      return candidates;
    };

    const buildParticles = (image: HTMLImageElement) => {
      const startBox = containImageBox(getElementBox(".matrix-transition-mascot", "start"), image);
      const endBox = containImageBox(getElementBox(".home-mascot", "end"), image);
      const candidates = buildMaskPoints(image).sort(() => Math.random() - 0.5);
      const pointCount = Math.min(540, Math.max(320, Math.round((width * height) / 1600)));

      points = candidates.slice(0, pointCount).map((point, index) => {
        const alignedX = endBox.left + point.x * endBox.width;
        const alignedY = endBox.top + point.y * endBox.height;
        const startX = alignedX + (startBox.left - endBox.left) * 0.18 + (Math.random() - 0.5) * 4;
        const startY = alignedY + (startBox.top - endBox.top) * 0.18 + (Math.random() - 0.5) * 4;
        const endX = endBox.left + point.x * endBox.width;
        const endY = endBox.top + point.y * endBox.height;

        return {
          startX,
          startY,
          endX,
          endY,
          arc: (Math.random() - 0.5) * 10,
          sway: (Math.random() - 0.5) * 12,
          size: 6.5 + Math.random() * 5.8,
          alpha: 0.42 + point.alpha * 0.58,
          delay: Math.min(0.22, (index / pointCount) * 0.2 + Math.random() * 0.04),
          token: tokens[Math.floor(Math.random() * tokens.length)],
          seed: Math.random() * Math.PI * 2
        };
      });
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      context.textAlign = "center";
      context.textBaseline = "middle";

      const ease = gsap.parseEase("power3.inOut");
      const clamp = gsap.utils.clamp(0, 1);

      for (const point of points) {
        const local = clamp((playhead.progress - point.delay) / (1 - point.delay));
        if (local <= 0) continue;

        const eased = ease(local);
        const lift = Math.sin(local * Math.PI) * point.arc * 0.28;
        const sway = Math.sin(local * Math.PI) * point.sway * 0.28;
        const shimmer = Math.sin(playhead.progress * 10 + point.seed) * 1.6 * (1 - eased);
        const x = gsap.utils.interpolate(point.startX, point.endX, eased) + sway + shimmer;
        const y = gsap.utils.interpolate(point.startY, point.endY, eased) + lift;
        const born = clamp(local / 0.16);
        const settle = 1 - clamp((local - 0.88) / 0.12) * 0.24;
        const alpha = point.alpha * born * settle * playhead.alpha;
        const redMix = 1 - clamp(local * 1.35);
        const r = Math.round(gsap.utils.interpolate(74, 255, redMix));
        const g = Math.round(gsap.utils.interpolate(255, 86, redMix));
        const b = Math.round(gsap.utils.interpolate(154, 104, redMix));
        const size = point.size * gsap.utils.interpolate(1.15, 0.82, eased);

        context.shadowColor = `rgba(${r}, ${g}, ${b}, ${Math.min(0.88, alpha + 0.2)})`;
        context.shadowBlur = 12 + (1 - eased) * 10;
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        if (local < 0.72) {
          context.font = `${size}px Consolas, "Microsoft YaHei", monospace`;
          context.fillText(point.token, x, y);
        } else {
          context.beginPath();
          context.arc(x, y, Math.max(1.35, size * 0.24), 0, Math.PI * 2);
          context.fill();
        }
      }

      context.globalCompositeOperation = "source-over";
      context.shadowBlur = 0;
    };

    const startMorph = (image: HTMLImageElement) => {
      if (morphStarted || disposed) return;
      morphStarted = true;
      resizeCanvas();
      buildParticles(image);
      if (!points.length || disposed) return;

      gsap.set(canvas, { autoAlpha: 1 });
      draw();

      timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onUpdate: draw,
        onComplete: () => {
          context.clearRect(0, 0, width, height);
        }
      });

      timeline
        .to(playhead, { progress: 1, duration: 1.36, ease: "power3.inOut" }, 0)
        .to(playhead, { alpha: 0, duration: 0.34, ease: "power1.out" }, 1.22);
    };

    const loadImage = () => {
      if (imageStarted || disposed) return;
      imageStarted = true;

      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => startMorph(image);
      image.src = assets.homeMascot;

      if (image.complete && image.naturalWidth) {
        startMorph(image);
      }
    };

    resizeCanvas();
    setupFrame = window.requestAnimationFrame(() => {
      setupFrame = window.requestAnimationFrame(loadImage);
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(setupFrame);
      timeline?.kill();
      context.clearRect(0, 0, width, height);
    };
  }, []);

  return <canvas ref={canvasRef} className="intro-mascot-morph" aria-hidden="true" />;
}

function LoadingPage({
  phase,
  isExiting,
  onEnter
}: {
  phase: TransitionPhase;
  isExiting: boolean;
  onEnter: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mascotCodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const isExitingRef = useRef(isExiting);
  const [progress, setProgress] = useState(0);
  const hasCompletedRef = useRef(false);
  const loadingDurationMs = 3000;
  const countdown = Math.max(0, Math.ceil((100 - progress) / 100 * 3));
  const entryStatus =
    progress < 34
      ? "\u65e9\u9910\u5f02\u5e38\u626b\u63cf\u4e2d"
      : progress < 68
        ? "\u900f\u660e\u5de5\u5382\u63a5\u5165\u4e2d"
        : "\u8c6a\u5c0f\u58eb\u51c6\u5907\u5c31\u7eea";

  useEffect(() => {
    isExitingRef.current = isExiting;
  }, [isExiting]);

  useEffect(() => {
    const progressValue = { value: 0 };
    let lastProgress = -1;
    const tween = gsap.to(progressValue, {
      value: 100,
      duration: loadingDurationMs / 1000,
      ease: "none",
      onUpdate: () => {
        const nextProgress = Math.min(100, Math.round(progressValue.value));
        if (nextProgress === lastProgress) return;

        lastProgress = nextProgress;
        setProgress(nextProgress);
      },
      onComplete: () => {
        setProgress(100);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onEnter();
        }
      }
    });

    return () => {
      tween.kill();
    };
  }, [onEnter]);

  useEffect(() => {
    if (progress >= 100 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onEnter();
    }
  }, [onEnter, progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let columns = 0;
    let drops: number[] = [];
    let speeds: number[] = [];
    let streamLengths: number[] = [];
    let columnOffsets: number[] = [];
    let columnPhrases: string[][] = [];
    let streamTokens: string[][] = [];
    const fontSize = 14;
    const columnWidth = 22;
    const intervalMs = 76;

    const pickMatrixToken = (preferStory = false) => {
      if (Math.random() < (preferStory ? 0.36 : 0.24)) {
        return matrixStoryTokens[Math.floor(Math.random() * matrixStoryTokens.length)];
      }

      return matrixBinaryTokens[Math.floor(Math.random() * matrixBinaryTokens.length)];
    };

    const buildStreamTokens = (length: number, phrase: string[]) => {
      const phraseStart = phrase.length
        ? Math.floor(Math.random() * Math.max(1, length - phrase.length + 1))
        : -1;

      return Array.from({ length }, (_, tailIndex) => {
        if (phraseStart >= 0 && tailIndex >= phraseStart && tailIndex < phraseStart + phrase.length) {
          return phrase[tailIndex - phraseStart];
        }

        return pickMatrixToken(false);
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(rect.width * pixelRatio);
      canvas.height = Math.floor(rect.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const rows = Math.ceil(rect.height / fontSize);
      columns = Math.ceil(rect.width / columnWidth) + 4;
      drops = Array.from({ length: columns }, () => Math.random() * rows * 1.24);
      speeds = Array.from({ length: columns }, () => 0.24 + Math.random() * 0.22);
      streamLengths = Array.from({ length: columns }, () => 9 + Math.floor(Math.random() * 7));
      columnOffsets = Array.from({ length: columns }, () => Math.random() * 6 - 3);
      columnPhrases = Array.from({ length: columns }, () =>
        Math.random() > 0.18 ? matrixRainPhrases[Math.floor(Math.random() * matrixRainPhrases.length)] : []
      );
      streamTokens = streamLengths.map((length, index) => buildStreamTokens(length, columnPhrases[index]));
    };

    let rainTimer: number | null = null;

    const shouldDraw = () => !isExitingRef.current && document.visibilityState === "visible";

    const stopRain = () => {
      if (rainTimer !== null) {
        window.clearInterval(rainTimer);
        rainTimer = null;
      }
    };

    const draw = () => {
      if (!shouldDraw()) {
        stopRain();
        return;
      }

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      context.fillStyle = "rgba(0, 0, 0, 0.44)";
      context.fillRect(0, 0, width, height);
      context.textBaseline = "top";
      context.textAlign = "center";

      for (let index = 0; index < columns; index += 1) {
        const x = index * columnWidth + columnWidth / 2 + columnOffsets[index];

        for (let tail = 0; tail < streamLengths[index]; tail += 1) {
          const token = streamTokens[index]?.[tail] ?? pickMatrixToken(false);
          const y = (drops[index] - tail) * fontSize;

          if (y < -fontSize || y > height + fontSize) continue;

          const isStoryToken = matrixStoryTokens.includes(token) || /[^\x00-\x7F]/.test(token);
          const alpha = tail === 0 ? 0.94 : Math.max(0.07, 0.5 - tail * 0.052);
          const drawFontSize = isStoryToken ? 16 : fontSize;

          context.shadowColor = isStoryToken
            ? `rgba(137, 255, 183, ${Math.min(0.72, alpha + 0.08)})`
            : `rgba(43, 255, 124, ${Math.min(0.62, alpha + 0.08)})`;
          context.shadowBlur = tail === 0 ? 8 : 3;
          context.font = `${drawFontSize}px Consolas, "Microsoft YaHei", monospace`;
          context.fillStyle =
            tail === 0
              ? isStoryToken
                ? "rgba(197, 255, 216, 0.82)"
                : "rgba(236, 255, 240, 0.88)"
              : isStoryToken
                ? `rgba(168, 255, 202, ${alpha})`
                : `rgba(78, 255, 141, ${alpha})`;
          context.fillText(token, x, y);
        }

        drops[index] += speeds[index];
        if ((drops[index] - streamLengths[index]) * fontSize > height && Math.random() > 0.94) {
          drops[index] = Math.random() * -18;
          speeds[index] = 0.24 + Math.random() * 0.22;
          streamLengths[index] = 9 + Math.floor(Math.random() * 7);
          columnOffsets[index] = Math.random() * 6 - 3;
          columnPhrases[index] =
            Math.random() > 0.18 ? matrixRainPhrases[Math.floor(Math.random() * matrixRainPhrases.length)] : [];
          streamTokens[index] = buildStreamTokens(streamLengths[index], columnPhrases[index]);
        }
      }

      context.shadowBlur = 0;
    };

    const startRain = () => {
      if (rainTimer === null && shouldDraw()) {
        rainTimer = window.setInterval(draw, intervalMs);
      }
    };

    const handleVisibilityChange = () => {
      if (shouldDraw()) {
        draw();
        startRain();
      } else {
        stopRain();
      }
    };

    resize();
    draw();
    startRain();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopRain();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const canvas = mascotCodeCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    type CodePoint = {
      x: number;
      y: number;
      token: string;
      delay: number;
      size: number;
      alpha: number;
    };

    const image = new Image();
    image.crossOrigin = "anonymous";

    let disposed = false;
    let points: CodePoint[] = [];
    let rafId = 0;
    let startTime = 0;
    let lastDrawTime = 0;
    let width = 0;
    let height = 0;

    const mascotTokens = [
      "0",
      "1",
      "0",
      "1",
      "0",
      "1",
      "\u8c6a",
      "\u58eb",
      "\u597d",
      "\u5403"
    ];

    const buildPoints = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const mask = document.createElement("canvas");
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return;

      mask.width = width;
      mask.height = height;
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;

      maskContext.clearRect(0, 0, width, height);
      maskContext.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

      const data = maskContext.getImageData(0, 0, width, height).data;
      const nextPoints: CodePoint[] = [];
      const step = Math.max(9, Math.round(width / 38));

      for (let y = step * 0.7; y < height; y += step) {
        for (let x = step * 0.55; x < width; x += step) {
          const index = (Math.floor(y) * width + Math.floor(x)) * 4 + 3;
          const maskAlpha = data[index] / 255;
          if (maskAlpha < 0.18 || Math.random() > Math.min(0.96, maskAlpha + 0.24)) continue;

          nextPoints.push({
            x: x + (Math.random() - 0.5) * step * 0.72,
            y: y + (Math.random() - 0.5) * step * 0.72,
            token: mascotTokens[Math.floor(Math.random() * mascotTokens.length)],
            delay: Math.random() * 0.18,
            size: 9 + Math.random() * 4,
            alpha: 0.58 + Math.random() * 0.42
          });
        }
      }

      points = nextPoints;
    };

    const shouldDraw = () => !disposed && !isExitingRef.current && document.visibilityState === "visible";

    const draw = (time: number) => {
      if (!shouldDraw()) return;
      if (!startTime) startTime = time;
      if (time - lastDrawTime < 28) {
        rafId = window.requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = time;

      const progressRatio = Math.min(1, (time - startTime) / 3000);
      const fade = 1;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";
      context.textAlign = "center";
      context.textBaseline = "middle";

      for (const point of points) {
        const born = Math.max(0, (progressRatio - point.delay) / 0.22);
        const reveal = Math.min(1, born);
        if (reveal <= 0 || fade <= 0) continue;

        const alpha = point.alpha * reveal * fade;
        const drift = Math.sin(progressRatio * 7 + point.x * 0.02) * 5 * (1 - progressRatio);
        context.font = `${point.size}px Consolas, "Microsoft YaHei", monospace`;
        context.shadowColor = `rgba(73, 255, 149, ${Math.min(0.86, alpha + 0.18)})`;
        context.shadowBlur = 12;
        context.fillStyle = point.token.length > 2
          ? `rgba(188, 255, 212, ${alpha})`
          : `rgba(68, 255, 140, ${alpha})`;
        context.fillText(point.token, point.x + drift, point.y - progressRatio * 10);
      }

      context.shadowBlur = 0;
      if (fade > 0) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    const setup = () => {
      if (disposed || !image.complete || !image.naturalWidth) return;
      buildPoints();
      context.clearRect(0, 0, width, height);
      startTime = performance.now();
      window.cancelAnimationFrame(rafId);
      if (shouldDraw()) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setup();
      } else {
        window.cancelAnimationFrame(rafId);
      }
    };

    image.onload = setup;
    image.src = assets.homeMascot;

    if (image.complete) {
      setup();
    }

    window.addEventListener("resize", setup);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setup);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <main
      className={`matrix-entry phase-${phase} ${isExiting ? "is-exiting" : ""}`}
      aria-label={"\u8c6a\u58eb\u65e9\u9910\u7cfb\u7edf\u63a5\u5165\u52a0\u8f7d\u9875"}
    >
      <canvas ref={canvasRef} className="matrix-rain-canvas" aria-hidden="true" />
      <div className="matrix-vignette" aria-hidden="true" />

      <section className="matrix-system-panel">
        <div className="matrix-transition-mascot" aria-hidden="true">
          <img src={assets.homeMascot} alt="" />
          <canvas ref={mascotCodeCanvasRef} className="matrix-mascot-code-canvas" />
        </div>

        <div className="matrix-entry-copy">
          <span className="matrix-system-kicker">HORSH BREAKFAST SYSTEM</span>
          <h1>{"\u4f60\u6b63\u5728\u8fdb\u5165\u65e9\u9910\u7cfb\u7edf"}</h1>
          <p className="matrix-entry-status">{entryStatus}</p>
          <div
            className="matrix-simple-countdown"
            aria-live="polite"
            aria-label={`\u5012\u8ba1\u65f6 ${countdown}`}
            style={{ "--countdown-progress": `${progress}%` } as CSSProperties}
          >
            <span>T-{String(countdown).padStart(2, "0")}</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function TopBar({ onBack, progress }: { onBack?: () => void; progress?: string }) {
  return (
    <header className="top-bar">
      <div className="brand-side">
        {onBack && (
          <button className="icon-btn" onClick={onBack} aria-label="返回">
            <ArrowLeft size={18} />
          </button>
        )}
        <img src={assets.logoCompact} alt="HORSH 豪士" className="logo" />
        {progress && <span className="step-pill">{progress}</span>}
      </div>
      <div className="online-panel">
        <span />
        <b>SYSTEM STATUS</b>
        <strong>ONLINE</strong>
      </div>
    </header>
  );
}

function PageTitle({
  label,
  title,
  subtitle,
  titleClassName,
  titleDataText
}: {
  label: string;
  title: ReactNode;
  subtitle: string;
  titleClassName?: string;
  titleDataText?: string;
}) {
  return (
    <section className="page-title">
      <p>{label}</p>
      <h1 className={titleClassName} data-text={titleDataText}>{title}</h1>
      <span>{subtitle}</span>
    </section>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function GlowButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  icon
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button className={`glow-btn ${variant}`} onClick={onClick} disabled={disabled}>
      <span>{children}</span>
      {icon ?? <ChevronRight size={18} />}
    </button>
  );
}

function CompletionModal({
  ariaLabel,
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary
}: {
  ariaLabel: string;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  return (
    <div className="completion-modal-backdrop" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <Panel className="completion-modal">
        <b>{title}</b>
        <p>{body}</p>
        <GlowButton onClick={onPrimary}>{primaryLabel}</GlowButton>
        <button type="button" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      </Panel>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return text ? <div className="notice">{text}</div> : null;
}

function FlowNav({ active }: { active: number }) {
  return (
    <nav className="flow-nav" aria-label="系统流程">
      {flowSteps.map(({ label, icon: Icon }, index) => (
        <div className={`flow-item ${index <= active ? "active" : ""}`} key={label}>
          <i>{index + 1}</i>
          <Icon size={18} />
          <span>{label}</span>
        </div>
      ))}
    </nav>
  );
}

function HomeImagePanel({
  src,
  className,
  showRedLayer
}: {
  src: string;
  className: string;
  showRedLayer: boolean;
}) {
  return (
    <div className={`home-float-panel ${className}`} aria-hidden="true">
      <img src={src} alt="" className="home-panel-original" decoding="async" loading="eager" />
      {showRedLayer && <img src={src} alt="" className="home-panel-red" decoding="async" loading="eager" />}
    </div>
  );
}

function HomePage({ go, notice, transitionPhase, homeArrivalActive, homeRepairActive }: PageProps) {
  return (
    <Screen
      background={assets.bgPortal}
      className={`home-page transition-${transitionPhase} ${homeArrivalActive ? "home-arrival" : ""} ${homeRepairActive ? "home-repair-active" : ""}`}
      entranceMotion={false}
    >
      <TopBar />

      <section className="hero-stage home-hero-stage">
        <img src={assets.homePlatform} alt="" className="home-platform" aria-hidden="true" decoding="async" loading="eager" />
        <img src={assets.homeMascot} alt="豪小士透明工厂后台助手" className="home-mascot" decoding="async" loading="eager" />
        <HomeImagePanel src={assets.homePanelOnline} className="home-panel-online" showRedLayer={homeRepairActive} />
        <HomeImagePanel src={assets.homePanelPlan} className="home-panel-plan" showRedLayer={homeRepairActive} />
        <HomeImagePanel src={assets.homePanelBread} className="home-panel-bread is-focus" showRedLayer={homeRepairActive} />
        <HomeImagePanel src={assets.homePanelScan} className="home-panel-scan" showRedLayer={homeRepairActive} />
        <HomeImagePanel src={assets.homePanelComplete} className="home-panel-complete" showRedLayer={homeRepairActive} />
      </section>

      <PageTitle
        label="BREAKFAST SYSTEM REBOOT"
        title={
          <>
            早餐系统
            <br />
            异常检测中
          </>
        }
        titleClassName="glitch-title is-glitching"
        titleDataText="早餐系统异常检测中"
        subtitle="检测到你的早餐状态出现 BUG。豪士透明工厂后台正在接入……"
      />

      <section className="warning-carousel" aria-label="早餐问题预警">
        <header>
          <span>BREAKFAST WARNING</span>
          <b>BUG ALERT</b>
        </header>
        <div className="warning-lines">
          <strong>通勤路上不知道吃什么？</strong>
          <strong>早八来不及吃早餐？</strong>
          <strong>想吃得安心，却看不见生产过程？</strong>
        </div>
      </section>

      <p className="story-copy">进入豪士透明工厂后台，看见好吃如何生成。</p>

      <div className="bottom-actions">
        <GlowButton onClick={() => go("select")}>启动早餐系统重启</GlowButton>
        <FlowNav active={0} />
      </div>
      <Notice text={notice} />
    </Screen>
  );
}

function SelectPage({
  go,
  notice,
  selectedBugId,
  selectedBug,
  description,
  setDescription,
  selectBug,
  submitBug
}: PageProps) {
  const bugGridRef = useRef<HTMLElement>(null);
  const bugTrackRef = useRef<HTMLDivElement>(null);
  const [activeBugIndex, setActiveBugIndex] = useState(() => {
    const selectedIndex = selectedBugId ? bugOptions.findIndex((bug) => bug.id === selectedBugId) : -1;
    return selectedIndex >= 0 ? selectedIndex : 0;
  });
  const activeBugIndexRef = useRef(activeBugIndex);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startIndex: number;
    startTrackX: number;
    dragging: boolean;
  } | null>(null);
  const suppressCardClickRef = useRef(false);
  const mascotStateClass = "";

  const clampBugIndex = (index: number) => Math.min(Math.max(index, 0), bugOptions.length - 1);

  const getBugTrackX = useCallback((index: number) => {
    const grid = bugGridRef.current;
    const track = bugTrackRef.current;
    if (!grid || !track) return 0;

    const cards = Array.from(track.querySelectorAll<HTMLElement>(".bug-card"));
    const card = cards[clampBugIndex(index)];
    if (!card) return 0;

    return grid.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
  }, []);

  const animateBugCards = useCallback((index: number, immediate = false, dragOffset = 0) => {
    const track = bugTrackRef.current;
    if (!track) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(track, {
      x: getBugTrackX(index) + dragOffset,
      duration: immediate || prefersReducedMotion ? 0 : 0.36,
      ease: "power3.out",
      overwrite: "auto"
    });
  }, [getBugTrackX]);

  const moveToBugIndex = useCallback((index: number, shouldSelect = true, immediate = false) => {
    const nextIndex = clampBugIndex(index);
    activeBugIndexRef.current = nextIndex;
    setActiveBugIndex(nextIndex);
    if (shouldSelect) {
      selectBug(bugOptions[nextIndex].id);
    }
    animateBugCards(nextIndex, immediate);
  }, [animateBugCards, selectBug]);

  useLayoutEffect(() => {
    const selectedIndex = selectedBugId ? bugOptions.findIndex((bug) => bug.id === selectedBugId) : -1;
    if (selectedIndex >= 0 && selectedIndex !== activeBugIndexRef.current) {
      activeBugIndexRef.current = selectedIndex;
      setActiveBugIndex(selectedIndex);
      animateBugCards(selectedIndex, true);
    }
  }, [animateBugCards, selectedBugId]);

  useLayoutEffect(() => {
    const syncLayout = () => animateBugCards(activeBugIndexRef.current, true);

    syncLayout();
    window.addEventListener("resize", syncLayout);

    return () => {
      window.removeEventListener("resize", syncLayout);
      if (bugTrackRef.current) {
        gsap.killTweensOf(bugTrackRef.current);
      }
    };
  }, [animateBugCards]);

  const previewBugDrag = (trackX: number, dragOffset: number) => {
    const track = bugTrackRef.current;
    if (!track) return;

    gsap.set(track, { x: trackX + dragOffset });
  };

  const startBugDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    suppressCardClickRef.current = false;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startIndex: activeBugIndexRef.current,
      startTrackX: getBugTrackX(activeBugIndexRef.current),
      dragging: false
    };
  };

  const moveBugDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.dragging) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

      dragState.dragging = true;
      suppressCardClickRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    previewBugDrag(dragState.startTrackX, deltaX * 0.72);
  };

  const endBugDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const grid = bugGridRef.current;
    const deltaX = event.clientX - dragState.startX;
    const swipeThreshold = grid ? Math.min(72, Math.max(42, grid.clientWidth * 0.09)) : 48;

    dragStateRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!dragState.dragging) return;

    const nextIndex = Math.abs(deltaX) >= swipeThreshold
      ? dragState.startIndex + (deltaX < 0 ? 1 : -1)
      : dragState.startIndex;

    moveToBugIndex(nextIndex, true);
    window.setTimeout(() => {
      suppressCardClickRef.current = false;
    }, 120);
  };

  return (
    <Screen background={assets.bgCards} className={`select-page ${mascotStateClass}`}>
      <TopBar onBack={() => go("home")} progress="02 / 08" />
      <img
        src={assets.mascotField}
        alt="豪小士"
        className="corner-mascot"
      />
      <PageTitle
        label="BUG SELECTOR"
        title="请选择你的早餐异常状态"
        subtitle="选定一个早餐 BUG，透明工厂将接入好吃生成过程"
      />

      <section
        className={`bug-grid ${selectedBug ? "has-selection" : ""}`}
        ref={bugGridRef}
        onPointerDown={startBugDrag}
        onPointerMove={moveBugDrag}
        onPointerUp={endBugDrag}
        onPointerCancel={endBugDrag}
      >
        <div className="bug-track" ref={bugTrackRef}>
          {bugOptions.map((bug, index) => {
            const Icon = bug.icon;
            const selected = selectedBugId === bug.id;
            return (
              <button
                type="button"
                data-bug-id={bug.id}
                className={`bug-card ${selected ? "selected" : ""} ${index === activeBugIndex ? "is-current" : ""}`}
                onClick={(event) => {
                  if (suppressCardClickRef.current) {
                    event.preventDefault();
                    return;
                  }
                  moveToBugIndex(index, true);
                  event.currentTarget.blur();
                }}
                key={bug.id}
              >
                <Icon size={28} />
                <b>{bug.title}</b>
                <span>{bug.desc}</span>
                <i>{selected && <Check size={16} />}</i>
              </button>
            );
          })}
        </div>
      </section>

      {selectedBug && (
        <Panel className="bug-diagnosis">
          <span>异常状态已识别</span>
          <b>{selectedBug.orderLabel}</b>
          <p>正在接入豪士透明工厂。推荐方案：{selectedBug.recommendation}</p>
        </Panel>
      )}

      <Panel className="editable-input">
        <label htmlFor="bug-description">补充描述你的早餐场景（选填）</label>
        <textarea
          id="bug-description"
          value={description}
          maxLength={100}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="可以补充时间、地点、节奏，系统会生成早餐异常档案。"
        />
        <em>{description.length}/100</em>
      </Panel>

      <div className="bottom-actions">
        <GlowButton onClick={submitBug} disabled={!selectedBug}>
          {selectedBug ? "生成我的早餐异常档案" : "先选择一个早餐异常状态"}
        </GlowButton>
        <p className="tiny-tip">选定一个异常状态后，将接入豪士透明工厂后台</p>
      </div>
      <Notice text={notice} />
    </Screen>
  );
}

function WorkOrderPage({ go, order, notice, solution, unlockStage }: PageProps) {
  const [readProgress, setReadProgress] = useState(0);
  const readTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const readProgressValueRef = useRef({ value: 0 });
  const readCompletedRef = useRef(false);
  const orderReady = readProgress >= 100;
  const stampStatus = orderReady ? "已开启" : "接入中";

  useEffect(() => {
    readCompletedRef.current = false;
    readProgressValueRef.current.value = 0;
    setReadProgress(0);
    let lastProgress = -1;

    readTweenRef.current?.kill();
    readTweenRef.current = gsap.to(readProgressValueRef.current, {
      value: 100,
      duration: 4.2,
      ease: "none",
      onUpdate: () => {
        if (readCompletedRef.current) return;

        const nextProgress = Math.min(100, Math.round(readProgressValueRef.current.value));
        if (nextProgress === lastProgress) return;

        lastProgress = nextProgress;
        setReadProgress(nextProgress);
      },
      onComplete: () => {
        if (!readCompletedRef.current) {
          setReadProgress(100);
          readTweenRef.current = null;
        }
      }
    });

    return () => {
      readTweenRef.current?.kill();
      readTweenRef.current = null;
    };
  }, [order.id]);

  const completeOrderRead = () => {
    readCompletedRef.current = true;
    readTweenRef.current?.kill();
    readTweenRef.current = null;
    readProgressValueRef.current.value = 100;
    setReadProgress(100);
  };

  return (
    <Screen background={assets.bgFactory} className={`order-page ${orderReady ? "is-ready" : ""}`}>
      <TopBar onBack={() => go("select")} progress="03 / 08" />
      <PageTitle label="FACTORY BACKEND ACCESS" title="豪士透明工厂后台已接入" subtitle="早餐状态数据正在传输，四大透明控制舱准备启动。" />

      <section className="panel order-console" onClick={completeOrderRead}>
        <div className="conveyor">
          <img src={assets.mascotOperator} alt="豪小士控制台" />
          <div className="floating-ticket">
            <ClipboardList size={20} />
            <span>异常档案传输中</span>
          </div>
          <p>点击传送带或数据通道，让早餐异常档案进入工厂控制台。</p>
        </div>

        <div className="work-order">
          <header className="work-order-head">
            <div>
              <h2>早餐异常档案</h2>
              <p>系统已识别状态异常，准备进入豪士透明工厂后台</p>
            </div>
            <span className={`stamp ${orderReady ? "ready" : ""}`}>{stampStatus}</span>
          </header>
          <InfoRows
            rows={[
              ["档案编号", order.id],
              ["异常状态", order.bugType],
              ["场景描述", order.description],
              ["接入方案", `${solution.orderLabel} · 启动四大透明控制舱`],
              ["优先级", order.priority]
            ]}
          />
        </div>
      </section>

      <section className="factory-hologram-stage" aria-label="豪士透明工厂全息后台">
        <img src={assets.factoryHologram} alt="" />
      </section>
      <div className={`bottom-actions order-entry ${orderReady ? "ready" : ""}`}>
        <GlowButton
          icon={orderReady ? undefined : <Timer size={18} />}
          onClick={() => {
            if (!orderReady) {
              completeOrderRead();
              return;
            }
            unlockStage(2);
            go("ingredientScan");
          }}
        >
          {orderReady ? "进入原料源码舱" : "早餐状态数据接入中..."}
        </GlowButton>
        <FlowNav active={1} />
      </div>
      <Notice text={notice} />
    </Screen>
  );
}

function FactoryPage({
  go,
  order,
  notice,
  factoryReveal,
  setFactoryReveal,
  factoryAreaId,
  viewedFactoryAreaIds,
  selectFactoryArea,
  openFactoryAreaLive
}: PageProps) {
  const factoryAreas: Array<{
    id: FactoryAreaId;
    label: string;
    detail: string;
    progress: number;
    icon: LucideIcon;
  }> = [
    {
      id: "material",
      label: "原料源码舱",
      detail: "原料数据载入中，看见好吃第一步",
      progress: 25,
      icon: Leaf
    },
    {
      id: "proofing",
      label: "36 米压面数据隧道",
      detail: "36 米压面数据隧道启动，松软结构正在生成",
      progress: 43,
      icon: Thermometer
    },
    {
      id: "baking",
      label: "黄金焙香舱",
      detail: "火候锁定黄金区，香气开始上线",
      progress: 57,
      icon: Zap
    },
    {
      id: "packing",
      label: "透明追踪舱",
      detail: "扫描包装追踪码，读取好吃全过程",
      progress: 68,
      icon: PackageOpen
    }
  ];
  const currentArea = factoryAreas.find((area) => area.id === factoryAreaId) ?? factoryAreas[0];
  const CurrentAreaIcon = currentArea.icon;
  const currentAreaIndex = Math.max(0, factoryAreas.findIndex((area) => area.id === currentArea.id));
  const visibilityPercent = Math.max(factoryReveal, Math.round((viewedFactoryAreaIds.length / factoryAreas.length) * 100));
  const metrics = [
    ["设备运行率", "98.6%", Factory],
    ["环境温湿度", "22.3℃ / 56%", Thermometer],
    ["安心指数", "99.3%", ShieldCheck],
    ["数据载入", "128,560件", Sparkles]
  ] as const;

  return (
    <Screen background={assets.bgFactory} className="factory-page">
      <TopBar onBack={() => go("workOrder")} />
      <PageTitle label="CONTROL CAPSULE HUB" title="四大透明控制舱" subtitle="透明工厂后台已开启，好吃生成过程正在载入。" />

      <div className="five-flow">
        {["识别异常", "数据接入", "控制舱启动", "链路追踪", "报告生成"].map((item, index) => (
          <span className={index <= 3 ? "active" : ""} key={item}>
            {item}
          </span>
        ))}
      </div>

      <Panel className="live-main">
        <header>
          <b>豪士透明工厂 · 后台控制台</b>
          <span>● 数据接入中</span>
        </header>
        <div
          className={`factory-window interactive-window area-${currentArea.id} ${visibilityPercent >= 80 ? "revealed" : ""}`}
          onClick={() => openFactoryAreaLive(currentArea.id)}
          onPointerDown={() => setFactoryReveal((current) => Math.max(28, current))}
          onPointerMove={(event) => {
            if (event.buttons) {
              setFactoryReveal((current) => Math.min(100, current + 6));
            }
          }}
        >
          <CurrentAreaIcon size={42} />
          <strong>当前视角：{currentArea.label}</strong>
          <p>{currentArea.detail}</p>
          <div className="fog-layer" style={{ opacity: Math.max(0.08, 1 - visibilityPercent / 100) }} />
          <span className="reveal-meter">工厂可视化 {visibilityPercent}%</span>
        </div>
      </Panel>

      <section className="live-cards">
        {factoryAreas.map((area) => {
          const isActive = currentArea.id === area.id;
          const isViewed = viewedFactoryAreaIds.includes(area.id);

          return (
            <button
              type="button"
              className={`panel live-card ${isActive ? "active" : ""} ${isViewed ? "seen" : ""}`}
              onClick={() => selectFactoryArea(area.id)}
              key={area.id}
            >
              <b>{area.label}</b>
              <span>{isActive ? "LIVE 查看中" : isViewed ? "已点亮" : "待查看"}</span>
            </button>
          );
        })}
      </section>

      <Panel className="trace-panel">
        <h2>生产链路追踪进度</h2>
        <div className="trace-line">
          {["原料源码已点亮", "36 米压面已完成", "黄金焙香已上线", "包装追踪待扫描"].map((item, index) => (
            <span className={index <= currentAreaIndex ? "active" : ""} key={item}>
              {item}
            </span>
          ))}
        </div>
        <InfoRows
          rows={[
            ["生产批次", "BATCH-QM-0524"],
            ["早餐档案", order.id],
            ["当前控制舱", currentArea.label],
            ["完成进度", `${currentArea.progress}%`]
          ]}
        />
      </Panel>

      <section className="metric-grid">
        {metrics.map(([label, value, Icon]) => (
          <Panel className="metric-card" key={label}>
            <Icon size={20} />
            <span>{label}</span>
            <b>{value}</b>
          </Panel>
        ))}
      </section>

      <div className="bottom-actions">
        <GlowButton
          onClick={() => openFactoryAreaLive(currentArea.id)}
        >
          进入{currentArea.label}
        </GlowButton>
      </div>
      <Notice text={notice} />
    </Screen>
  );
}

function SoftRepairPage({
  go,
  notice,
  repairCharge,
  setRepairCharge,
  unlockStage,
  setNotice,
  selectFactoryArea
}: PageProps) {
  const holdTimer = useRef<number | null>(null);
  const [isAwakening, setIsAwakening] = useState(false);
  const [pressFailed, setPressFailed] = useState(false);
  const [showSoftCompleteModal, setShowSoftCompleteModal] = useState(false);
  const softComplete = repairCharge >= 100;
  const pressDistance = softComplete ? 36 : Math.min(35, Math.floor((repairCharge / 100) * 36));
  const tunnelNodes = [
    { meter: 0, label: "面团进入" },
    { meter: 12, label: "组织展开" },
    { meter: 24, label: "松软结构生成" },
    { meter: 36, label: "松软状态激活" }
  ] as const;
  const repairStatuses: Array<[string, string, string, LucideIcon]> = [
    ["压面距离", `${pressDistance}m / 36m`, softComplete ? "压面完成" : "按住推进", Factory],
    ["面团状态", softComplete ? "松软状态已激活" : "连续压延中", "36 米压面机运行中", Wheat],
    ["组织结构", softComplete ? "松软结构完成" : "逐步展开", "压延数据同步", SlidersHorizontal],
    ["松软值", softComplete ? "已满格" : "动态上升", `${repairCharge}%`, HeartPulse]
  ];
  const clearHold = () => {
    if (holdTimer.current !== null) {
      window.clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const advanceRepair = (step: number) => {
    setRepairCharge((current) => {
      const next = Math.min(100, current + step);
      if (next >= 100) {
        clearHold();
        setIsAwakening(false);
        setPressFailed(false);
        setShowSoftCompleteModal(true);
        setNotice("36 米压面完成，松软状态已激活。");
      }
      return next;
    });
  };
  const beginHold = () => {
    if (softComplete) {
      setShowSoftCompleteModal(true);
      return;
    }
    setPressFailed(false);
    setIsAwakening(true);
    setNotice("按住启动压面机，面团正在快速通过 36 米压面数据隧道。");
    if (holdTimer.current !== null) return;
    holdTimer.current = window.setInterval(() => {
      advanceRepair(5);
    }, 70);
  };
  const stopHold = () => {
    clearHold();
    setIsAwakening(false);
    setRepairCharge((current) => {
      if (current < 100) {
        setPressFailed(true);
        setNotice("压面中途停止，面团未通过 36 米隧道，请重新按住启动。");
        return 0;
      }
      return current;
    });
  };

  useEffect(() => clearHold, []);

  return (
    <Screen background={assets.bgToastLab} className={`repair-page ${isAwakening ? "is-awakening" : ""} ${pressFailed ? "press-failed" : ""} ${softComplete ? "soft-complete" : ""}`}>
      <TopBar onBack={() => go("ingredientScan")} progress="05 / 08" />
      <PageTitle label="PRESS DATA TUNNEL 02" title="36 米压面数据隧道" subtitle="36 米压面数据隧道启动，松软结构正在生成。" />
      <p className="soft-main-copy">面团进入 36 米长压面机，经过连续压延，松软口感逐步成型。</p>

      <Panel className="soft-proofing-panel">
        <section
          className="repair-capsule proofing-chamber noodle-tunnel"
          style={
            {
              "--soft-progress": `${repairCharge}%`,
              "--dough-left": `${6 + repairCharge * 0.68}%`
            } as CSSProperties
          }
        >
          <div className="press-tunnel">
            <div className="tunnel-meter-labels" aria-hidden="true">
              {tunnelNodes.map((node) => (
                <span className={pressDistance >= node.meter ? "active" : ""} key={node.meter}>
                  {node.meter}m
                </span>
              ))}
            </div>
            <div className="tunnel-lane">
              <div className="roller-stack" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, index) => (
                  <i key={index} />
                ))}
              </div>
              <div className={`tunnel-dough ${softComplete ? "ready" : ""}`} />
            </div>
            <div className="tunnel-progress-line" aria-hidden="true">
              <i />
            </div>
            <div className="proofing-steam">
              <span>PRESS</span>
              <span>36M</span>
              <span>SOFT</span>
            </div>
            <div className="data-particles" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, index) => (
                <i key={index} />
              ))}
            </div>
          </div>
          <button
            className="hold-repair-button"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              beginHold();
            }}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
          >
            启动压面机
            <small>{softComplete ? "松软状态已激活" : pressFailed ? "中途停止失败" : "按住压面"}</small>
          </button>
        </section>
      </Panel>

      <section className="status-grid">
        {repairStatuses.map(([cn, value, desc, Icon], index) => (
          <Panel className={`repair-status ${index === 0 || isAwakening || softComplete ? "active" : ""}`} key={String(cn)}>
            <Icon size={20} />
            <b>{cn}</b>
            <span>{value}</span>
            <em>{desc}</em>
          </Panel>
        ))}
      </section>

      <Panel className="repair-flow">
        <h2>36 米压面进度 <span>DATA TUNNEL 0-36M</span></h2>
        <div>
          {tunnelNodes.map((node) => (
            <article className={pressDistance >= node.meter ? "active" : ""} key={node.meter}>
              <i>{node.meter}m</i>
              <b>{node.label}</b>
            </article>
          ))}
        </div>
      </Panel>

      {showSoftCompleteModal && softComplete && (
        <CompletionModal
          ariaLabel="36 米压面完成"
          title="36 米压面完成"
          body="松软状态已激活。"
          primaryLabel="进入黄金焙香舱"
          secondaryLabel="再来一次"
          onPrimary={() => {
            unlockStage(4);
            selectFactoryArea("baking");
            go("bakingLive");
          }}
          onSecondary={() => {
            setShowSoftCompleteModal(false);
            setRepairCharge(0);
            setPressFailed(false);
            setNotice("重新按住启动压面机，面团将从 0 米开始进入隧道。");
          }}
        />
      )}

      <div className="bottom-actions">
        <GlowButton
          onClick={() => {
            if (repairCharge < 100) {
              setNotice("先按住启动压面机，让面团通过 36 米压面数据隧道。");
              return;
            }
            unlockStage(4);
            selectFactoryArea("baking");
            go("bakingLive");
          }}
        >
          进入黄金焙香舱
        </GlowButton>
      </div>
      <Notice text={notice} />
    </Screen>
  );
}

function IngredientScanPage({
  go,
  notice,
  ingredientIds,
  setIngredientIds,
  unlockStage,
  setNotice,
  selectFactoryArea
}: PageProps) {
  const ingredients = [
    {
      id: "red-quinoa",
      name: "玻利维亚进口红藜麦",
      purity: "98.7%",
      status: "营养赋能中......",
      desc: "红藜麦数据接入，谷物能量正在点亮。",
      feedback: "红藜麦数据读取成功。",
      icon: Leaf,
      image: assets.ingredientCardQuinoa,
      slot: "top-left"
    },
    {
      id: "gluten",
      name: "定制专用一级谷朊粉",
      purity: "96.2%",
      status: "筋性支撑中......",
      desc: "天然小麦蛋白读取，面团组织获得稳定支撑。",
      feedback: "谷朊粉数据读取成功。",
      icon: ShieldCheck,
      image: assets.ingredientCardGluten,
      slot: "top-right"
    },
    {
      id: "canada-wheat",
      name: "加拿大进口小麦",
      purity: "97.4%",
      status: "面团基础激活中......",
      desc: "高蛋白小麦数据接入，松软口感开始建模。",
      feedback: "小麦数据读取成功。",
      icon: Wheat,
      image: assets.ingredientCardWheat,
      slot: "bottom-left"
    },
    {
      id: "fresh-yeast",
      name: "鲜酵母",
      purity: "99.1%",
      status: "发酵动力唤醒中......",
      desc: "法国乐斯福菌种接入，发酵力正在上线。",
      feedback: "鲜酵母数据读取成功。",
      icon: Sparkles,
      image: assets.ingredientCardYeast,
      slot: "bottom-right"
    }
  ];
  const correctTotal = ingredients.length;
  const acceptedIngredientIds = ingredientIds.filter((id) => ingredients.some((item) => item.id === id));
  const ingredientProgress = Math.round((acceptedIngredientIds.length / correctTotal) * 100);
  const sourceComplete = acceptedIngredientIds.length >= correctTotal;
  const [showSourceCompleteModal, setShowSourceCompleteModal] = useState(false);
  const [armedIngredientId, setArmedIngredientId] = useState<string | null>(null);
  const [coreArmed, setCoreArmed] = useState(false);
  const [ingestEffect, setIngestEffect] = useState<{ id: string; tick: number } | null>(null);
  useEffect(() => {
    if (!ingestEffect) return undefined;

    const timer = window.setTimeout(() => {
      setIngestEffect(null);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [ingestEffect]);

  const acceptIngredient = (id: string) => {
    const ingredient = ingredients.find((item) => item.id === id);
    if (!ingredient) return;
    if (ingredientIds.includes(id)) {
      setNotice("这张原料数据卡已经录入透明搅拌核心。");
      return;
    }
    setIngestEffect({ id, tick: Date.now() });
    setIngredientIds((current) => [...current, id]);
    if (acceptedIngredientIds.length + 1 >= correctTotal) {
      setShowSourceCompleteModal(true);
      setNotice("原料源码读取完成。好吃第一步，已看见。");
      return;
    }
    setNotice(`${ingredient.feedback} SOURCE DATA ACCEPTED / 原料数据已录入。`);
  };
  const ingestParticles = [
    ["-96px", "-112px"],
    ["88px", "-104px"],
    ["-116px", "-32px"],
    ["110px", "-26px"],
    ["-82px", "76px"],
    ["92px", "82px"],
    ["-26px", "-138px"],
    ["32px", "122px"]
  ];
  const renderIngredientCard = (item: (typeof ingredients)[number]) => {
    const accepted = ingredientIds.includes(item.id);

    return (
      <article
        className={`source-data-card source-image-card source-pos-${item.slot} ${accepted ? "accepted" : ""} ${armedIngredientId === item.id ? "is-dragging" : ""}`}
        data-ingredient={item.id}
        draggable={!accepted}
        key={item.id}
        onClick={(event) => {
          event.preventDefault();
          acceptIngredient(item.id);
        }}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.id);
          setArmedIngredientId(item.id);
        }}
        onDragEnd={() => {
          setArmedIngredientId(null);
          setCoreArmed(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            acceptIngredient(item.id);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <img src={item.image} alt={item.name} draggable={false} />
        <span className="source-card-state">{accepted ? "已录入" : "点击录入"}</span>
      </article>
    );
  };

  return (
    <Screen background={assets.bgTerminal} className="scan-page ingredient-capsule-page">
      <TopBar onBack={() => go("workOrder")} progress="04 / 08" />
      <PageTitle label="HORSHI BREAKFAST OS v2.2.4" title="原料数据舱" subtitle="原料数据载入中，好吃第一步正在点亮。" />

      <Panel className="scanner-panel ingredient-capsule-panel">
        <div
          className={`scan-stage source-lab-stage ${sourceComplete ? "source-complete" : ""} ${armedIngredientId ? "is-throwing" : ""} ${coreArmed ? "core-armed" : ""} ${ingestEffect ? "is-ingesting" : ""}`}
        >
          <div
            className="source-core"
            aria-label="透明搅拌核心，拖入原料数据卡读取"
            onDragEnter={(event) => {
              event.preventDefault();
              setCoreArmed(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setCoreArmed(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setCoreArmed(false);
              acceptIngredient(event.dataTransfer.getData("text/plain"));
            }}
          >
            {ingestEffect && (
              <div
                className="source-ingest-effect"
                data-ingredient={ingestEffect.id}
                key={ingestEffect.tick}
                aria-hidden="true"
              >
                <i className="source-ingest-flash" />
                <i className="source-ingest-ring" />
                <i className="source-ingest-ring source-ingest-ring-late" />
                {ingestParticles.map(([tx, ty], index) => (
                  <span
                    key={`${tx}-${ty}`}
                    style={
                      {
                        "--tx": tx,
                        "--ty": ty,
                        "--delay": `${index * 42}ms`
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            )}
            <div className="mixing-core">
              <img src={assets.ingredientMixer} alt="" draggable={false} />
            </div>
            <div className="core-readout">
              {sourceComplete ? (
                <>
                  <b>SOURCE CHECK COMPLETE</b>
                  <span>原料安心指数：100%</span>
                  <small>{notice || "原料源码读取完成。好吃第一步，已看见。"}</small>
                </>
              ) : (
                <>
                  <b>SOURCE DATA ACCEPTED</b>
                  <span>原料数据已录入：{acceptedIngredientIds.length}/{correctTotal}</span>
                  <small>{notice || "拖入原料卡至透明搅拌核心。"}</small>
                </>
              )}
            </div>
          </div>
          <div className="source-card-tray">
            {ingredients.map(renderIngredientCard)}
          </div>
        </div>
      </Panel>

      {showSourceCompleteModal && sourceComplete && (
        <CompletionModal
          ariaLabel="原料源码读取完成"
          title="原料源码读取完成"
          body="好吃第一步，已看见。"
          primaryLabel="进入 36 米压面数据隧道"
          secondaryLabel="再来一次"
          onPrimary={() => {
            unlockStage(3);
            selectFactoryArea("proofing");
            go("softRepair");
          }}
          onSecondary={() => {
            setShowSourceCompleteModal(false);
            setIngredientIds([]);
            setNotice(`重新读取原料数据，请拖入 ${correctTotal} 张原料数据卡。`);
          }}
        />
      )}

      <div className="bottom-actions source-entry">
        <GlowButton
          onClick={() => {
            if (!sourceComplete) {
              setNotice(`请拖入 ${correctTotal} 张原料数据卡，当前已录入 ${acceptedIngredientIds.length}/${correctTotal}。`);
              return;
            }
            unlockStage(3);
            selectFactoryArea("proofing");
            go("softRepair");
          }}
        >
          {sourceComplete ? "进入 36 米压面数据隧道" : `拖入原料数据 ${acceptedIngredientIds.length}/${correctTotal}`}
        </GlowButton>
      </div>

    </Screen>
  );
}

type FactoryAreaLiveConfig = {
  label: string;
  areaId: "baking" | "packing";
  stepProgress: string;
  labelEn: string;
  title: string;
  subtitle: string;
  className: string;
  icon: LucideIcon;
  progress: number;
  status: string;
  headline: string;
  description: string;
  tasks: Array<[string, string, string, LucideIcon]>;
  summaryRows: Array<[string, string]>;
  monitors: string[];
};

function FactoryAreaLivePage({
  go,
  notice,
  config,
  nextButtonText,
  onContinue
}: PageProps & { config: FactoryAreaLiveConfig; nextButtonText: string; onContinue: () => void }) {
  const AreaIcon = config.icon;

  return (
    <Screen background={assets.bgFactory} className={`production-live-page ${config.className}`}>
      <TopBar onBack={() => go("factory")} progress={config.stepProgress} />
      <PageTitle label={config.labelEn} title={config.title} subtitle={config.subtitle} />
      <FlowNav active={2} />

      <Panel className="scanner-panel production-live-panel">
        <header>
          <b>{config.headline}</b>
          <span>LIVE... {config.progress}%</span>
        </header>
        <div className={`factory-window area-${config.areaId} revealed`}>
          <AreaIcon size={46} />
          <strong>{config.label}实时直播</strong>
          <p>{config.description}</p>
          <span className="reveal-meter">{config.status}</span>
        </div>
      </Panel>

      <section className="check-list">
        {config.tasks.map(([title, desc, status, Icon], index) => (
          <Panel className={`check-row ${index <= 2 ? "active" : ""}`} key={title}>
            <Icon size={20} />
            <div>
              <b>{title}</b>
              <span>{desc}</span>
            </div>
            <em>{status}</em>
          </Panel>
        ))}
      </section>

      <Panel className="trace-panel production-info">
        <h2>{config.label}过程数据</h2>
        <InfoRows rows={config.summaryRows} />
      </Panel>

      <Panel className="monitor-panel">
        <h2>透明工厂 · 生产实时监控</h2>
        <div>
          {config.monitors.map((item) => (
            <span key={item}>LIVE · {item}</span>
          ))}
        </div>
      </Panel>

      <div className="bottom-actions">
        <GlowButton onClick={onContinue}>{nextButtonText}</GlowButton>
      </div>
      <Notice text={notice} />
    </Screen>
  );
}

function BakingLivePage(props: PageProps) {
  const [heatValue, setHeatValue] = useState(0);
  const [heatStopped, setHeatStopped] = useState(false);
  const [showHeatCompleteModal, setShowHeatCompleteModal] = useState(false);
  const [showHeatFailModal, setShowHeatFailModal] = useState(false);
  const heatTemperature = Math.round(120 + heatValue * 0.8);
  const bakeProgress = Math.min(1, Math.max(0, (heatTemperature - 120) / 80));
  const doughOpacity = Math.max(0, Math.min(1, 1 - (heatTemperature - 136) / 16));
  const rawOpacity = Math.max(0, Math.min(1, (heatTemperature - 132) / 14)) *
    Math.max(0, Math.min(1, 1 - (heatTemperature - 160) / 16));
  const goldenOpacity =
    heatTemperature <= 150 || heatTemperature >= 190
      ? 0
      : heatTemperature <= 168
        ? Math.min(1, (heatTemperature - 150) / 18)
        : Math.max(0, 1 - (heatTemperature - 176) / 14);
  const overdoneOpacity = Math.max(0, Math.min(1, (heatTemperature - 178) / 22));
  const autoFailTemperature = 190;
  const heatFeedback =
    heatTemperature < 138
      ? "面包胚升温"
      : heatTemperature < 165
        ? "还没香起来"
        : heatTemperature <= 175
          ? "香气上线"
          : "糟糕，烤过啦";
  const heatStatus =
    heatTemperature < 138
      ? "面包胚状态"
      : heatTemperature < 165
        ? "火候偏低"
        : heatTemperature <= 175
          ? "黄金区"
          : "火候过载";
  const isGolden = heatTemperature >= 165 && heatTemperature <= 175;
  const bakeStage =
    heatTemperature < 138 ? "dough" : heatTemperature < 160 ? "raw" : heatTemperature <= 175 ? "golden" : "over";
  const bakeStageText =
    heatTemperature < 138
      ? "面包胚升温中"
      : heatTemperature < 160
        ? "吐司仍偏生"
        : heatTemperature <= 175
          ? "黄金焙香中"
          : "表面开始过烤";
  const heatFailNotice =
    heatTemperature < 165
      ? "锁定太早，滑块还没进入黄金区。"
      : heatTemperature >= autoFailTemperature
        ? "火候已经进入过烤区，锁定失败。"
        : "锁定偏晚，滑块已经越过黄金区。";
  const heatFailBody =
    heatTemperature < 165
      ? `当前停在 ${heatTemperature}°C，吐司还没进入黄金焙香区。等滑块进入 165°C~175°C 再按下锁定。`
      : heatTemperature >= autoFailTemperature
        ? `当前已经到 ${heatTemperature}°C，火候进入过烤区。重新开始后，在 165°C~175°C 的黄金区按下锁定。`
        : `当前停在 ${heatTemperature}°C，已经越过 165°C~175°C 黄金区。重新开始后，滑块到黄色目标区时立刻按下锁定。`;
  const heatActionLabel = heatStopped ? (isGolden ? "进入透明追踪舱" : "重新锁定火候") : "按下锁定火候";
  const heatStyle = {
    "--heat-value": `${heatValue}%`,
    "--heat-thumb-x": `${6 + heatValue * 0.82}%`,
    "--bake-progress": bakeProgress,
    "--toast-dough-opacity": doughOpacity,
    "--toast-raw-opacity": rawOpacity,
    "--toast-golden-opacity": goldenOpacity,
    "--toast-overdone-opacity": overdoneOpacity
  } as CSSProperties;

  useEffect(() => {
    if (heatStopped || showHeatCompleteModal || showHeatFailModal) return;

    const timer = window.setInterval(() => {
      setHeatValue((current) => Math.min(100, current + 1));
    }, 68);

    return () => window.clearInterval(timer);
  }, [heatStopped, showHeatCompleteModal, showHeatFailModal]);

  useEffect(() => {
    if (heatStopped || showHeatCompleteModal || showHeatFailModal || heatTemperature < autoFailTemperature) return;

    setHeatStopped(true);
    setShowHeatFailModal(true);
    props.setNotice(heatFailNotice);
  }, [
    autoFailTemperature,
    heatFailNotice,
    heatStopped,
    heatTemperature,
    props,
    showHeatCompleteModal,
    showHeatFailModal
  ]);

  const resetHeat = () => {
    setShowHeatCompleteModal(false);
    setShowHeatFailModal(false);
    setHeatValue(0);
    setHeatStopped(false);
    props.setNotice("火候滑块已从左侧重新开始，按下停在黄金区。");
  };

  const stopHeat = () => {
    if (heatStopped || showHeatCompleteModal || showHeatFailModal) return;

    setHeatStopped(true);
    if (isGolden) {
      setShowHeatCompleteModal(true);
      props.setNotice("火候停在黄金区，香气上线。");
      return;
    }
    setShowHeatFailModal(true);
    props.setNotice(heatFailNotice);
  };

  return (
    <Screen
      background={assets.bgFactory}
      className={`production-live-page baking-live-stage heat-${bakeStage} ${
        heatStopped ? "heat-stopped" : "heat-auto-running"
      }`}
    >
      <TopBar onBack={() => props.go("softRepair")} progress="06 / 08" />
      <PageTitle label="AROMA CAPSULE 03" title="黄金焙香舱" subtitle="全程控温参数启动，黄金焙香正在进行中。" />

      <Panel className="scanner-panel production-live-panel heat-control-panel">
        <header>
          <b>面包烤色随温度实时变化</b>
          <span>{heatStopped ? `${heatStatus} · ${heatFeedback}` : `控温运行中 · ${heatTemperature}°C`}</span>
        </header>
        <div className="factory-window area-baking revealed baking-oven-window" style={heatStyle}>
          <div className="oven-glass" aria-label={`当前温度 ${heatTemperature} 摄氏度，${bakeStageText}`}>
            <img src={assets.bakingOven} alt="透明烤箱里的豪士吐司" className="oven-cavity-photo" />
            <div className="toast-photo-stack" aria-hidden="true">
              <img src={assets.toastDough} alt="" className="toast-photo toast-dough" />
              <img src={assets.toastRaw} alt="" className="toast-photo toast-raw" />
              <img src={assets.toastRaw} alt="" className="toast-photo toast-golden" />
              <img src={assets.toastOverdone} alt="" className="toast-photo toast-overdone" />
            </div>
            <div className="oven-target-badge">
              <span>目标火候</span>
              <strong>黄金区</strong>
              <em>165°C~175°C</em>
            </div>
            <div className="oven-live-readout">
              <span>当前烤色</span>
              <b>{bakeStageText}</b>
            </div>
          </div>
          <div className="oven-brand">HORSHI</div>
        </div>
        <div
          className="heat-console"
          style={heatStyle}
        >
          <div className="heat-console-title">
            <ShieldCheck size={17} />
            <b>{isGolden ? "黄金火候可锁定" : heatStatus}</b>
            <span>{heatStopped ? `${heatTemperature}°C · ${heatFeedback}` : "滑块从左向右扫描中"}</span>
          </div>
          <div className="heat-temp-readout">
            <span>当前温度</span>
            <strong>{heatTemperature}°C</strong>
          </div>
          <div className="heat-track-stage" aria-hidden="true">
            <img src={assets.heatTrack} alt="" className="heat-track-image" />
            <img src={assets.heatThumb} alt="" className="heat-thumb-image" />
          </div>
          <div className="heat-fire-labels">
            <span>
              <Thermometer size={14} />
              小火
            </span>
            <span>
              <Sparkles size={14} />
              大火
            </span>
          </div>
          <p className="heat-console-feedback">
            {bakeStageText} / {heatStatus} / {heatFeedback}
          </p>
        </div>
      </Panel>

      {showHeatCompleteModal && heatStopped && isGolden && (
        <CompletionModal
          ariaLabel="黄金焙香完成"
          title="黄金焙香舱完成"
          body="火候停在黄金区，香气已上线。"
          primaryLabel="进入透明追踪舱"
          secondaryLabel="再来一次"
          onPrimary={() => {
            props.setNotice("香气指数已上线。");
            props.unlockStage(4);
            props.selectFactoryArea("packing");
            props.go("packingLive");
          }}
          onSecondary={resetHeat}
        />
      )}

      {showHeatFailModal && heatStopped && !isGolden && (
        <CompletionModal
          ariaLabel="火候锁定失败"
          title="火候锁定失败"
          body={heatFailBody}
          primaryLabel="再来一次"
          secondaryLabel="先看看结果"
          onPrimary={resetHeat}
          onSecondary={() => {
            setShowHeatFailModal(false);
          }}
        />
      )}

      <div className="bottom-actions">
        <GlowButton
          icon={!heatStopped ? <Timer size={18} /> : undefined}
          onClick={() => {
            if (!heatStopped) {
              stopHeat();
              return;
            }

            if (!isGolden) {
              resetHeat();
              return;
            }
            setShowHeatCompleteModal(true);
          }}
        >
          {heatActionLabel}
        </GlowButton>
      </div>
      <Notice text={props.notice} />
    </Screen>
  );
}

function PackingLivePage(props: PageProps) {
  const traceStageRef = useRef<HTMLDivElement>(null);
  const [traceProgress, setTraceProgress] = useState(12);
  const [scannerPosition, setScannerPosition] = useState({ x: 28, y: 62 });
  const [showTraceCompleteModal, setShowTraceCompleteModal] = useState(false);
  const traceComplete = traceProgress >= 100;
  const traceOutputs: Array<[string, string, LucideIcon]> = [
    ["生产视频", "查看透明工厂生产过程片段", Factory],
    ["检测证书", "读取品质检测与安心证明", ShieldCheck],
    ["产品溯源", "回看原料到出炉的完整路径", ScanLine]
  ];

  const moveScanner = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = traceStageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.min(88, Math.max(12, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(84, Math.max(16, ((event.clientY - rect.top) / rect.height) * 100));
    const distanceToCode = Math.hypot(x - 39, y - 53);
    const nextProgress = Math.max(18, Math.min(100, Math.round(112 - distanceToCode * 5.2)));

    setScannerPosition({ x, y });
    setTraceProgress((current) => Math.max(current, nextProgress));

    if (nextProgress >= 100) {
      setShowTraceCompleteModal(true);
      props.setNotice("透明链路已完成。好吃不是黑箱，过程全程可见。");
    }
  };

  return (
    <Screen background={assets.bgFactory} className="production-live-page packing-live-stage">
      <TopBar onBack={() => props.go("bakingLive")} progress="07 / 08" />
      <PageTitle label="TRACE CAPSULE 04" title="TRACE-04 透明追踪舱" subtitle="扫描包装追踪码，读取好吃全过程。" />
      <FlowNav active={2} />

      <Panel className="scanner-panel production-live-panel trace-code-panel">
        <header>
          <b>拖动圆形数据扫描器，对准包装追踪码</b>
          <span>TRACE... {traceProgress}%</span>
        </header>
        <div
          ref={traceStageRef}
          className={`trace-code-stage ${traceComplete ? "trace-complete" : ""}`}
          style={
            {
              "--scanner-x": `${scannerPosition.x}%`,
              "--scanner-y": `${scannerPosition.y}%`
            } as CSSProperties
          }
          onPointerDown={moveScanner}
          onPointerMove={(event) => {
            if (event.buttons) {
              moveScanner(event);
            }
          }}
        >
          <img src={assets.productFront} alt="豪士面包包装" className="trace-product" />
          <div className="trace-code-marker">
            <span>HAOSHI</span>
            <b>TRACE CODE</b>
          </div>
          <div className="data-scanner">
            <ScanLine size={22} />
            <span>SCAN</span>
          </div>
          <div className="trace-hud-chain" aria-hidden={!traceComplete}>
            {traceOutputs.map(([item]) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <p className="trace-main-copy">
          豪士透明工厂数据已写入包装追踪码，扫描即可查看生产视频、检测证书与产品溯源。
        </p>
      </Panel>

      <Panel className="trace-results-panel">
        <h2>扫描结果</h2>
        <div>
          {traceOutputs.map(([title, desc, Icon]) => (
            <article className={traceComplete ? "active" : ""} key={title}>
              <Icon size={20} />
              <b>{title}</b>
              <span>{desc}</span>
              <em>{traceComplete ? "已解锁" : "待扫描"}</em>
            </article>
          ))}
        </div>
      </Panel>

      {showTraceCompleteModal && traceComplete && (
        <CompletionModal
          ariaLabel="透明链路已完成"
          title="透明链路已完成。"
          body="好吃不是黑箱，过程全程可见。"
          primaryLabel="生成早餐系统重启报告"
          secondaryLabel="再来一次"
          onPrimary={() => {
            props.unlockStage(5);
            props.go("report");
          }}
          onSecondary={() => {
            setShowTraceCompleteModal(false);
            setTraceProgress(12);
            setScannerPosition({ x: 28, y: 62 });
            props.setNotice("重新扫描包装追踪码，读取生产视频、检测证书与产品溯源。");
          }}
        />
      )}

      <div className="bottom-actions">
        <GlowButton
          onClick={() => {
            if (!traceComplete) {
              props.setNotice("请拖动圆形数据扫描器，对准 HAOSHI TRACE CODE。");
              setTraceProgress((current) => Math.min(92, current + 22));
              return;
            }
            setShowTraceCompleteModal(true);
          }}
        >
          生成早餐系统重启报告
        </GlowButton>
      </div>
      <Notice text={props.notice} />
    </Screen>
  );
}

function CompletePage({ go, order, notice, solution, liked, setLiked, setNotice, unlockStage }: PageProps) {
  const patches = [
    ["原料源码舱", Wheat],
    ["36 米压面数据隧道", Sparkles],
    ["黄金焙香舱", PackageOpen],
    ["透明追踪舱", ShieldCheck]
  ] as const;

  return (
    <Screen background={assets.bgShield} className="complete-page">
      <TopBar onBack={() => go("packingLive")} />
      <PageTitle label="REBOOT READY" title="早餐状态重启完成" subtitle="四大透明控制舱已完成，好吃过程已看见。" />

      <section className="complete-visual">
        <img src={assets.badgeRepair} alt="状态重启徽章" className="success-badge" />
        <img src={assets.mascotGuardian} alt="豪小士守护" className="guardian" />
      </section>

      <Panel className="patch-panel">
        <h2>已完成控制舱</h2>
        <div>
          {patches.map(([name, Icon]) => (
            <article key={name}>
              <Icon size={22} />
              <b>{name}</b>
              <CheckCircle2 size={18} />
            </article>
          ))}
        </div>
      </Panel>

      <Panel className="result-panel">
        <h2>状态重启总览</h2>
        <InfoRows
          rows={[
            ["识别异常数量", "1个"],
            ["控制舱完成数量", "4个"],
            ["报告生成时间", order.createdAt],
            ["系统状态", "状态重启，运行稳定"]
          ]}
        />
      </Panel>

      <Panel className="solution-panel">
        <h2>今日早餐方案匹配完成</h2>
        <InfoRows
          rows={[
            ["早餐身份", solution.identity],
            ["推荐搭配", solution.recommendation],
            ["状态关键词", solution.keywords.join(" / ")],
            ["场景文案", solution.scenarioCopy]
          ]}
        />
      </Panel>

      <div className="bottom-actions two">
        <GlowButton
          onClick={() => {
            unlockStage(6);
            go("report");
          }}
        >
          生成早餐系统重启报告
        </GlowButton>
        <GlowButton
          variant="secondary"
          onClick={() => {
            setLiked(true);
            setNotice("已为早餐打call，豪小士收到你的能量。");
          }}
          icon={<Heart size={18} />}
        >
          {liked ? "已打call" : "为早餐打call"}
        </GlowButton>
      </div>
      <Notice text={notice} />
    </Screen>
  );
}

function ReportPage({ go, order, notice, solution, saveReport, shareReport, reportRef, setNotice }: PageProps) {
  return (
    <Screen background={assets.bgTerminal} className="report-page">
      <TopBar onBack={() => go("packingLive")} progress="08 / 08" />
      <PageTitle label="REBOOT REPORT" title="我的早餐系统重启报告" subtitle="四大透明控制舱已完成，早餐状态报告生成中。" />

      <section className="report-card" ref={reportRef}>
        <header>
          <span>REPORT NO. BRK-202605-08-001</span>
          <b>LOADED 豪士透明工厂</b>
        </header>
        <img src={assets.logoPrimary} alt="HORSH 豪士" className="report-watermark" />
        <InfoRows
          rows={[
            ["早餐异常状态", order.bugType],
            ["异常角色", solution.abnormalRole],
            ["推荐方案", solution.recommendation],
            ["已完成控制舱", "原料源码舱 / 36 米压面数据隧道 / 黄金焙香舱 / 透明追踪舱"],
            ["当前身份", solution.identity],
            ["状态关键词", "安心 / 松软 / 香气 / 看得见"],
            ["系统结论", "早餐不将就，好吃看得见。"],
            ["品牌口号", "豪士豪士，好吃好吃。"]
          ]}
        />
        <section className="breakfast-reco">
          <div>
            <h2>推荐早餐方案</h2>
            <b>{solution.recommendation}</b>
            <p>当早餐状态出现 BUG，豪士透明工厂即刻接入，看见好吃从原料到出炉的生成过程。</p>
          </div>
          <img src={assets.productBox} alt="豪士藜麦吐司盒装" />
        </section>
        <div className="report-meters">
          <span><b>100%</b>状态重启</span>
          <span><b>4/4</b>控制舱完成</span>
          <span><b>100%</b>透明链路追踪</span>
        </div>
      </section>

      <div className="report-actions">
        <button onClick={saveReport}><Download size={18} />保存重启报告</button>
        <button onClick={shareReport}><Share2 size={18} />分享给早餐搭子</button>
        <button onClick={() => setNotice("已解锁豪士吐司同款早餐方案。")}><LockKeyhole size={18} />解锁同款早餐</button>
      </div>
      <GlowButton variant="secondary" onClick={() => go("home")}>
        再来一次
      </GlowButton>
      <Notice text={notice} />
    </Screen>
  );
}

function InfoRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="info-rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Progress({ label, value, compact = false }: { label?: string; value: number; compact?: boolean }) {
  return (
    <div className={`progress ${compact ? "compact" : ""}`}>
      {label && (
        <div>
          <span>{label}</span>
          <b>{value}%</b>
        </div>
      )}
      <i>
        <em style={{ width: `${value}%` }} />
      </i>
    </div>
  );
}

export default App;



