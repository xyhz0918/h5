import {
  Check,
  CheckCircle2,
  ClipboardList,
  Download,
  Droplet,
  Factory,
  HeartPulse,
  Leaf,
  ScanLine,
  Share2,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Thermometer,
  Timer,
  Wheat,
  type LucideIcon
} from "lucide-react";
import gsap from "gsap";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { CompletionModal, FlowNav, GlowButton, InfoRows, OperationFlow, PageTitle, Panel, Progress, Screen, TopBar } from "./components/ui";
import type { PackageModelViewerHandle } from "./components/PackageModelViewer";
import { assets } from "./lib/assets";
import { bugOptions } from "./lib/content";
import type { FactoryAreaId, PageProps } from "./types";

const descriptionPrompts = [
  "7:40 地铁口排队，想快点拿一份不噎的早餐。",
  "刚到办公室，只想有一口松软、安心、能马上吃的吐司。",
  "早课前十分钟，早餐来不及准备，希望拆开就能吃。",
  "运动后有点饿，想要轻负担但能顶一上午的选择。",
  "周末想慢慢吃早餐，希望口感更柔软、配料更清楚。",
  "路上包和手机都带了，早餐却还没找到合适入口。"
];

const loadPackageModelViewer = () => import("./components/PackageModelViewer");

const PackageModelViewer = lazy(() =>
  loadPackageModelViewer().then((module) => ({ default: module.PackageModelViewer }))
);

const packageModelPreloadPromises = new Map<string, Promise<unknown>>();

function scheduleIdleTask(task: () => void) {
  if (typeof window === "undefined") return;

  const win = window as Window & typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(task, { timeout: 1200 });
    return;
  }

  window.setTimeout(task, 350);
}

function preloadPackageModelAssets(modelSrc: string) {
  if (typeof window === "undefined" || !modelSrc) return;

  scheduleIdleTask(() => {
    if (packageModelPreloadPromises.has(modelSrc)) return;

    const preloadPromise = loadPackageModelViewer().then((module) => module.preloadPackageModel(modelSrc)).catch(() => {
      packageModelPreloadPromises.delete(modelSrc);
    });
    packageModelPreloadPromises.set(modelSrc, preloadPromise);
  });
}

function compactNotice(message: string, maxLength = 34) {
  const trimmed = message.trim();
  if (!trimmed) return "";
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}

function randomDescriptionPromptIndex(current = -1) {
  if (descriptionPrompts.length <= 1) return 0;

  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * descriptionPrompts.length);
  }
  return next;
}

function useDocumentVisible() {
  const [visible, setVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return visible;
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

export function HomePage({ go, transitionPhase, homeArrivalActive, homeRepairActive }: PageProps) {
  return (
    <Screen
      background={assets.bgPortal}
      className={`home-page transition-${transitionPhase} ${homeArrivalActive ? "home-arrival" : ""} ${homeRepairActive ? "home-repair-active" : ""}`}
      entranceMotion={false}
      motionLayer
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
        label="BREAKFAST BUG CHECK"
        title={
          <>
            检测到一个
            <br />
            早餐小 BUG
          </>
        }
        titleClassName="glitch-title is-glitching"
        titleDataText="检测到一个早餐小 BUG"
        subtitle="豪士藜麦吐司，好吃看得见。选一个早餐 BUG，进工厂完成透明验证。"
      />

      <section className="warning-carousel" aria-label="早餐问题预警">
        <header>
          <span>BREAKFAST WARNING</span>
          <b>BREAKFAST BUG</b>
        </header>
        <div className="warning-lines">
          <strong>通勤路上不知道吃什么？</strong>
          <strong>早八来不及吃早餐？</strong>
          <strong>想吃得安心，却看不见生产过程？</strong>
        </div>
      </section>

      <p className="story-copy">3 步完成：识别困扰 / 工厂验证 / 生成报告。</p>

      <div className="bottom-actions">
        <GlowButton onClick={() => go("select")}>开始透明验证</GlowButton>
        <FlowNav active={0} />
      </div>
    </Screen>
  );
}

export function SelectPage({
  go,
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
  const descriptionPromptRefreshRef = useRef(Number.NEGATIVE_INFINITY);
  const [descriptionPromptIndex, setDescriptionPromptIndex] = useState(() => randomDescriptionPromptIndex());
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

  const refreshDescriptionPrompt = useCallback(() => {
    if (description.trim()) return;

    const now = window.performance.now();
    if (now - descriptionPromptRefreshRef.current < 120) return;

    descriptionPromptRefreshRef.current = now;
    setDescriptionPromptIndex((current) => randomDescriptionPromptIndex(current));
  }, [description]);

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
      <TopBar onBack={() => go("home")} progress="02 / 09" />
      <img
        src={assets.mascotField}
        alt="豪小士"
        className="corner-mascot"
      />
      <PageTitle
        label="早餐小 BUG 选择器"
        title="请选择你的早餐困扰"
        subtitle="滑动或点击选定一个早餐 BUG，豪士藜麦吐司，好吃看得见。"
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
          <span>早餐小 BUG 已选定</span>
          <b>{selectedBug.orderLabel}</b>
          <p>即将接入豪士透明工厂。推荐方案：{selectedBug.recommendation}</p>
        </Panel>
      )}

      <Panel className="editable-input">
        <label htmlFor="bug-description">补充描述你的早餐场景（选填）</label>
        <textarea
          id="bug-description"
          value={description}
          maxLength={100}
          onChange={(event) => setDescription(event.target.value)}
          onFocus={refreshDescriptionPrompt}
          onPointerDown={refreshDescriptionPrompt}
          placeholder={descriptionPrompts[descriptionPromptIndex]}
        />
        <em>{description.length}/100</em>
      </Panel>

      <div className="bottom-actions">
        <GlowButton onClick={submitBug} disabled={!selectedBug}>
          {selectedBug ? "生成我的早餐问题档案" : "先选择一个早餐困扰"}
        </GlowButton>
        <p className="tiny-tip">
          {selectedBug ? "已选定早餐困扰，可以生成问题档案" : "先滑动或点击选择一个早餐困扰"}
        </p>
      </div>
    </Screen>
  );
}

