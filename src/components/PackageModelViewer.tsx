import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type PackageModelViewerProps = {
  modelSrc: string;
  fallbackModelSrc?: string;
  backReveal?: number;
  className?: string;
  onReady?: () => void;
  onError?: () => void;
};

export type PackageModelViewerHandle = {
  setBackReveal: (value: number) => void;
};

const FRONT_ROTATION_Y = 0.13;
const BACK_QR_ROTATION_Y = Math.PI + 0.02;
const MAX_RENDER_PIXEL_RATIO = 2;
const MAX_TEXTURE_ANISOTROPY = 4;
const REVEAL_SETTLE_EPSILON = 0.0015;
const packageModelSceneCache = new Map<string, Promise<THREE.Object3D>>();

function getSafeRenderPixelRatio() {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const shortSide = Math.min(window.innerWidth || 0, window.innerHeight || 0);
  const cpuCores = navigator.hardwareConcurrency || 4;
  const mobileRenderCap = shortSide > 0 && shortSide <= 480 ? 1.5 : MAX_RENDER_PIXEL_RATIO;
  const lowCoreRenderCap = cpuCores <= 4 ? 1.5 : MAX_RENDER_PIXEL_RATIO;

  return Math.min(devicePixelRatio, mobileRenderCap, lowCoreRenderCap, MAX_RENDER_PIXEL_RATIO);
}

function loadPackageModelScene(src: string) {
  const cachedScene = packageModelSceneCache.get(src);
  if (cachedScene) return cachedScene;

  const loader = new GLTFLoader();
  const scenePromise = loader.loadAsync(src)
    .then((gltf) => gltf.scene)
    .catch((error) => {
      packageModelSceneCache.delete(src);
      throw error;
    });

  packageModelSceneCache.set(src, scenePromise);
  return scenePromise;
}

function preparePackageModelRoot(modelRoot: THREE.Object3D) {
  if (!modelRoot.userData.packageModelPrepared) {
    const box = new THREE.Box3().setFromObject(modelRoot);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;

    modelRoot.position.sub(center);
    modelRoot.userData.baseScale = 2.08 / maxDimension;
    modelRoot.userData.packageModelPrepared = true;
  }

  const baseScale = Number(modelRoot.userData.baseScale) || 1;
  modelRoot.scale.setScalar(baseScale);
  modelRoot.rotation.set(-0.04, FRONT_ROTATION_Y, 0.01);
}

export function preloadPackageModel(modelSrc: string) {
  if (!modelSrc) return Promise.resolve();

  return loadPackageModelScene(modelSrc).then((modelRoot) => {
    if (!modelRoot.parent) {
      preparePackageModelRoot(modelRoot);
    }
  });
}

function sharpenMaterialTextures(object: THREE.Object3D, renderer: THREE.WebGLRenderer) {
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), MAX_TEXTURE_ANISOTROPY);

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (!mesh.isMesh) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) {
          value.anisotropy = anisotropy;
          value.magFilter = THREE.LinearFilter;
          value.minFilter = THREE.LinearMipmapLinearFilter;
          value.needsUpdate = true;
        }
      });
    });
  });
}

