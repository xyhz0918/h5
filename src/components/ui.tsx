import { ArrowLeft, ChevronRight } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { flowSteps, operationSteps } from "../lib/content";
import { assets } from "../lib/assets";
import { useDesignCanvasScale } from "../hooks/useDesignCanvasScale";
import { useScreenEntranceMotion } from "../hooks/useScreenEntranceMotion";

export function Screen({
  children,
  background,
  className = "",
  entranceMotion = true,
  motionLayer = false
}: {
  children: ReactNode;
  background: string;
  className?: string;
  entranceMotion?: boolean;
  motionLayer?: boolean;
}) {
  const screenRef = useRef<HTMLElement>(null);
  const designScale = useDesignCanvasScale();
  useScreenEntranceMotion(screenRef, entranceMotion);

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
          {motionLayer && <MotionLayer />}
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

export function TopBar({
  audioToggle,
  onBack,
  progress
}: {
  audioToggle?: ReactNode;
  onBack?: () => void;
  progress?: string;
}) {
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
      <div className="top-status-side">
        {audioToggle}
        <div className="online-panel">
          <span />
          <b>FACTORY STATUS</b>
          <strong>ONLINE</strong>
        </div>
      </div>
    </header>
  );
}

export function PageTitle({
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
      <h1 className={titleClassName} data-text={titleDataText} aria-label={titleDataText}>{title}</h1>
      <span>{subtitle}</span>
    </section>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function GlowButton({
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

export function CompletionModal({
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

export function Notice({ text }: { text: string }) {
  return text ? <div className="notice">{text}</div> : null;
}

export function FlowNav({ active }: { active: number }) {
  return (
    <nav className="flow-nav" aria-label="流程导航">
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

export function OperationFlow({ active, title = "操作舱流程" }: { active: number; title?: string }) {
  const boundedActive = Math.min(Math.max(active, 0), operationSteps.length - 1);

  return (
    <nav className="operation-flow" aria-label={title}>
      <header>
        <b>{title}</b>
        <span>{String(boundedActive + 1).padStart(2, "0")} / 05</span>
      </header>
      <div className="operation-flow-track">
        {operationSteps.map(({ label, meta, icon: Icon }, index) => (
          <div
            className={`operation-step ${index < boundedActive ? "done" : ""} ${index === boundedActive ? "active" : ""}`}
            key={label}
          >
            <i>
              <Icon size={15} />
            </i>
            <b>{label}</b>
            <span>{meta}</span>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function InfoRows({ rows }: { rows: Array<[string, string]> }) {
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

export function Progress({ label, value, compact = false }: { label?: string; value: number; compact?: boolean }) {
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