export function WorkOrderPage({ go, order, solution, unlockStage }: PageProps) {
  const [readProgress, setReadProgress] = useState(0);
  const readTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const readProgressValueRef = useRef({ value: 0 });
  const readCompletedRef = useRef(false);
  const orderReady = readProgress >= 100;

  useEffect(() => {
    readCompletedRef.current = false;
    readProgressValueRef.current.value = 0;
    setReadProgress(0);
    let lastProgress = -1;

    readTweenRef.current?.kill();
    readTweenRef.current = gsap.to(readProgressValueRef.current, {
      value: 100,
      duration: 2.4,
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
      <TopBar onBack={() => go("select")} progress="03 / 09" />
      <PageTitle label="FACTORY BACKEND ACCESS" title="豪士透明工厂后台已接入" subtitle="早餐问题数据正在传输，接下来用五个任务证明好吃看得见。" />

      <div className="order-factory-layer" aria-hidden="true">
        <img src={assets.factoryCutout} alt="" />
      </div>

      <section className="panel order-console" onClick={completeOrderRead}>
        <div className="conveyor">
          <img src={assets.mascotOperator} alt="豪小士控制台" />
          <div className="floating-ticket">
            <ClipboardList size={20} />
            <span>透明工厂接入中</span>
          </div>
          <p>工单已入库，透明工厂正在同步早餐 BUG 数据。</p>
        </div>

        <div className="work-order">
          <header className="work-order-head">
            <div>
              <h2>早餐问题档案</h2>
              <p>早餐状态出现小 BUG，准备进入透明工厂。</p>
            </div>
          </header>
          <InfoRows
            rows={[
              ["档案编号", order.id],
              ["早餐困扰", order.bugType],
              ["场景描述", order.description],
              ["匹配工艺", `${solution.orderLabel} · 进入五大透明控制舱`],
              ["优先级", order.priority]
            ]}
          />
          <Progress label={orderReady ? "档案接入完成" : "档案接入进度"} value={readProgress} compact />
        </div>
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
          {orderReady ? "进入原料数据舱" : "点击完成接入任务"}
        </GlowButton>
        <FlowNav active={1} />
      </div>
    </Screen>
  );
}

export function SoftRepairPage({
  go,
  notice,
  repairCharge,
  setRepairCharge,
  unlockStage,
  setNotice,
  selectFactoryArea
}: PageProps) {
  const documentVisible = useDocumentVisible();
  const holdTimer = useRef<number | null>(null);
  const holdActiveRef = useRef(false);
  const repairChargeRef = useRef(repairCharge);
  const [isAwakening, setIsAwakening] = useState(false);
  const [pressFailed, setPressFailed] = useState(false);
  const [showSoftCompleteModal, setShowSoftCompleteModal] = useState(false);
  const softComplete = repairCharge >= 100;
  const softInlineNotice = compactNotice(notice);
  const pressDistance = softComplete ? 36 : Math.min(35, Math.floor((repairCharge / 100) * 36));
  const softActionLabel = softComplete
    ? "进入恒温醒发舱"
    : isAwakening
      ? "压面中，继续按住"
      : pressFailed
        ? "重新按住启动压面机"
        : "按住启动压面机";
  const tunnelNodes = [
    { meter: 0, label: "面团进入" },
    { meter: 12, label: "组织展开" },
    { meter: 24, label: "松软结构生成" },
    { meter: 36, label: "松软状态激活" }
  ] as const;
  const repairStatuses: Array<[string, string, string, LucideIcon]> = [
    ["压面距离", `${pressDistance}m / 36m`, softComplete ? "压面完成" : pressFailed ? "中途放开，已归零" : "按住推进", Factory],
    ["面团状态", softComplete ? "松软状态已激活" : pressFailed ? "压面失败" : "连续压延中", pressFailed ? "请重新按住启动" : "36 米压面机运行中", Wheat],
    ["组织结构", softComplete ? "松软结构完成" : pressFailed ? "结构未成型" : "逐步展开", "压延数据同步", SlidersHorizontal],
    ["松软值", softComplete ? "已满格" : "动态上升", `${repairCharge}%`, HeartPulse]
  ];
  const clearHold = () => {
    if (holdTimer.current !== null) {
      window.clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const completeSoftRepair = () => {
    holdActiveRef.current = false;
    clearHold();
    setIsAwakening(false);
    setPressFailed(false);
    setShowSoftCompleteModal(true);
    setNotice("松软唤醒完成，松软状态已激活。");
  };
  const advanceRepair = (step: number) => {
    if (repairChargeRef.current >= 100) return;

    const next = Math.min(100, repairChargeRef.current + step);
    repairChargeRef.current = next;
    setRepairCharge(next);

    if (next >= 100) {
      completeSoftRepair();
    }
  };
  const beginHold = () => {
    if (softComplete) {
      setShowSoftCompleteModal(true);
      return;
    }
    if (holdTimer.current !== null) return;
    holdActiveRef.current = true;
    setPressFailed(false);
    setIsAwakening(true);
    setNotice("按住启动压面机，面团正在进入松软唤醒舱。");
    holdTimer.current = window.setInterval(() => {
      advanceRepair(5);
    }, 70);
  };
  const stopHold = () => {
    if (!holdActiveRef.current && holdTimer.current === null) return;
    const wasHolding = holdActiveRef.current;
    holdActiveRef.current = false;
    clearHold();
    setIsAwakening(false);
    if (!wasHolding) return;
    if (repairChargeRef.current < 100) {
      repairChargeRef.current = 0;
      setRepairCharge(0);
      setPressFailed(true);
      setNotice("压面中途停止，面团回到起点，请重新按住启动。");
    }
  };

  useEffect(() => {
    repairChargeRef.current = repairCharge;
  }, [repairCharge]);

  useEffect(() => {
    if (!documentVisible) {
      stopHold();
    }
  }, [documentVisible]);

  useEffect(() => clearHold, []);

  return (
    <Screen background={assets.bgToastLab} className={`repair-page ${isAwakening ? "is-awakening" : ""} ${pressFailed ? "press-failed" : ""} ${softComplete ? "soft-complete" : ""}`}>
      <TopBar onBack={() => go("ingredientScan")} progress="05 / 09" />
      <PageTitle label="SOFT CAPSULE 02" title="松软唤醒舱" subtitle="36 米压面工艺启动，松软结构正在生成。" />
      <p className="soft-main-copy">面团进入 36 米长压面机，经过连续压延，松软口感逐步成型。</p>

      <Panel className="soft-proofing-panel">
        <section
          className="repair-capsule proofing-chamber noodle-tunnel"
          style={
            {
              "--soft-progress": `${repairCharge}%`,
              "--dough-left": `${12 + repairCharge * 0.74}%`
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
            <div className="press-progress-readout" aria-live="polite">
              <b>{repairCharge}%</b>
              <span>{pressDistance}m / 36m</span>
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
            onPointerCancel={stopHold}
          >
            <span>{softComplete ? "压面完成" : isAwakening ? "压面机运行中" : "按住启动压面机"}</span>
            <small>
              {softComplete ? "松软状态已激活" : (!isAwakening && softInlineNotice) || (isAwakening ? `${repairCharge}% / 松开会归零` : pressFailed ? "重新按住，从 0 米开始" : "持续按住直到 100%")}
            </small>
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

      {showSoftCompleteModal && softComplete && (
        <CompletionModal
          ariaLabel="松软唤醒完成"
          title="松软唤醒完成"
          body="松软状态已激活。"
          primaryLabel="进入恒温醒发舱"
          secondaryLabel="再来一次"
          onPrimary={() => {
            unlockStage(4);
            selectFactoryArea("proofing");
            go("proofingLive");
          }}
          onSecondary={() => {
            setShowSoftCompleteModal(false);
            repairChargeRef.current = 0;
            setRepairCharge(0);
            setPressFailed(false);
            setNotice("重新按住启动压面机，面团将从 0 米开始进入松软唤醒舱。");
          }}
        />
      )}

      <div className="bottom-actions">
        <GlowButton
          onClick={() => {
            if (repairCharge < 100) {
              setNotice("先按住启动压面机，让面团完成松软唤醒。");
              return;
            }
            unlockStage(4);
            selectFactoryArea("proofing");
            go("proofingLive");
          }}
        >
          {softActionLabel}
        </GlowButton>
        <OperationFlow active={1} />
      </div>
    </Screen>
  );
}

export function IngredientScanPage({
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
  const acceptedIngredientIds = Array.from(new Set(ingredientIds.filter((id) => ingredients.some((item) => item.id === id))));
  const ingredientProgress = Math.round((acceptedIngredientIds.length / correctTotal) * 100);
  const sourceComplete = acceptedIngredientIds.length >= correctTotal;
  const sourceInlineNotice = compactNotice(notice);
  const ingredientIdsRef = useRef<string[]>(acceptedIngredientIds);
  const [showSourceCompleteModal, setShowSourceCompleteModal] = useState(false);
  const [armedIngredientId, setArmedIngredientId] = useState<string | null>(null);
  const [coreArmed, setCoreArmed] = useState(false);
  const [ingestEffect, setIngestEffect] = useState<{ id: string; tick: number } | null>(null);
  useEffect(() => {
    ingredientIdsRef.current = acceptedIngredientIds;
  });

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

    if (ingredientIdsRef.current.includes(id)) {
      setNotice("这张原料数据卡已经录入透明搅拌核心。");
      return;
    }

    const nextIngredientIds = [...ingredientIdsRef.current, id];
    ingredientIdsRef.current = nextIngredientIds;
    setIngestEffect({ id, tick: Date.now() });
    setIngredientIds((current) => (current.includes(id) ? current : [...current, id]));
    if (nextIngredientIds.length >= correctTotal) {
      setShowSourceCompleteModal(true);
      setNotice("原料数据读取完成。好吃第一步，已看见。");
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
        <span className="source-card-state">{accepted ? "已录入" : "拖入 / 点击"}</span>
      </article>
    );
  };

  return (
    <Screen background={assets.bgTerminal} className="scan-page ingredient-capsule-page">
      <TopBar onBack={() => go("workOrder")} progress="04 / 09" />
      <PageTitle label="HORSH BREAKFAST OS v2.2.4" title="原料数据舱" subtitle="原料数据载入中，好吃第一步正在点亮。" />

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
            <div className="source-core-dropzone" aria-hidden="true" />
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
                  <small>{sourceInlineNotice || "原料数据读取完成。好吃第一步，已看见。"}</small>
                </>
              ) : (
                <>
                  <b>SOURCE DATA ACCEPTED</b>
                  <span>原料数据已录入：{acceptedIngredientIds.length}/{correctTotal}</span>
                  <small>{sourceInlineNotice || "拖入或点击原料卡，录入透明搅拌核心。"}</small>
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
          ariaLabel="原料数据读取完成"
          title="原料数据读取完成"
          body="好吃第一步，已看见。"
          primaryLabel="进入松软唤醒舱"
          secondaryLabel="再来一次"
          onPrimary={() => {
            unlockStage(3);
            selectFactoryArea("pressing");
            go("softRepair");
          }}
          onSecondary={() => {
            setShowSourceCompleteModal(false);
            ingredientIdsRef.current = [];
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
            selectFactoryArea("pressing");
            go("softRepair");
          }}
        >
          {sourceComplete ? "进入松软唤醒舱" : `拖入原料数据 ${acceptedIngredientIds.length}/${correctTotal}`}
        </GlowButton>
        <OperationFlow active={0} />
      </div>

    </Screen>
  );
}

export function ProofingLivePage(props: PageProps) {
  const proofingSliderRectRef = useRef<DOMRect | null>(null);
  const proofingSliderBoardRef = useRef<HTMLDivElement>(null);
  const proofingDraftRef = useRef({ temperature: 30, humidity: 72 });
  const proofingCommitFrameRef = useRef(0);
  const [temperatureValue, setTemperatureValue] = useState(30);
  const [humidityValue, setHumidityValue] = useState(72);
  const [showProofingCompleteModal, setShowProofingCompleteModal] = useState(false);
  const idealMin = 45;
  const idealMax = 58;
  const temperatureIdeal = temperatureValue >= idealMin && temperatureValue <= idealMax;
  const humidityIdeal = humidityValue >= idealMin && humidityValue <= idealMax;
  const proofingReady = temperatureIdeal && humidityIdeal;
  const temperature = Math.round(24 + temperatureValue * 0.24);
  const humidity = Math.round(52 + humidityValue * 0.48);
  const temperatureStatus =
    temperatureValue < idealMin ? "偏低：醒发慢" : temperatureValue > idealMax ? "偏高：醒发过快" : "适合：醒发稳定";
  const humidityStatus =
    humidityValue < idealMin ? "偏低：面坯偏干" : humidityValue > idealMax ? "偏高：湿度过载" : "适合：湿度稳定";
  const softnessScore = Math.round(
    56 +
      Math.max(0, 1 - Math.abs(temperatureValue - 51) / 51) * 13 +
      Math.max(0, 1 - Math.abs(humidityValue - 51) / 51) * 13
  );
  const proofingInlineNotice = compactNotice(props.notice, 38);
  const proofingHint = proofingInlineNotice || (
    !temperatureIdeal && !humidityIdeal
      ? "按住两个指针，拖进中间稳定区"
      : !temperatureIdeal
        ? "温度指针还没进稳定区"
        : !humidityIdeal
          ? "湿度指针还没进稳定区"
          : "双参数已稳定，可以锁定"
  );
  const markerFor = (value: number) => {
    if (value < idealMin) return assets.proofingMarkerLow;
    if (value > idealMax) return assets.proofingMarkerHigh;
    return assets.proofingMarkerIdeal;
  };
  const writeProofingCssValue = (kind: "temperature" | "humidity", value: number) => {
    proofingSliderBoardRef.current?.style.setProperty(
      kind === "temperature" ? "--proof-temp" : "--proof-humidity",
      `${value}%`
    );
  };
  const commitProofingDraft = () => {
    proofingCommitFrameRef.current = 0;
    setTemperatureValue((current) =>
      current === proofingDraftRef.current.temperature ? current : proofingDraftRef.current.temperature
    );
    setHumidityValue((current) =>
      current === proofingDraftRef.current.humidity ? current : proofingDraftRef.current.humidity
    );
  };
  const scheduleProofingValue = (kind: "temperature" | "humidity", value: number) => {
    proofingDraftRef.current = {
      ...proofingDraftRef.current,
      [kind]: value
    };
    writeProofingCssValue(kind, value);

    if (!proofingCommitFrameRef.current) {
      proofingCommitFrameRef.current = window.requestAnimationFrame(commitProofingDraft);
    }
  };
  const dragSlider = (
    event: ReactPointerEvent<HTMLDivElement>,
    kind: "temperature" | "humidity"
  ) => {
    const rect = proofingSliderRectRef.current ?? event.currentTarget.getBoundingClientRect();
    const next = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    scheduleProofingValue(kind, Math.max(0, Math.min(100, next)));
  };
  const startSliderDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    kind: "temperature" | "humidity"
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    proofingSliderRectRef.current = event.currentTarget.getBoundingClientRect();
    dragSlider(event, kind);
  };
  const endSliderDrag = () => {
    proofingSliderRectRef.current = null;
  };
  useEffect(() => {
    proofingDraftRef.current.temperature = temperatureValue;
    writeProofingCssValue("temperature", temperatureValue);
  }, [temperatureValue]);

  useEffect(() => {
    proofingDraftRef.current.humidity = humidityValue;
    writeProofingCssValue("humidity", humidityValue);
  }, [humidityValue]);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(proofingCommitFrameRef.current);
    },
    []
  );
  const lockProofing = () => {
    if (!proofingReady) {
      props.setNotice(`醒发参数还没稳定：温度${temperatureStatus}，湿度${humidityStatus}。把两个指针拖到中间适合区。`);
      return;
    }

    setShowProofingCompleteModal(true);
    props.setNotice("恒温醒发完成，松软气孔已稳定。");
  };

  return (
    <Screen
      background={assets.bgToastLab}
      className={`production-live-page proofing-live-stage ${proofingReady ? "proofing-ready" : ""}`}
    >
      <TopBar onBack={() => props.go("softRepair")} progress="06 / 09" />
      <PageTitle label="PROOFING CAPSULE 03" title="恒温醒发舱" subtitle="拖动温湿度滑块，让松软气孔稳定形成。" />

      <Panel className="scanner-panel production-live-panel proofing-control-panel">
        <header>
          <b>醒发参数校准中</b>
          <span>{proofingHint}</span>
        </header>

        <div className="proofing-chamber-stage">
          <img src={assets.proofingChamber} alt="恒温醒发舱里的面团" className="proofing-chamber-photo" />
          <div className="proofing-steam-cloud" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="proofing-target-badge">
            <span>目标醒发</span>
            <strong>稳定区</strong>
            <em>温度 34°C~38°C / 湿度 74%~80%RH</em>
          </div>
          <div className="proofing-live-readout">
            <span>醒发反馈</span>
            <b>{proofingReady ? "松软气孔已成型" : "面团正在蓬起"}</b>
            <em>松软值 {softnessScore}%</em>
          </div>
        </div>

        <div
          ref={proofingSliderBoardRef}
          className="proofing-slider-board"
          style={
            {
              "--proof-temp": `${temperatureValue}%`,
              "--proof-humidity": `${humidityValue}%`
            } as CSSProperties
          }
        >
          <section className="proofing-slider-card temperature">
            <header>
              <span className="proofing-slider-title">
                <Thermometer size={24} />
                <b>温度滑杆</b>
              </span>
              <strong className="proofing-slider-reading">{temperature}°C</strong>
            </header>
            <div className="proofing-slider-lane">
              <img src={assets.proofingSliderTrack} alt="" className="proofing-slider-track" draggable={false} />
              <div
                className={`proofing-slider-hitbox temperature ${temperatureIdeal ? "is-ideal" : ""}`}
                role="slider"
                aria-label="温度滑杆"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={temperatureValue}
                onPointerDown={(event) => {
                  startSliderDrag(event, "temperature");
                }}
                onPointerMove={(event) => {
                  if (event.buttons) dragSlider(event, "temperature");
                }}
                onPointerUp={endSliderDrag}
                onPointerCancel={endSliderDrag}
              >
                <img src={markerFor(temperatureValue)} alt="" />
              </div>
            </div>
            <div className="proofing-slider-copy">
              <span>偏低：醒发慢</span>
              <span>合适：醒发稳定</span>
              <span>偏高：醒发过快</span>
            </div>
          </section>

          <section className="proofing-slider-card humidity">
            <header>
              <span className="proofing-slider-title">
                <Droplet size={24} />
                <b>湿度滑杆</b>
              </span>
              <strong className="proofing-slider-reading">{humidity}%RH</strong>
            </header>
            <div className="proofing-slider-lane">
              <img src={assets.proofingSliderTrack} alt="" className="proofing-slider-track" draggable={false} />
              <div
                className={`proofing-slider-hitbox humidity ${humidityIdeal ? "is-ideal" : ""}`}
                role="slider"
                aria-label="湿度滑杆"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={humidityValue}
                onPointerDown={(event) => {
                  startSliderDrag(event, "humidity");
                }}
                onPointerMove={(event) => {
                  if (event.buttons) dragSlider(event, "humidity");
                }}
                onPointerUp={endSliderDrag}
                onPointerCancel={endSliderDrag}
              >
                <img src={markerFor(humidityValue)} alt="" />
              </div>
            </div>
            <div className="proofing-slider-copy">
              <span>偏低：面坯偏干</span>
              <span>合适：湿度稳定</span>
              <span>偏高：湿度过载</span>
            </div>
          </section>
        </div>

      </Panel>

      {showProofingCompleteModal && proofingReady && (
        <CompletionModal
          ariaLabel="恒温醒发完成"
          title="恒温醒发完成"
          body="温湿度都落在稳定区，松软气孔已形成。"
          primaryLabel="进入黄金焙香舱"
          secondaryLabel="再校准一次"
          onPrimary={() => {
            props.unlockStage(4);
            props.selectFactoryArea("baking");
            props.go("bakingLive");
          }}
          onSecondary={() => {
            setShowProofingCompleteModal(false);
            setTemperatureValue(30);
            setHumidityValue(72);
            props.setNotice("醒发滑块已重置，请重新拖到中间适合区。");
          }}
        />
      )}

      <div className="bottom-actions">
        <GlowButton icon={<ShieldCheck size={18} />} onClick={lockProofing}>
          {proofingReady ? "锁定醒发参数" : "先拖进稳定区"}
        </GlowButton>
        <OperationFlow active={2} />
      </div>
    </Screen>
  );
}

export function BakingLivePage(props: PageProps) {
  const documentVisible = useDocumentVisible();
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
  const heatActionLabel = heatStopped ? (isGolden ? "进入透明验证舱" : "重新锁定火候") : "按下锁定火候";
  const heatInlineNotice = compactNotice(props.notice);
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
    preloadPackageModelAssets(assets.packageModel);
  }, []);

  useEffect(() => {
    if (!documentVisible || heatStopped || showHeatCompleteModal || showHeatFailModal) return;

    const timer = window.setInterval(() => {
      setHeatValue((current) => Math.min(100, current + 1));
    }, 58);

    return () => window.clearInterval(timer);
  }, [documentVisible, heatStopped, showHeatCompleteModal, showHeatFailModal]);

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
      <TopBar onBack={() => props.go("proofingLive")} progress="07 / 09" />
      <PageTitle label="AROMA CAPSULE 04" title="黄金焙香舱" subtitle="观察滑块进入 165°C~175°C 黄金区，再按下锁定火候。" />

      <Panel className="scanner-panel production-live-panel heat-control-panel">
        <header>
          <b>面包烤色随温度实时变化</b>
          <span>{heatStopped ? `${heatStatus} · ${heatFeedback}` : `进入黄金区时按下锁定 · ${heatTemperature}°C`}</span>
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
          <div className="oven-brand">HORSH</div>
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
            {heatInlineNotice || `${bakeStageText} / ${heatStatus} / ${heatFeedback}`}
          </p>
        </div>
      </Panel>

      {showHeatCompleteModal && heatStopped && isGolden && (
        <CompletionModal
          ariaLabel="黄金焙香完成"
          title="黄金焙香舱完成"
          body="火候停在黄金区，香气已上线。"
          primaryLabel="进入透明验证舱"
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
          secondaryLabel="知道了"
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
        <OperationFlow active={3} />
      </div>
    </Screen>
  );
}

export function PackingLivePage(props: PageProps) {
  const documentVisible = useDocumentVisible();
  const traceStageRef = useRef<HTMLDivElement>(null);
  const packageModelRef = useRef<PackageModelViewerHandle | null>(null);
  const traceStageRectRef = useRef<DOMRect | null>(null);
  const interactionRef = useRef<"rotate" | "scan" | null>(null);
  const traceCompleteAnnouncedRef = useRef(false);
  const rotateDragRef = useRef<{
    startX: number;
    startProgress: number;
    lastX: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const rotationTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const traceVisualFrameRef = useRef(0);
  const packageRotationRef = useRef(0);
  const scannerPositionRef = useRef({ x: 72, y: 72 });
  const scannerOnCodeRef = useRef(false);
  const [packageRotation, setPackageRotation] = useState(0);
  const [traceProgress, setTraceProgress] = useState(0);
  const [scannerPosition, setScannerPosition] = useState({ x: 72, y: 72 });
  const [scannerOnCode, setScannerOnCode] = useState(false);
  const [showTraceCompleteModal, setShowTraceCompleteModal] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const rotateComplete = packageRotation >= 96;
  const traceComplete = traceProgress >= 100;
  const traceOutputs: Array<[string, string, LucideIcon]> = [
    ["生产视频", "查看透明工厂生产过程片段", Factory],
    ["检测证书", "读取品质检测与安心证明", ShieldCheck],
    ["产品溯源", "回看原料到出炉的完整路径", ScanLine]
  ];
  const traceUnlockThresholds = [34, 67, 100];
  const traceStageTitle = traceComplete
    ? "透明验证完成，三项结果已解锁"
    : modelFailed
      ? "备用追踪码已就绪"
      : rotateComplete
      ? "拖动扫描器读取二维码"
      : "左右拖动包装，找到背面二维码";
  const traceStageMeta = traceComplete
    ? "UNLOCKED 100%"
    : modelFailed
      ? "FALLBACK READY"
      : rotateComplete
      ? `SCAN ${traceProgress}%`
      : `ROTATE ${Math.round(packageRotation)}%`;
  const traceInlineNotice = compactNotice(props.notice, 42);
  const traceMainCopy = traceInlineNotice || (traceComplete
    ? "生产视频、检测证书与产品溯源已读取完成，可以生成早餐透明报告。"
    : modelFailed
      ? "3D 包装加载失败时，可使用备用追踪码继续完成透明验证。"
      : rotateComplete
      ? "二维码面已就位，拖动圆形扫描器贴近模型自带二维码并保持读取。"
      : "从正面左右拖动 3D 包装，先找到包装背面的模型自带二维码。");
  const traceButtonLabel = traceComplete
    ? "生成我的早餐透明报告"
    : modelFailed
      ? "使用备用追踪码完成验证"
      : rotateComplete
      ? "对准二维码完成扫描"
      : "先找到背面二维码";
  const traceUnlockProgressFor = (index: number) => {
    const start = index === 0 ? 0 : (traceUnlockThresholds[index - 1] ?? 0);
    const end = traceUnlockThresholds[index] ?? 100;
    return Math.min(100, Math.max(0, ((traceProgress - start) / (end - start)) * 100));
  };
  const traceStatusFor = (index: number) => {
    const threshold = traceUnlockThresholds[index] ?? 100;
    if (traceProgress >= threshold) return "已解锁";
    if (modelFailed) return "备用码";
    if (scannerOnCode) return "读取中";
    return rotateComplete ? "待扫描" : "待翻面";
  };
  const traceUnlockedCount = traceUnlockThresholds.filter((threshold) => traceProgress >= threshold).length;

  const writePackageRotationVisual = (value: number) => {
    traceStageRef.current?.style.setProperty("--rotation-progress", `${value}%`);
    packageModelRef.current?.setBackReveal(value / 100);
  };
  const writeScannerPositionVisual = (position: { x: number; y: number }) => {
    const stage = traceStageRef.current;
    if (!stage) return;
    stage.style.setProperty("--scanner-x", `${position.x}%`);
    stage.style.setProperty("--scanner-y", `${position.y}%`);
  };
  const commitTraceVisualState = () => {
    traceVisualFrameRef.current = 0;
    const nextRotation = packageRotationRef.current;
    const nextScannerPosition = scannerPositionRef.current;

    setPackageRotation((current) =>
      Math.abs(current - nextRotation) < 0.05 ? current : nextRotation
    );
    setScannerPosition((current) =>
      current.x === nextScannerPosition.x && current.y === nextScannerPosition.y
        ? current
        : nextScannerPosition
    );
  };
  const scheduleTraceVisualCommit = () => {
    if (!traceVisualFrameRef.current) {
      traceVisualFrameRef.current = window.requestAnimationFrame(commitTraceVisualState);
    }
  };
  const setPackageRotationVisual = (value: number, commitState = true) => {
    packageRotationRef.current = value;
    writePackageRotationVisual(value);
    if (commitState) scheduleTraceVisualCommit();
  };
  const setScannerPositionVisual = (position: { x: number; y: number }, commitState = true) => {
    scannerPositionRef.current = position;
    writeScannerPositionVisual(position);
    if (commitState) scheduleTraceVisualCommit();
  };
  const setScannerOnCodeVisual = (value: boolean) => {
    if (scannerOnCodeRef.current === value) return;
    scannerOnCodeRef.current = value;
    setScannerOnCode(value);
  };

  useEffect(() => {
    preloadPackageModelAssets(assets.packageModel);
  }, []);

  useEffect(() => {
    packageRotationRef.current = packageRotation;
    writePackageRotationVisual(packageRotation);
  }, [packageRotation]);

  useEffect(() => {
    scannerPositionRef.current = scannerPosition;
    writeScannerPositionVisual(scannerPosition);
  }, [scannerPosition]);

  useEffect(() => {
    scannerOnCodeRef.current = scannerOnCode;
  }, [scannerOnCode]);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(traceVisualFrameRef.current);
    },
    []
  );

  useEffect(
    () => () => {
      rotationTweenRef.current?.kill();
    },
    []
  );

  useEffect(() => {
    if (documentVisible) return;

    rotationTweenRef.current?.kill();
    rotationTweenRef.current = null;
    interactionRef.current = null;
    rotateDragRef.current = null;
    traceStageRectRef.current = null;
    setScannerOnCodeVisual(false);
  }, [documentVisible]);

  useEffect(() => {
    if (!documentVisible || !scannerOnCode || !rotateComplete || traceComplete) return undefined;

    const timer = window.setInterval(() => {
      setTraceProgress((current) => Math.min(100, current + 7));
    }, 95);

    return () => window.clearInterval(timer);
  }, [documentVisible, rotateComplete, scannerOnCode, traceComplete]);

  useEffect(() => {
    if (traceProgress < 100) {
      traceCompleteAnnouncedRef.current = false;
      return;
    }
    if (traceCompleteAnnouncedRef.current) return;

    traceCompleteAnnouncedRef.current = true;
    setScannerOnCodeVisual(false);
    setShowTraceCompleteModal(true);
    props.setNotice("透明验证已完成。好吃不是黑箱，过程全程可见。");
  }, [props, traceProgress]);

  const rotatePackage = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = traceStageRectRef.current ?? traceStageRef.current?.getBoundingClientRect();
    const drag = rotateDragRef.current;
    if (!rect || !drag) return;

    const now = window.performance.now();
    const elapsed = Math.max(16, now - drag.lastTime);
    const rawDelta = ((event.clientX - drag.lastX) / rect.width) * 170;
    const delta = drag.startProgress >= 96 ? rawDelta : Math.abs(rawDelta);
    const nextProgress = Math.min(100, Math.max(0, packageRotationRef.current + delta));

    drag.velocity = delta / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = now;
    setPackageRotationVisual(nextProgress);
  };

  const moveScanner = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = traceStageRectRef.current ?? traceStageRef.current?.getBoundingClientRect();
    if (!rect || !rotateComplete) return;

    const x = Math.min(88, Math.max(12, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(84, Math.max(16, ((event.clientY - rect.top) / rect.height) * 100));
    const distanceToCode = Math.hypot(x - 32, y - 24);

    setScannerPositionVisual({ x, y });
    setScannerOnCodeVisual(distanceToCode <= 10.5);
  };

  const startTraceInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (modelFailed) return;

    const rect = traceStageRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const target = event.target as HTMLElement;
    const shouldScan = rotateComplete && Boolean(target.closest(".data-scanner"));

    rotationTweenRef.current?.kill();
    rotationTweenRef.current = null;
    traceStageRectRef.current = rect;
    interactionRef.current = shouldScan ? "scan" : "rotate";
    rotateDragRef.current = {
      startX: event.clientX,
      startProgress: packageRotationRef.current,
      lastX: event.clientX,
      lastTime: window.performance.now(),
      velocity: 0
    };

    if (shouldScan) {
      moveScanner(event);
      return;
    }

    rotatePackage(event);
  };

  const completeTraceWithFallback = () => {
    setPackageRotationVisual(100, false);
    setPackageRotation(100);
    setScannerOnCodeVisual(false);
    setTraceProgress(100);
    props.setNotice("已使用备用追踪码完成透明验证。");
  };

  const updateTraceInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.buttons) return;

    if (interactionRef.current === "rotate") {
      rotatePackage(event);
      setScannerOnCodeVisual(false);
      return;
    }

    if (interactionRef.current === "scan") {
      moveScanner(event);
    }
  };

  const endTraceInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = rotateDragRef.current;
    const wasRotating = interactionRef.current === "rotate";

    interactionRef.current = null;
    rotateDragRef.current = null;
    traceStageRectRef.current = null;
    setScannerOnCodeVisual(false);

    if (wasRotating && drag) {
      const projectedRotation = Math.min(100, Math.max(0, packageRotationRef.current + drag.velocity * 260));
      const tweenState = { value: packageRotationRef.current };
      rotationTweenRef.current?.kill();
      rotationTweenRef.current = gsap.to(tweenState, {
        value: projectedRotation,
        duration: 0.58,
        ease: "power3.out",
        onUpdate: () => setPackageRotationVisual(tweenState.value),
        onComplete: () => {
          rotationTweenRef.current = null;
        }
      });
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Some browsers release pointer capture automatically.
    }
  };

  return (
    <Screen background={assets.bgFactory} className="production-live-page packing-live-stage">
      <TopBar onBack={() => props.go("bakingLive")} progress="08 / 09" />
      <PageTitle label="VERIFY CAPSULE 05" title="透明验证舱" subtitle="扫描包装追踪码，验证好吃全过程。" />

      <Panel className="scanner-panel production-live-panel trace-code-panel">
        <header>
          <b>{traceStageTitle}</b>
          <span>{traceStageMeta}</span>
        </header>
        <div
          ref={traceStageRef}
          className={`trace-code-stage ${traceComplete ? "trace-complete" : ""} ${rotateComplete ? "scan-mode" : "rotate-mode"} ${scannerOnCode ? "qr-locked" : ""} ${modelFailed ? "model-error" : ""}`}
          style={
            {
              "--scanner-x": `${scannerPosition.x}%`,
              "--scanner-y": `${scannerPosition.y}%`,
              "--rotation-progress": `${packageRotation}%`,
              "--trace-progress": `${traceProgress}%`
            } as CSSProperties
          }
          onPointerDown={startTraceInteraction}
          onPointerMove={updateTraceInteraction}
          onPointerUp={endTraceInteraction}
          onPointerCancel={endTraceInteraction}
        >
          <Suspense
            fallback={
              <div className="package-model-viewer">
                <span className="package-model-status">3D 包装载入中</span>
              </div>
            }
          >
            <PackageModelViewer
              ref={packageModelRef}
              modelSrc={assets.packageModel}
              backReveal={packageRotation / 100}
              onReady={() => setModelFailed(false)}
              onError={() => setModelFailed(true)}
            />
          </Suspense>
          {modelFailed && (
            <div className="trace-fallback-card">
              <ShieldCheck size={22} />
              <b>备用追踪码</b>
              <span>3D 包装未载入，仍可完成验证闭环。</span>
            </div>
          )}
          <div className="trace-rotation-meter" aria-hidden={rotateComplete}>
            <span>正面</span>
            <i>
              <em style={{ width: `${packageRotation}%` }} />
            </i>
            <span>背面二维码</span>
          </div>
          {rotateComplete && (
            <>
              <div className="trace-qr-hotspot" aria-label="模型自带二维码扫描区域" />
              <div className="data-scanner">
                <ScanLine size={22} />
                <span>{scannerOnCode ? "READ" : "SCAN"}</span>
              </div>
            </>
          )}
        </div>
        <p className="trace-main-copy">{traceMainCopy}</p>
      </Panel>

      <Panel className={`trace-unlock-strip ${traceComplete ? "trace-complete" : ""} ${scannerOnCode ? "is-reading" : ""}`}>
        <header className="trace-unlock-head">
          <h2>扫描解锁</h2>
          <span>{traceComplete ? "3/3 已完成" : rotateComplete ? `${traceUnlockedCount}/3 证据读取` : "先翻到二维码面"}</span>
        </header>
        <div className="trace-unlock-grid">
          {traceOutputs.map(([title, desc, Icon], index) => {
            const threshold = traceUnlockThresholds[index] ?? 100;
            const itemProgress = traceUnlockProgressFor(index);
            const active = traceProgress >= threshold;

            return (
              <article
                className={`${active ? "active" : ""} ${itemProgress > 0 && !active ? "is-reading" : ""}`}
                key={title}
                style={{ "--unlock-progress": `${itemProgress}%` } as CSSProperties}
              >
                <i>{String(index + 1).padStart(2, "0")}</i>
                <Icon size={20} />
                <b>{title}</b>
                <span>{desc}</span>
                <em>{traceStatusFor(index)}</em>
                <small aria-hidden="true" />
              </article>
            );
          })}
        </div>
      </Panel>

      {showTraceCompleteModal && traceComplete && (
        <CompletionModal
          ariaLabel="透明验证完成"
          title="透明验证完成"
          body="生产视频、检测证书与产品溯源已解锁。"
          primaryLabel="生成早餐透明报告"
          secondaryLabel="继续查看"
          onPrimary={() => {
            props.unlockStage(5);
            props.go("report");
          }}
          onSecondary={() => setShowTraceCompleteModal(false)}
        />
      )}

      <div className="bottom-actions">
        <GlowButton
          disabled={!traceComplete && !modelFailed}
          onClick={() => {
            if (modelFailed && !traceComplete) {
              completeTraceWithFallback();
              return;
            }
            if (!traceComplete) return;
            props.unlockStage(5);
            props.go("report");
          }}
        >
          {traceButtonLabel}
        </GlowButton>
        <OperationFlow active={4} />
      </div>
    </Screen>
  );
}

