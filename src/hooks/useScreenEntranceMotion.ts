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

const selectMotionTargets = (root: HTMLElement, selector: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(selector));

export function useScreenEntranceMotion(rootRef: RefObject<HTMLElement>, enabled = true) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const entranceTargets = selectMotionTargets(root, screenEntranceTargets);
        const topBarTargets = selectMotionTargets(root, ".top-bar");
        const pageTitleTargets = selectMotionTargets(root, ".page-title");
        const panelTargets = selectMotionTargets(
          root,
          ".panel, .live-card, .metric-card, .repair-status, .check-row, .report-card"
        );
        const bottomTargets = selectMotionTargets(root, ".flow-nav, .bottom-actions");

        if (entranceTargets.length > 0) {
          gsap.set(entranceTargets, { willChange: "transform, opacity" });
        }

        const timeline = gsap.timeline({
          defaults: {
            duration: 0.42,
            ease: "power2.out",
            overwrite: "auto"
          },
          onComplete: () => {
            if (entranceTargets.length > 0) {
              gsap.set(entranceTargets, {
                clearProps: "transform,opacity,visibility,willChange"
              });
            }
          }
        });

        if (topBarTargets.length > 0) {
          timeline.from(topBarTargets, { y: -12, autoAlpha: 0, duration: 0.32 }, 0);
        }

        if (pageTitleTargets.length > 0) {
          timeline.from(pageTitleTargets, { y: 14, autoAlpha: 0 }, 0.06);
        }

        if (panelTargets.length > 0) {
          timeline.from(
            panelTargets,
            {
              y: 16,
              autoAlpha: 0,
              stagger: { each: 0.035, from: "start" }
            },
            0.14
          );
        }

        if (bottomTargets.length > 0) {
          timeline.from(bottomTargets, { y: 16, autoAlpha: 0, duration: 0.36 }, 0.24);
        }
      }, root);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, [rootRef, enabled]);
}
