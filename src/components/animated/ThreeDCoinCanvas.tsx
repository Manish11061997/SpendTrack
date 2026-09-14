import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, RotateCw, Coins } from 'lucide-react';

interface ThreeDCoinCanvasProps {
  currencySymbol?: string;
  className?: string;
}

export const ThreeDCoinCanvas: React.FC<ThreeDCoinCanvasProps> = ({
  currencySymbol = '₹',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const previousPointerRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const isFlippingRef = useRef(false);
  const [flipCount, setFlipCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth || 160;
    let height = container.clientHeight || 160;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.8);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 3. Studio Lighting (Warm Gold Specular)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffae0, 2.5);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f5a0, 1.4);
    rimLight.position.set(-4, -3, -2);
    scene.add(rimLight);

    const bottomFill = new THREE.PointLight(0xf59e0b, 1.8, 12);
    bottomFill.position.set(0, -3, 3);
    scene.add(bottomFill);

    // 4. Procedural High-Res Textures for Coin Front & Back
    const createFaceTexture = (isFront: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Background metallic radial sheen
      const radGrad = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
      radGrad.addColorStop(0, '#fef08a');
      radGrad.addColorStop(0.4, '#eab308');
      radGrad.addColorStop(0.85, '#ca8a04');
      radGrad.addColorStop(1, '#854d0e');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, 512, 512);

      // Outer beaded rim
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(256, 256, 238, 0, Math.PI * 2);
      ctx.stroke();

      // Inner circular boundary
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(256, 256, 222, 0, Math.PI * 2);
      ctx.stroke();

      if (isFront) {
        // "SPENDTRACK" Circular Legend
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 30px "Outfit", "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('• SPENDTRACK ULTRA •', 256, 80);

        // Center Monogram ST
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.font = '900 120px "Outfit", sans-serif';
        ctx.fillText('ST', 256, 260);

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#854d0e';
        ctx.font = 'bold 22px "Outfit", sans-serif';
        ctx.fillText('CLASSIC LUXURY', 256, 350);

        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#713f12';
        ctx.fillText('★★★★★', 256, 420);
      } else {
        // Reverse: Currency Crest
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 26px "Outfit", "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('• WEALTH PRESERVATION •', 256, 80);

        // Center Currency Symbol
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.font = '900 130px "Outfit", sans-serif';
        ctx.fillText(currencySymbol, 256, 260);

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#854d0e';
        ctx.font = 'bold 24px monospace';
        ctx.fillText('100% SECURE', 256, 360);

        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#713f12';
        ctx.fillText('EST. 2024', 256, 425);
      }

      return new THREE.CanvasTexture(canvas);
    };

    const frontTexture = createFaceTexture(true);
    const backTexture = createFaceTexture(false);

    // 5. Coin 3D Geometry & Materials
    const coinGroup = new THREE.Group();
    scene.add(coinGroup);

    const coinRadius = 1.45;
    const coinThickness = 0.22;
    const cylinderGeo = new THREE.CylinderGeometry(coinRadius, coinRadius, coinThickness, 48);

    // Metallic gold edge material (fluted edge look)
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.95,
      roughness: 0.25,
    });

    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTexture,
      metalness: 0.85,
      roughness: 0.25,
    });

    const backMat = new THREE.MeshStandardMaterial({
      map: backTexture,
      metalness: 0.85,
      roughness: 0.25,
    });

    // In Three.js cylinder materials: [edge, top (front), bottom (back)]
    const coinMesh = new THREE.Mesh(cylinderGeo, [edgeMat, frontMat, backMat]);
    coinMesh.rotation.x = Math.PI / 2; // Face forward towards camera
    coinGroup.add(coinMesh);

    // Initial subtle tilt
    coinGroup.rotation.y = 0.35;
    coinGroup.rotation.x = 0.2;

    // 6. Interactive Drag & Spin
    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      previousPointerRef.current = { x: e.clientX, y: e.clientY };
      velocityRef.current = { x: 0, y: 0 };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousPointerRef.current.x;
      const deltaY = e.clientY - previousPointerRef.current.y;

      coinGroup.rotation.y += deltaX * 0.016;
      coinGroup.rotation.x += deltaY * 0.012;

      velocityRef.current = {
        x: deltaX * 0.016,
        y: deltaY * 0.012,
      };

      previousPointerRef.current = { x: e.clientX, y: e.clientY };
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

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isDraggingRef.current && !isFlippingRef.current) {
        // Heavy gold momentum decay
        velocityRef.current.x *= 0.85;
        velocityRef.current.y *= 0.85;

        coinGroup.rotation.y += velocityRef.current.x;
        coinGroup.rotation.x += velocityRef.current.y;

        // Continuous graceful spin & floating bob catching light
        if (Math.abs(velocityRef.current.x) < 0.001 && Math.abs(velocityRef.current.y) < 0.001) {
          coinGroup.rotation.y += 0.012;
          coinMesh.position.y = Math.sin(clock.getElapsedTime() * 1.8) * 0.12;
        }
      }

      // Flip jump physics
      if (isFlippingRef.current) {
        coinGroup.rotation.x += 0.24;
        coinMesh.position.y = Math.sin(clock.getElapsedTime() * 8) * 0.35;
      } else {
        coinMesh.position.y = THREE.MathUtils.lerp(coinMesh.position.y, 0, 0.12);
      }

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

      cylinderGeo.dispose();
      edgeMat.dispose();
      frontMat.dispose();
      backMat.dispose();
      frontTexture.dispose();
      backTexture.dispose();
      renderer.dispose();
    };
  }, [currencySymbol]);

  const handleFlipCoin = () => {
    isFlippingRef.current = true;
    setFlipCount((prev) => prev + 1);
    setTimeout(() => {
      isFlippingRef.current = false;
    }, 1200);
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D Canvas */}
      <div
        ref={containerRef}
        className="w-36 h-36 sm:w-40 sm:h-40 cursor-grab active:cursor-grabbing"
        title="Drag to rotate 3D coin • Click Flip to toss"
      />

      {/* Interactive Micro Flip Button */}
      <button
        type="button"
        onClick={handleFlipCoin}
        className="mt-1 flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/90 dark:bg-black/70 border border-[#F59E0B]/30 hover:border-[#F59E0B]/60 text-xs font-bold text-[#F59E0B] shadow-md hover-lift transition-all cursor-pointer"
      >
        <Coins className="w-3.5 h-3.5" />
        <span>Flip Coin</span>
      </button>
    </div>
  );
};

export default ThreeDCoinCanvas;
