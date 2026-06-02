import { useLayoutEffect, useState } from "react";
import { designCanvasHeight, designCanvasWidth } from "../lib/content";

export function useDesignCanvasScale() {
  const [designScale, setDesignScale] = useState(1);

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

  return designScale;
}
