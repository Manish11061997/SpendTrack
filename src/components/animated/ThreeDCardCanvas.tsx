import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Sparkles, Shield, Maximize2, Minimize2 } from 'lucide-react';

interface ThreeDCardCanvasProps {
  balance?: string | number;
  currencySymbol?: string;
  cardHolder?: string;
  className?: string;
  compact?: boolean;
}

export const ThreeDCardCanvas: React.FC<ThreeDCardCanvasProps> = ({
  balance = '84,250',
  currencySymbol = '₹',
  cardHolder = 'ALEXANDER CHEN',
  className = '',
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const [metalFinish, setMetalFinish] = useState<'titanium' | 'gold' | 'emerald' | 'obsidian'>('titanium');
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 260;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.z = compact ? 5.5 : 4.8;

    // 2. Renderer with antialiasing and alpha
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

    // 3. Card 3D Rounded Box Geometry (Extruded Shape with Bevel)
    const cardWidth = 3.37;
    const cardHeight = 2.125;
    const radius = 0.15;
    const thickness = 0.05;

    const shape = new THREE.Shape();
    const x = -cardWidth / 2;
    const y = -cardHeight / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + cardWidth - radius, y);
    shape.quadraticCurveTo(x + cardWidth, y, x + cardWidth, y + radius);
    shape.lineTo(x + cardWidth, y + cardHeight - radius);
    shape.quadraticCurveTo(x + cardWidth, y + cardHeight, x + cardWidth - radius, y + cardHeight);
    shape.lineTo(x + radius, y + cardHeight);
    shape.quadraticCurveTo(x, y + cardHeight, x, y + cardHeight - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();

    // 4. Create Dynamic Front Texture via HTML5 Canvas
    const createFrontTexture = (finish: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 646;
      const ctx = canvas.getContext('2d')!;

      // Background Gradient
      let grad = ctx.createLinearGradient(0, 0, 1024, 646);
      if (finish === 'gold') {
        grad.addColorStop(0, '#1c1508');
        grad.addColorStop(0.5, '#2e210b');
        grad.addColorStop(1, '#150f05');
      } else if (finish === 'emerald') {
        grad.addColorStop(0, '#041d14');
        grad.addColorStop(0.5, '#062d1f');
        grad.addColorStop(1, '#02120c');
      } else if (finish === 'obsidian') {
        grad.addColorStop(0, '#0a0a0c');
        grad.addColorStop(0.5, '#121316');
        grad.addColorStop(1, '#08080a');
      } else {
        // Titanium default
        grad.addColorStop(0, '#151921');
        grad.addColorStop(0.5, '#1e2430');
        grad.addColorStop(1, '#0d1017');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 646);

      // Subtle Brushed Lines Pattern
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      for (let i = 0; i < 646; i += 3) {
        ctx.fillRect(0, i, 1024, 1);
      }

      // Metallic Diagonal Sheen Ribbon
      let sheen = ctx.createLinearGradient(150, 0, 850, 646);
      sheen.addColorStop(0, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.4, 'rgba(255,255,255,0.04)');
      sheen.addColorStop(0.5, 'rgba(0, 245, 160, 0.08)');
      sheen.addColorStop(0.6, 'rgba(255,255,255,0.04)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, 1024, 646);

      // Header: SpendTrack Brand
      ctx.fillStyle = finish === 'gold' ? '#FBBF24' : finish === 'emerald' ? '#34D399' : '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('SPENDTRACK', 70, 95);

      ctx.fillStyle = finish === 'gold' ? '#F59E0B' : '#00F5A0';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('TITANIUM VAULT', 70, 125);

      // Top Right: Contactless Symbol
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(930, 90, 15, -0.6, 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(930, 90, 25, -0.6, 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(930, 90, 35, -0.6, 0.6);
      ctx.stroke();

      // Golden EMV Chip
      const chipGrad = ctx.createLinearGradient(70, 190, 190, 280);
      chipGrad.addColorStop(0, '#FDE047');
      chipGrad.addColorStop(0.5, '#CA8A04');
      chipGrad.addColorStop(1, '#EAB308');
      ctx.fillStyle = chipGrad;
      ctx.beginPath();
      ctx.roundRect(70, 190, 120, 90, 12);
      ctx.fill();
      ctx.strokeStyle = '#854D0E';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Chip micro-etching
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(110, 190); ctx.lineTo(110, 280);
      ctx.moveTo(150, 190); ctx.lineTo(150, 280);
      ctx.moveTo(70, 235); ctx.lineTo(190, 235);
      ctx.stroke();

      // Card Number: 4532  ••••  ••••  8892
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 36px monospace';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillText('4532   ••••   ••••   8892', 70, 375);
      ctx.shadowColor = 'transparent';

      // Balance Highlight Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('ACTIVE BALANCE', 70, 470);

      // Balance Value
      ctx.fillStyle = finish === 'gold' ? '#FDE047' : '#00F5A0';
      ctx.font = '900 52px monospace';
      ctx.fillText(`${currencySymbol}${balance}`, 70, 530);

      // Cardholder Name (Bottom Left)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(cardHolder.toUpperCase(), 70, 595);

      // Expiry & Network Logo (Bottom Right)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('EXP 09/29', 750, 595);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 8;
      return texture;
    };

    // 5. Create Back Texture via Canvas
    const createBackTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 646;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#0f131a';
      ctx.fillRect(0, 0, 1024, 646);

      // Magnetic Stripe
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 70, 1024, 110);

      // Signature Strip
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(70, 240, 600, 70);

      // CVV
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold italic 24px monospace';
      ctx.fillText('CVV 782', 550, 285);

      // Holographic Security Patch
      const holoGrad = ctx.createLinearGradient(750, 240, 930, 310);
      holoGrad.addColorStop(0, '#38BDF8');
      holoGrad.addColorStop(0.3, '#A855F7');
      holoGrad.addColorStop(0.7, '#EC4899');
      holoGrad.addColorStop(1, '#10B981');
      ctx.fillStyle = holoGrad;
      ctx.beginPath();
      ctx.roundRect(750, 240, 180, 70, 8);
      ctx.fill();

      // Info Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '14px sans-serif';
      ctx.fillText('SpendTrack Ultra Secured Ledger • Unauthorized use prohibited', 70, 380);
      ctx.fillText('256-Bit Military Grade Client Encryption Active', 70, 410);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 8;
      return texture;
    };

    // 6. Materials
    const frontMat = new THREE.MeshStandardMaterial({
      map: createFrontTexture(metalFinish),
      metalness: metalFinish === 'obsidian' ? 0.3 : 0.75,
      roughness: metalFinish === 'obsidian' ? 0.4 : 0.25,
    });

    const backMat = new THREE.MeshStandardMaterial({
      map: createBackTexture(),
      metalness: 0.5,
      roughness: 0.4,
    });

    const edgeMat = new THREE.MeshStandardMaterial({
      color: metalFinish === 'gold' ? 0xd4af37 : metalFinish === 'emerald' ? 0x059669 : 0x475569,
      metalness: 0.9,
      roughness: 0.2,
    });

    // Mesh setup
    const materials = [edgeMat, frontMat, backMat];
    const cardMesh = new THREE.Mesh(geometry, materials);
    scene.add(cardMesh);

    // Initial slight angle
    cardMesh.rotation.x = 0.2;
    cardMesh.rotation.y = -0.3;

    // 7. Dynamic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(
      metalFinish === 'emerald' ? 0x00f5a0 : metalFinish === 'gold' ? 0xfbbf24 : 0x38bdf8,
      12,
      20
    );
    pointLight.position.set(3, 3, 4);
    scene.add(pointLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 2.5);
    rimLight.position.set(-5, -3, 3);
    scene.add(rimLight);

    const backRim = new THREE.DirectionalLight(0x6366f1, 2.0);
    backRim.position.set(0, 4, -4);
    scene.add(backRim);

    // 8. Interaction Event Listeners (Drag to rotate in 3D)
    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      setIsInteracting(true);
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      // Dynamic light moves with cursor
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointLight.position.x = normX * 4;
      pointLight.position.y = normY * 4;

      if (!isDraggingRef.current) {
        // Idle hover tilt
        cardMesh.rotation.y = THREE.MathUtils.lerp(cardMesh.rotation.y, normX * 0.45, 0.08);
        cardMesh.rotation.x = THREE.MathUtils.lerp(cardMesh.rotation.x, -normY * 0.35 + 0.1, 0.08);
        return;
      }

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      velocityRef.current = { x: deltaX * 0.008, y: deltaY * 0.008 };
      cardMesh.rotation.y += velocityRef.current.x;
      cardMesh.rotation.x += velocityRef.current.y;

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      setIsInteracting(false);
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 9. Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Weighted Titanium/Gold Inertia decay
      if (!isDraggingRef.current) {
        velocityRef.current.x *= 0.88;
        velocityRef.current.y *= 0.88;
        cardMesh.rotation.y += velocityRef.current.x;
        cardMesh.rotation.x += velocityRef.current.y;

        // Extremely calm, resting breathing oscillation
        cardMesh.position.y = Math.sin(elapsedTime * 0.75) * 0.022;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 10. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      geometry.dispose();
      frontMat.dispose();
      backMat.dispose();
      edgeMat.dispose();
      renderer.dispose();
    };
  }, [metalFinish, balance, currencySymbol, cardHolder, compact]);

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D WebGL Canvas Container */}
      <div 
        ref={containerRef} 
        className="w-full h-64 sm:h-72 cursor-grab active:cursor-grabbing relative z-10"
        title="Drag in any direction to spin in full 3D space"
      />

      {/* Floating 3D Controls Bar */}
      <div className="flex items-center justify-between w-full px-4 py-2 bg-surface-container-high/40 dark:bg-white/5 backdrop-blur-md rounded-xl border border-outline-variant/30 text-xs mt-1 z-20">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Finish:</span>
          {(['titanium', 'gold', 'emerald', 'obsidian'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setMetalFinish(f)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md capitalize transition-all cursor-pointer ${
                metalFinish === f
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-variant/40'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-on-surface-variant text-[11px] font-mono">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary animate-spin-slow" />
            <span>WebGL 3D</span>
          </span>
          <span className="text-[9px] text-on-surface-variant/70 hidden sm:inline">• Drag to 360° Spin</span>
        </div>
      </div>
    </div>
  );
};

export default ThreeDCardCanvas;