export function ReportPage({ go, order, notice, solution, saveReport, shareReport, openPurchasePage, reportRef }: PageProps) {
  const reportTickets = [
    ["早餐小 BUG", order.bugType, order.description],
    ["当前身份", solution.identity, solution.scenarioCopy],
    ["推荐方案", solution.recommendation, "豪士藜麦吐司，好吃看得见。"]
  ] as const;
  const reportInlineNotice = compactNotice(notice, 42);

  return (
    <Screen background={assets.bgTerminal} className="report-page">
      <TopBar onBack={() => go("packingLive")} progress="09 / 09" />
      <PageTitle label="BREAKFAST BUG REPORT" title="我的早餐透明报告" subtitle="豪士藜麦吐司透明验证已完成。" />

      <div className="report-card report-certificate" ref={reportRef}>
        <header className="report-certificate-head">
          <div>
            <span>HORSH TRANSPARENT FACTORY</span>
            <h2>豪士藜麦吐司</h2>
            <p>REPORT NO. {order.id}</p>
          </div>
          <b>
            <CheckCircle2 size={16} />
            VERIFIED
          </b>
        </header>

        <section className="report-hero-panel">
          <div className="report-product-stage">
            <i className="report-product-halo" aria-hidden="true" />
            <img className="report-product-box" src={assets.productBoxCropped} alt="豪士藜麦吐司盒装" />
            <img className="report-product-front" src={assets.productFrontCropped} alt="豪士藜麦吐司产品正面" />
          </div>
          <div className="report-verdict">
            <span>透明结论</span>
            <strong>好吃看得见</strong>
            <p>原料、工艺与包装追踪码已完成验证，过程可见。</p>
            <small>{solution.recommendation} · {solution.identity}</small>
          </div>
        </section>

        <section className="report-ticket">
          {reportTickets.map(([label, value, desc]) => (
            <article key={label}>
              <span>{label}</span>
              <b>{value}</b>
              <p>{desc}</p>
            </article>
          ))}
        </section>

      </div>

      <div className="report-actions">
        <button onClick={saveReport}><Download size={18} />保存报告</button>
        <button onClick={shareReport}><Share2 size={18} />分享报告</button>
        <button onClick={openPurchasePage}>
          <ShoppingCart size={18} />购买同款
        </button>
      </div>
      <p className={`report-inline-status ${reportInlineNotice ? "active" : ""}`}>
        {reportInlineNotice || "报告已生成。"}
      </p>
      <GlowButton variant="secondary" onClick={() => go("home")}>
        再来一次
      </GlowButton>
    </Screen>
  );
}
