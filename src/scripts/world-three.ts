import * as THREE from "three";

const MOBILE_BREAKPOINT = 760;

export function initWorldScene() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-world-scene]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!canvas || reduceMotion.matches || !window.WebGLRenderingContext) return () => {};

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
  } catch {
    canvas.hidden = true;
    return () => {};
  }

  const mobile = window.innerWidth < MOBILE_BREAKPOINT;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07090f, mobile ? 0.055 : 0.038);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 70);
  camera.position.set(0, 0, 12);

  const count = mobile ? 70 : 150;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(0x67f1d1), new THREE.Color(0xffd76a), new THREE.Color(0x8e74ff)];

  for (let index = 0; index < count; index += 1) {
    const radius = 4 + Math.random() * 11;
    const angle = Math.random() * Math.PI * 2;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 14;
    positions[index * 3 + 2] = -Math.random() * 18;
    const color = palette[index % palette.length];
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: mobile ? 0.075 : 0.095,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  scene.add(points);

  const rings = new THREE.Group();
  [
    [5.2, 0x67f1d1, 0.12],
    [7.4, 0xffd76a, 0.08],
    [9.1, 0x8e74ff, 0.07],
  ].forEach(([radius, color, opacity], index) => {
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 96 }, (_, point) => {
          const angle = (point / 96) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle) * Number(radius), Math.sin(angle) * Number(radius), -2 - index * 2);
        }),
      ),
      new THREE.LineBasicMaterial({ color: Number(color), transparent: true, opacity: Number(opacity) }),
    );
    ring.rotation.x = Math.PI * (0.36 + index * 0.08);
    ring.rotation.z = index * 0.52;
    rings.add(ring);
  });
  scene.add(rings);

  const pointer = new THREE.Vector2();
  const targetPointer = new THREE.Vector2();
  let scrollProgress = 0;
  let frame = 0;
  let running = true;

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.65));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const updateScroll = () => {
    const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollProgress = window.scrollY / range;
  };
  const updatePointer = (event: PointerEvent) => {
    targetPointer.set((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
  };
  const updateVisibility = () => {
    running = !document.hidden;
    if (running) frame = requestAnimationFrame(render);
  };
  const render = (time: number) => {
    if (!running) return;
    pointer.lerp(targetPointer, 0.035);
    const elapsed = time * 0.00008;
    points.rotation.y = elapsed + scrollProgress * Math.PI * 0.85;
    points.rotation.x = pointer.y * 0.08 + scrollProgress * 0.18;
    rings.rotation.y = -elapsed * 0.65 + pointer.x * 0.12;
    rings.rotation.z = scrollProgress * 0.55;
    camera.position.x += (pointer.x * 0.46 - camera.position.x) * 0.025;
    camera.position.y += (-pointer.y * 0.32 - camera.position.y) * 0.025;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };

  resize();
  updateScroll();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("pointermove", updatePointer, { passive: true });
  document.addEventListener("visibilitychange", updateVisibility);
  frame = requestAnimationFrame(render);

  return () => {
    running = false;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", updateScroll);
    window.removeEventListener("pointermove", updatePointer);
    document.removeEventListener("visibilitychange", updateVisibility);
    geometry.dispose();
    points.material.dispose();
    rings.children.forEach((child) => {
      const line = child as THREE.Line;
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    renderer.dispose();
  };
}
