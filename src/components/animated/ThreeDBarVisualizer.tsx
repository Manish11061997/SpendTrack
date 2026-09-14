import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Sparkles, Box, Info } from 'lucide-react';

export interface CategoryBarData {
  name: string;
  spent: number;
  limit: number;
  color: string;
}

interface ThreeDBarVisualizerProps {
  categories?: CategoryBarData[];
  currencySymbol?: string;
  className?: string;
}

const DEFAULT_CATEGORIES: CategoryBarData[] = [
  { name: 'Food', spent: 21000, limit: 25000, color: '#10B981' },
  { name: 'Transport', spent: 15000, limit: 15000, color: '#06B6D4' },
  { name: 'Rent', spent: 30000, limit: 40000, color: '#8B5CF6' },
  { name: 'Shopping', spent: 14000, limit: 18000, color: '#F59E0B' },
  { name: 'Other', spent: 7500, limit: 10000, color: '#EC4899' },
];

export const ThreeDBarVisualizer: React.FC<ThreeDBarVisualizerProps> = ({
  categories = DEFAULT_CATEGORIES,
  currencySymbol = '₹',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const previousPointerRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const [hoveredBar, setHoveredBar] = useState<CategoryBarData | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth || 400;
    let height = container.clientHeight || 280;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 7.5);
    camera.lookAt(0, 0.8, 0);

    // 2. High-performance WebGL Renderer
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(6, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x00f5a0, 1.5, 20);
    fillLight.position.set(-6, 2, -4);
    scene.add(fillLight);

    const goldAccent = new THREE.PointLight(0xf59e0b, 1.2, 20);
    goldAccent.position.set(4, 1, -5);
    scene.add(goldAccent);

    // 4. World Group
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);
    worldGroup.rotation.y = -0.35;

    // Obsidian Reflective Mirror Base Plate
    const floorGeo = new THREE.CylinderGeometry(4.8, 5.0, 0.15, 48);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x070a10,
      metalness: 0.9,
      roughness: 0.18,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.075;
    floorMesh.receiveShadow = true;
    worldGroup.add(floorMesh);

    // Outer Neon Ring on Platform
    const ringGeo = new THREE.TorusGeometry(4.82, 0.025, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    worldGroup.add(ringMesh);

    // 5. 3D Monolith Columns
    const maxVal = Math.max(1, ...categories.map((c) => Math.max(c.spent, c.limit)));
    const maxHeight = 2.8;

    const barMeshes: {
      mesh: THREE.Mesh;
      cap: THREE.Mesh;
      limitMarker: THREE.Mesh;
      data: CategoryBarData;
      baseHeight: number;
    }[] = [];

    const numBars = categories.length;
    const spacing = 1.4;
    const startX = -((numBars - 1) * spacing) / 2;

    categories.forEach((cat, index) => {
      const heightVal = Math.max(0.2, (cat.spent / maxVal) * maxHeight);
      const limitHeightVal = Math.max(0.2, (cat.limit / maxVal) * maxHeight);
      const hexColor = parseInt(cat.color.replace('#', ''), 16) || 0x10b981;

      // Pillar Box
      const barWidth = 0.72;
      const barDepth = 0.72;
      const geo = new THREE.BoxGeometry(barWidth, heightVal, barDepth);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.25,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(startX + index * spacing, heightVal / 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { category: cat };
      worldGroup.add(mesh);

      // Glowing Neon Cap
      const capGeo = new THREE.BoxGeometry(barWidth + 0.04, 0.08, barDepth + 0.04);
      const capMat = new THREE.MeshStandardMaterial({
        color: hexColor,
        emissive: hexColor,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.5,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(startX + index * spacing, heightVal + 0.04, 0);
      cap.castShadow = true;
      worldGroup.add(cap);

      // Semi-transparent Budget Limit Marker Frame
      const limitGeo = new THREE.BoxGeometry(barWidth + 0.12, 0.04, barDepth + 0.12);
      const limitMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.6,
      });
      const limitMarker = new THREE.Mesh(limitGeo, limitMat);
      limitMarker.position.set(startX + index * spacing, limitHeightVal, 0);
      worldGroup.add(limitMarker);

      barMeshes.push({
        mesh,
        cap,
        limitMarker,
        data: cat,
        baseHeight: heightVal,
      });
    });

    // 6. Interactive Drag Controls
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

        worldGroup.rotation.y += deltaX * 0.01;
        worldGroup.rotation.x += deltaY * 0.006;
        worldGroup.rotation.x = Math.max(-0.2, Math.min(0.6, worldGroup.rotation.x));

        velocityRef.current = {
          x: deltaX * 0.01,
          y: deltaY * 0.006,
        };

        previousPointerRef.current = { x: e.clientX, y: e.clientY };
      }

      // Raycaster for pillar hover
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      const intersects = raycaster.intersectObjects(barMeshes.map(b => b.mesh));
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const hitData = hitMesh.userData.category as CategoryBarData;
        setHoveredBar(hitData);
      } else {
        setHoveredBar(null);
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

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isDraggingRef.current) {
        velocityRef.current.x *= 0.88;
        velocityRef.current.y *= 0.88;

        worldGroup.rotation.y += velocityRef.current.x;
        worldGroup.rotation.x += velocityRef.current.y;
        worldGroup.rotation.x = Math.max(-0.2, Math.min(0.6, worldGroup.rotation.x));

        if (autoRotate && Math.abs(velocityRef.current.x) < 0.001) {
          worldGroup.rotation.y += 0.003;
        }
      }

      // Smooth, Weighted Hover Glow & Lift
      barMeshes.forEach((item) => {
        const isHovered = hoveredBar && hoveredBar.name === item.data.name;
        const capMat = item.cap.material as THREE.MeshStandardMaterial;
        const targetIntensity = isHovered ? 1.2 : 0.75;
        capMat.emissiveIntensity = THREE.MathUtils.lerp(capMat.emissiveIntensity, targetIntensity, 0.12);

        const targetScale = isHovered ? 1.04 : 1.0;
        item.mesh.scale.lerp(new THREE.Vector3(targetScale, 1.0, targetScale), 0.12);
        item.cap.scale.lerp(new THREE.Vector3(targetScale, 1.0, targetScale), 0.12);
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

      barMeshes.forEach((b) => {
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        b.cap.geometry.dispose();
        (b.cap.material as THREE.Material).dispose();
        b.limitMarker.geometry.dispose();
        (b.limitMarker.material as THREE.Material).dispose();
      });
      floorGeo.dispose();
      floorMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, [categories, autoRotate, hoveredBar]);

  return (
    <div className={`relative w-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D Canvas Viewport */}
      <div
        ref={containerRef}
        className="w-full h-64 sm:h-72 cursor-grab active:cursor-grabbing relative"
      />

      {/* Floating Hover Information Card */}
      {hoveredBar && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-xl bg-surface-container-highest/95 dark:bg-black/90 border border-outline-variant/30 dark:border-white/10 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredBar.color }} />
          <div>
            <div className="text-xs font-bold text-on-surface">{hoveredBar.name}</div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="font-black text-primary">
                {currencySymbol}{hoveredBar.spent.toLocaleString()}
              </span>
              <span className="text-on-surface-variant">/</span>
              <span className="text-on-surface-variant">
                {currencySymbol}{hoveredBar.limit.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            {hoveredBar.limit > 0 ? Math.round((hoveredBar.spent / hoveredBar.limit) * 100) : 100}%
          </div>
        </div>
      )}

      {/* Bottom Status & Controls */}
      <div className="w-full flex items-center justify-between px-3 pt-2 border-t border-outline-variant/20 dark:border-white/5 text-[10px] text-on-surface-variant">
        <div className="flex items-center gap-2">
          <Box className="w-3 h-3 text-primary" />
          <span>Interactive 3D Monoliths • Drag to rotate scene</span>
        </div>
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
            autoRotate ? 'bg-primary/15 text-primary font-bold' : 'hover:text-on-surface'
          }`}
        >
          <RotateCw className={`w-2.5 h-2.5 ${autoRotate ? 'animate-spin-slow' : ''}`} />
          <span>{autoRotate ? 'Orbit On' : 'Orbit Paused'}</span>
        </button>
      </div>
    </div>
  );
};

export default ThreeDBarVisualizer;
