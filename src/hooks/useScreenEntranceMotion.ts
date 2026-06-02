import gsap from "gsap";
import { useLayoutEffect } from "react";
import type { RefObject } from "react";

const screenEntranceTargets = [
  ".top-bar",
  ".page-title",
  ".flow-nav",
  ".panel",
  ".live-card",
  ".metric-card",
  ".repair-status",
  ".operation-flow",
  ".check-row",
  ".report-card",
  ".bottom-actions"
].join(", ");

export function useScreenEntranceMotion(rootRef: RefObject<HTMLElement>, enabled = true) {
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
