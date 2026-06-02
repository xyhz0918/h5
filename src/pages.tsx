import {
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  Droplet,
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
  Thermometer,
  Timer,
  Utensils,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon
} from "lucide-react";
import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from "react";
import { CompletionModal, FlowNav, GlowButton, InfoRows, Notice, OperationFlow, PageTitle, Panel, Progress, Screen, TopBar } from "./components/ui";
import { assets } from "./lib/assets";
import { bugOptions } from "./lib/content";
import type { FactoryAreaId, PageProps } from "./types";

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

export function HomePage({ go, notice, transitionPhase, homeArrivalActive, homeRepairActive }: PageProps) {
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
        subtitle="把你的早餐问题送进豪士透明工厂，看见好吃如何生成。"
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

      <p className="story-copy">进入豪士透明工厂后台，看见好吃如何生成。</p>

      <div className="bottom-actions">
        <GlowButton onClick={() => go("select")}>送进豪士透明工厂</GlowButton>
        <FlowNav active={0} />
      </div>
      <Notice text={notice} />
    </Screen>
  );
}

export function SelectPage({
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
      <TopBar onBack={() => go("home")} progress="02 / 09" />
      <img
        src={assets.mascotField}
        alt="豪小士"
        className="corner-mascot"
      />
      <PageTitle
        label="早餐小 BUG 选择器"
        title="请选择你的早餐困扰"
        subtitle="选定一个早餐小 BUG，豪士透明工厂将匹配对应工艺。"
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
          placeholder="可以补充时间、地点、节奏，页面会生成早餐问题档案。"
        />
        <em>{description.length}/100</em>
      </Panel>

      <div className="bottom-actions">
        <GlowButton onClick={submitBug} disabled={!selectedBug}>
          {selectedBug ? "生成我的早餐问题档案" : "先选择一个早餐困扰"}
        </GlowButton>
        <p className="tiny-tip">选定一个早餐小 BUG 后，将接入豪士透明工厂后台</p>
      </div>
      <Notice text={notice} />
    </Screen>
  );
}

export function WorkOrderPage({ go, order, notice, solution, unlockStage }: PageProps) {
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
      <TopBar onBack={() => go("select")} progress="03 / 09" />
      <PageTitle label="FACTORY BACKEND ACCESS" title="豪士透明工厂后台已接入" subtitle="早餐问题数据正在传输，五大透明控制舱准备验证。" />

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
          <p>点击当前档案区，确认早餐小 BUG 进入工厂控制台。</p>
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
          <span className={`stamp ${orderReady ? "ready" : ""}`}>{stampStatus}</span>
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
          {orderReady ? "进入原料数据舱" : "早餐问题数据接入中..."}
        </GlowButton>
        <FlowNav active={1} />
      </div>
      <Notice text={notice} />
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
        setNotice("松软唤醒完成，松软状态已激活。");
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
    setNotice("按住启动压面机，面团正在进入松软唤醒舱。");
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
        setNotice("压面中途停止，面团回到起点，请重新按住启动。");
        return 0;
      }
      return current;
    });
  };

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
          进入恒温醒发舱
        </GlowButton>
        <OperationFlow active={1} />
      </div>
      <Notice text={notice} />
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
        <span className="source-card-state">{accepted ? "已录入" : "点击录入"}</span>
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
                  <small>{notice || "原料数据读取完成。好吃第一步，已看见。"}</small>
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
  const proofingHint =
    !temperatureIdeal && !humidityIdeal
      ? "按住两个指针，拖进中间稳定区"
      : !temperatureIdeal
        ? "温度指针还没进稳定区"
        : !humidityIdeal
          ? "湿度指针还没进稳定区"
          : "双参数已稳定，可以锁定";
  const softnessScore = Math.round(
    56 +
      Math.max(0, 1 - Math.abs(temperatureValue - 51) / 51) * 13 +
      Math.max(0, 1 - Math.abs(humidityValue - 51) / 51) * 13
  );
  const markerFor = (value: number) => {
    if (value < idealMin) return assets.proofingMarkerLow;
    if (value > idealMax) return assets.proofingMarkerHigh;
    return assets.proofingMarkerIdeal;
  };
  const dragSlider = (
    event: ReactPointerEvent<HTMLDivElement>,
    setter: Dispatch<SetStateAction<number>>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    setter(Math.max(0, Math.min(100, next)));
  };
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
          <div className="proofing-steam-cloud" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>

        <div
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
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragSlider(event, setTemperatureValue);
                }}
                onPointerMove={(event) => {
                  if (event.buttons) dragSlider(event, setTemperatureValue);
                }}
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
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragSlider(event, setHumidityValue);
                }}
                onPointerMove={(event) => {
                  if (event.buttons) dragSlider(event, setHumidityValue);
                }}
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
      <Notice text={props.notice} />
    </Screen>
  );
}

export function BakingLivePage(props: PageProps) {
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
      <TopBar onBack={() => props.go("proofingLive")} progress="07 / 09" />
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
            {bakeStageText} / {heatStatus} / {heatFeedback}
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
        <OperationFlow active={3} />
      </div>
      <Notice text={props.notice} />
    </Screen>
  );
}

export function PackingLivePage(props: PageProps) {
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
      props.setNotice("透明验证已完成。好吃不是黑箱，过程全程可见。");
    }
  };

  return (
    <Screen background={assets.bgFactory} className="production-live-page packing-live-stage">
      <TopBar onBack={() => props.go("bakingLive")} progress="08 / 09" />
      <PageTitle label="VERIFY CAPSULE 04" title="透明验证舱" subtitle="扫描包装追踪码，验证好吃全过程。" />
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
            <span>HORSH</span>
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
          ariaLabel="透明验证已完成"
          title="透明验证已完成。"
          body="好吃不是黑箱，过程全程可见。"
          primaryLabel="生成我的早餐透明报告"
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
              props.setNotice("请拖动圆形数据扫描器，对准 HORSH TRACE CODE。");
              setTraceProgress((current) => Math.min(92, current + 22));
              return;
            }
            setShowTraceCompleteModal(true);
          }}
        >
          生成我的早餐透明报告
        </GlowButton>
        <OperationFlow active={4} />
      </div>
      <Notice text={props.notice} />
    </Screen>
  );
}

export function ReportPage({ go, order, notice, solution, saveReport, shareReport, reportRef, setNotice }: PageProps) {
  return (
    <Screen background={assets.bgTerminal} className="report-page">
      <TopBar onBack={() => go("packingLive")} progress="09 / 09" />
      <PageTitle label="BREAKFAST BUG REPORT" title="我的早餐透明报告" subtitle="本次早餐小 BUG 已完成透明工厂验证。" />

      <section className="report-card" ref={reportRef}>
        <header>
          <span>REPORT NO. {order.id}</span>
          <b>LOADED 豪士透明工厂</b>
        </header>
        <InfoRows
          rows={[
            ["早餐小 BUG", order.bugType],
            ["早餐角色", solution.abnormalRole],
            ["推荐方案", solution.recommendation],
            ["已完成控制舱", "原料数据舱 / 松软唤醒舱 / 恒温醒发舱 / 黄金焙香舱 / 透明验证舱"],
            ["当前身份", solution.identity],
            ["状态关键词", "安心 / 松软 / 香气 / 看得见"],
            ["透明结论", "早餐不将就，好吃看得见。"],
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
          <span><b>100%</b>状态唤醒</span>
          <span><b>5/5</b>控制舱完成</span>
          <span><b>100%</b>透明验证</span>
        </div>
      </section>

      <div className="report-actions">
        <button onClick={saveReport}><Download size={18} />保存透明报告</button>
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
