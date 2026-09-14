import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Sparkles, Layers } from 'lucide-react';

interface CategoryRingData {
  name: string;
  value: number;
  color: string;
  percent: number;
}

interface ThreeDDonutCanvasProps {
  categories?: CategoryRingData[];
  totalSpent?: number;
  totalBudget?: number;
  currencySymbol?: string;
  className?: string;
}

const DEFAULT_CATEGORIES: CategoryRingData[] = [
  { name: 'Housing', value: 25000, color: '#8B5CF6', percent: 30 },
  { name: 'Food', value: 21000, color: '#10B981', percent: 25 },
  { name: 'Travel', value: 15000, color: '#06B6D4', percent: 18 },
  { name: 'Shopping', value: 12000, color: '#F59E0B', percent: 14 },
  { name: 'Utilities', value: 8000, color: '#EC4899', percent: 10 },
];

export const ThreeDDonutCanvas: React.FC<ThreeDDonutCanvasProps> = ({
  categories = DEFAULT_CATEGORIES,
  totalSpent = 81000,
  totalBudget = 125000,
  currencySymbol = '₹',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const previousPointerRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const [hoveredSlice, setHoveredSlice] = useState<CategoryRingData | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);

  const overallPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 68;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth || 320;
    let height = container.clientHeight || 220;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.8, 5.2);
    camera.lookAt(0, 0, 0);

    // 2. High-performance alpha WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 10, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f5a0, 1.4);
    rimLight.position.set(-6, -2, -4);
    scene.add(rimLight);

    const goldFill = new THREE.PointLight(0xf59e0b, 1.2, 15);
    goldFill.position.set(0, -3, 3);
    scene.add(goldFill);

    // 4. Donut Group & Slices
    const donutGroup = new THREE.Group();
    scene.add(donutGroup);
    // Initial slight isometric tilt
    donutGroup.rotation.x = 0.55;
    donutGroup.rotation.y = -0.3;

    // Build 3D Pie Arcs
    const slices: { mesh: THREE.Mesh; data: CategoryRingData; basePos: THREE.Vector3; dir: THREE.Vector3 }[] = [];
    const totalVal = categories.reduce((sum, c) => sum + Math.max(1, c.value), 0);

    const innerRadius = 1.15;
    const outerRadius = 1.85;
    const thickness = 0.42;

    let startAngle = 0;
    const gap = 0.04; // small angular separation

    categories.forEach((cat) => {
      const sliceAngle = (Math.max(1, cat.value) / totalVal) * Math.PI * 2;
      const effectiveAngle = Math.max(0.1, sliceAngle - gap);

      // Create 2D arc shape
      const shape = new THREE.Shape();
      const segments = 32;
      const aStart = startAngle + gap / 2;
      const aEnd = aStart + effectiveAngle;

      // Outer arc
      for (let i = 0; i <= segments; i++) {
        const theta = aStart + (i / segments) * (aEnd - aStart);
        const px = Math.cos(theta) * outerRadius;
        const py = Math.sin(theta) * outerRadius;
        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }
      // Inner arc in reverse
      for (let i = segments; i >= 0; i--) {
        const theta = aStart + (i / segments) * (aEnd - aStart);
        const px = Math.cos(theta) * innerRadius;
        const py = Math.sin(theta) * innerRadius;
        shape.lineTo(px, py);
      }
      shape.closePath();

      // Extrude with smooth rounded bevel
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: thickness,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.04,
        bevelThickness: 0.04,
      };

      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.center(); // Center local anchor for clean lifting

      // Metallic physical material with vibrant category color
      const hexColor = parseInt(cat.color.replace('#', ''), 16) || 0x10b981;
      const mat = new THREE.MeshPhysicalMaterial({
        color: hexColor,
        metalness: 0.35,
        roughness: 0.22,
        clearcoat: 0.6,
        clearcoatRoughness: 0.15,
        reflectivity: 0.8,
        emissive: hexColor,
        emissiveIntensity: 0.15,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Position slice relative to donut center
      const midAngle = aStart + effectiveAngle / 2;
      const midRadius = (innerRadius + outerRadius) / 2;
      const posX = Math.cos(midAngle) * midRadius;
      const posY = Math.sin(midAngle) * midRadius;

      mesh.position.set(posX, posY, 0);
      mesh.userData = { category: cat };

      donutGroup.add(mesh);

      slices.push({
        mesh,
        data: cat,
        basePos: new THREE.Vector3(posX, posY, 0),
        dir: new THREE.Vector3(Math.cos(midAngle), Math.sin(midAngle), 0).normalize(),
      });

      startAngle += sliceAngle;
    });

    // 5. Central Glass Core Disc
    const coreGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.25, 32);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.1,
      transmission: 0.5,
      thickness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.rotation.x = Math.PI / 2;
    donutGroup.add(coreMesh);

    // Inner core glowing rim
    const rimGeo = new THREE.TorusGeometry(0.86, 0.03, 16, 48);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x00f5a0,
      emissive: 0x00f5a0,
      emissiveIntensity: 0.9,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    donutGroup.add(rimMesh);

    // 6. Interactive Drag & Spin Controls
    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      setAutoRotate(false);
      previousPointerRef.current = { x: e.clientX, y: e.clientY };
      velocityRef.current = { x: 0, y: 0 };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousPointerRef.current.x;
        const deltaY = e.clientY - previousPointerRef.current.y;

        donutGroup.rotation.y += deltaX * 0.012;
        donutGroup.rotation.x += deltaY * 0.012;

        // Clamp pitch so it doesn't flip completely upside down
        donutGroup.rotation.x = Math.max(-0.8, Math.min(1.2, donutGroup.rotation.x));

        velocityRef.current = {
          x: deltaX * 0.012,
          y: deltaY * 0.012,
        };

        previousPointerRef.current = { x: e.clientX, y: e.clientY };
      }

      // Raycast for hover detection
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      const intersects = raycaster.intersectObjects(slices.map(s => s.mesh));
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const hitData = hitMesh.userData.category as CategoryRingData;
        setHoveredSlice(hitData);
      } else {
        setHoveredSlice(null);
      }
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 7. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 8. Render Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Weighted Hydraulic Inertia & Damping
      if (!isDraggingRef.current) {
        velocityRef.current.x *= 0.88;
        velocityRef.current.y *= 0.88;

        donutGroup.rotation.y += velocityRef.current.x;
        donutGroup.rotation.x += velocityRef.current.y;
        donutGroup.rotation.x = Math.max(-0.8, Math.min(1.2, donutGroup.rotation.x));

        // Only rotate when user explicitly enables Orbit
        if (autoRotate && Math.abs(velocityRef.current.x) < 0.001) {
          donutGroup.rotation.y += 0.004;
        }
      }

      // Smooth, Weighted Slice Pop on Hover
      slices.forEach((item) => {
        const isHovered = hoveredSlice && hoveredSlice.name === item.data.name;
        const targetLift = isHovered ? 0.15 : 0;
        const targetScale = isHovered ? 1.03 : 1.0;

        const targetPos = item.basePos.clone().add(item.dir.clone().multiplyScalar(targetLift));
        item.mesh.position.lerp(targetPos, 0.12);
        item.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

        // Boost emissive intensity when hovered
        const meshMat = item.mesh.material as THREE.MeshPhysicalMaterial;
        meshMat.emissiveIntensity = THREE.MathUtils.lerp(meshMat.emissiveIntensity, isHovered ? 0.35 : 0.15, 0.12);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 9. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();

      if (container.contains(domElem)) {
        container.removeChild(domElem);
      }

      slices.forEach((s) => {
        s.mesh.geometry.dispose();
        if (Array.isArray(s.mesh.material)) s.mesh.material.forEach((m) => m.dispose());
        else s.mesh.material.dispose();
      });
      coreGeo.dispose();
      coreMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      renderer.dispose();
    };
  }, [categories, autoRotate, hoveredSlice]);

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-44 sm:h-48 cursor-grab active:cursor-grabbing relative"
      />

      {/* Center Floating Readout Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center flex flex-col items-center z-10">
        <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase opacity-90">
          Capacity
        </span>
        <span className="text-xl sm:text-2xl font-black font-mono text-on-surface drop-shadow-md">
          {overallPct}%
        </span>
        <span className="text-[8px] text-on-surface-variant font-semibold">
          Used
        </span>
      </div>

      {/* Interactive Floating Hover Pill */}
      {hoveredSlice && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-surface-container-highest/95 dark:bg-black/90 border border-outline-variant/30 dark:border-white/10 shadow-xl flex items-center gap-2 backdrop-blur-md animate-fade-in pointer-events-none">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredSlice.color }} />
          <span className="text-xs font-bold text-on-surface">{hoveredSlice.name}</span>
          <span className="text-xs font-mono font-black text-primary">
            {currencySymbol}{hoveredSlice.value.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant">({hoveredSlice.percent}%)</span>
        </div>
      )}

      {/* Bottom Micro Controls */}
      <div className="w-full flex items-center justify-between px-2 pt-1 border-t border-outline-variant/20 dark:border-white/5 text-[10px] text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-primary" />
          <span>Drag to orbit 360°</span>
        </div>
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
            autoRotate ? 'bg-primary/15 text-primary font-bold' : 'hover:text-on-surface'
          }`}
          title="Toggle Auto Orbit"
        >
          <RotateCw className={`w-2.5 h-2.5 ${autoRotate ? 'animate-spin-slow' : ''}`} />
          <span>{autoRotate ? 'Orbit On' : 'Paused'}</span>
        </button>
      </div>
    </div>
  );
};

export default ThreeDDonutCanvas;