export const PackageModelViewer = forwardRef<PackageModelViewerHandle, PackageModelViewerProps>(function PackageModelViewer({
  modelSrc,
  fallbackModelSrc,
  backReveal = 0,
  className = "",
  onReady,
  onError
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const backRevealRef = useRef(backReveal);
  const requestRenderRef = useRef<() => void>(() => undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const setBackRevealValue = (value: number) => {
    backRevealRef.current = Math.min(1, Math.max(0, value));
    requestRenderRef.current();
  };

  useImperativeHandle(ref, () => ({
    setBackReveal: setBackRevealValue
  }));

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    setBackRevealValue(backReveal);
  }, [backReveal]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let disposed = false;
    let frameId = 0;
    let loadingFallback = false;
    let modelRoot: THREE.Object3D | null = null;
    let renderedReveal = backRevealRef.current;
    setStatus("loading");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(25, 1, 0.01, 100);
    camera.position.set(0, 0.08, 6.6);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(getSafeRenderPixelRatio());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.className = "package-model-canvas";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x1f2d28, 1.26);
    const frontSoftLight = new THREE.DirectionalLight(0xfff8ec, 1.12);
    frontSoftLight.position.set(0.1, 1.9, 5.8);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.48);
    keyLight.position.set(3.3, 4.4, 5.4);
    const fillLight = new THREE.DirectionalLight(0xf0fff5, 0.88);
    fillLight.position.set(-3.8, 2.5, 4.4);
    const rimLight = new THREE.DirectionalLight(0xc8ffe4, 0.34);
    rimLight.position.set(-3.4, 1.5, -2.8);
    scene.add(ambientLight, keyLight, fillLight, frontSoftLight, rimLight);

    const updateModelTransform = () => {
      if (!modelRoot) return false;

      const targetReveal = backRevealRef.current;
      const revealDelta = Math.abs(renderedReveal - targetReveal);
      renderedReveal =
        revealDelta < REVEAL_SETTLE_EPSILON
          ? targetReveal
          : THREE.MathUtils.lerp(renderedReveal, targetReveal, 0.07);
      const zoomProgress = Math.pow(THREE.MathUtils.smoothstep(renderedReveal, 0.28, 1), 1.22);
      const baseScale = Number(modelRoot.userData.baseScale) || 1;

      modelRoot.rotation.y = THREE.MathUtils.lerp(FRONT_ROTATION_Y, BACK_QR_ROTATION_Y, renderedReveal);
      modelRoot.scale.setScalar(baseScale * THREE.MathUtils.lerp(1.14, 1.88, zoomProgress));
      camera.position.z = THREE.MathUtils.lerp(6.48, 4.52, zoomProgress);

      return Math.abs(renderedReveal - targetReveal) >= REVEAL_SETTLE_EPSILON;
    };

    const renderFrame = () => {
      frameId = 0;
      if (disposed) return;

      const shouldContinue = updateModelTransform();
      renderer.render(scene, camera);

      if (shouldContinue) {
        requestRenderRef.current();
      }
    };

    const requestRender = () => {
      if (disposed || frameId) return;
      frameId = window.requestAnimationFrame(renderFrame);
    };

    requestRenderRef.current = requestRender;

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setPixelRatio(getSafeRenderPixelRatio());
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      requestRender();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const loadModel = (src: string) => {
      void loadPackageModelScene(src)
      .then((loadedModelRoot) => {
        if (disposed) {
          return;
        }

        modelRoot = loadedModelRoot;
        modelRoot.parent?.remove(modelRoot);
        sharpenMaterialTextures(modelRoot, renderer);
        preparePackageModelRoot(modelRoot);
        scene.add(modelRoot);
        setStatus("ready");
        onReadyRef.current?.();
        requestRender();
      })
      .catch(() => {
        if (!loadingFallback && fallbackModelSrc && fallbackModelSrc !== src) {
          loadingFallback = true;
          loadModel(fallbackModelSrc);
          return;
        }

        if (!disposed) {
          setStatus("error");
          onErrorRef.current?.();
        }
      });
    };

    loadModel(modelSrc);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestRender();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    requestRender();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      requestRenderRef.current = () => undefined;
      resizeObserver.disconnect();
      if (modelRoot) {
        scene.remove(modelRoot);
        modelRoot = null;
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [fallbackModelSrc, modelSrc]);

  return (
    <div className={`package-model-viewer ${className}`} ref={containerRef}>
      {status !== "ready" && (
        <span className={`package-model-status ${status === "error" ? "error" : ""}`}>
          {status === "error" ? "3D 模型加载失败" : "3D 包装载入中"}
        </span>
      )}
    </div>
  );
});
