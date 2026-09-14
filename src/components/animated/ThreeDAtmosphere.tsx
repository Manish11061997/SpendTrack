import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDAtmosphereProps {
  className?: string;
}

export const ThreeDAtmosphere: React.FC<ThreeDAtmosphereProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 25;

    // 2. High-performance alpha WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(renderer.domElement);

    // 3. Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const primaryLight = new THREE.PointLight(0x10b981, 2.5, 60);
    primaryLight.position.set(12, 10, 15);
    scene.add(primaryLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 2.0, 60);
    goldLight.position.set(-15, -12, 10);
    scene.add(goldLight);

    const tertiaryLight = new THREE.PointLight(0x8b5cf6, 1.8, 50);
    tertiaryLight.position.set(0, 15, -5);
    scene.add(tertiaryLight);

    // 4. Stardust Particles (Gold & Emerald Luxury Shimmer)
    const particleCount = 380;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const goldColor = new THREE.Color(0xf59e0b);
    const emeraldColor = new THREE.Color(0x10b981);
    const cyanColor = new THREE.Color(0x06b6d4);
    const whiteColor = new THREE.Color(0xffffff);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      particlePositions[idx] = (Math.random() - 0.5) * 55;
      particlePositions[idx + 1] = (Math.random() - 0.5) * 45;
      particlePositions[idx + 2] = (Math.random() - 0.5) * 35;

      const pick = Math.random();
      let col = whiteColor;
      if (pick < 0.4) col = goldColor;
      else if (pick < 0.75) col = emeraldColor;
      else if (pick < 0.9) col = cyanColor;

      particleColors[idx] = col.r;
      particleColors[idx + 1] = col.g;
      particleColors[idx + 2] = col.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    // Particle sprite texture generated procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 5. Floating Luxury Polyhedra & Rings
    const floatingGroup = new THREE.Group();
    scene.add(floatingGroup);

    const geometries = [
      new THREE.IcosahedronGeometry(1.2, 0),
      new THREE.OctahedronGeometry(1.0, 0),
      new THREE.TorusGeometry(1.2, 0.08, 12, 36),
      new THREE.DodecahedronGeometry(1.1, 0),
      new THREE.TetrahedronGeometry(1.3, 0),
    ];

    const luxuryMaterials = [
      // Wireframe Gold
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        wireframe: true,
        roughness: 0.3,
        metalness: 0.8,
        transparent: true,
        opacity: 0.45,
      }),
      // Translucent Emerald Glass
      new THREE.MeshStandardMaterial({
        color: 0x059669,
        metalness: 0.6,
        roughness: 0.2,
        transparent: true,
        opacity: 0.45,
      }),
      // Titanium Metallic Ring
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.2,
        metalness: 0.9,
        transparent: true,
        opacity: 0.4,
      }),
      // Wireframe Cyan
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        wireframe: true,
        roughness: 0.4,
        metalness: 0.7,
        transparent: true,
        opacity: 0.4,
      }),
    ];

    interface FloatingItem {
      mesh: THREE.Mesh;
      basePos: THREE.Vector3;
      rotSpeed: { x: number; y: number; z: number };
      floatSpeed: number;
      floatAmp: number;
      phase: number;
    }

    const floatingItems: FloatingItem[] = [];
    const numObjects = 10;

    for (let i = 0; i < numObjects; i++) {
      const geo = geometries[i % geometries.length];
      const mat = luxuryMaterials[i % luxuryMaterials.length];
      const mesh = new THREE.Mesh(geo, mat);

      // Distribute in a wide spherical shell away from center
      const angle = (i / numObjects) * Math.PI * 2;
      const radius = 12 + (i % 4) * 3;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 6;
      const y = Math.sin(angle) * (radius * 0.65) + (Math.random() - 0.5) * 6;
      const z = -6 + (Math.random() - 0.5) * 16;

      mesh.position.set(x, y, z);
      const scale = 0.65 + Math.random() * 0.6;
      mesh.scale.set(scale, scale, scale);

      floatingGroup.add(mesh);

      floatingItems.push({
        mesh,
        basePos: new THREE.Vector3(x, y, z),
        rotSpeed: {
          x: (Math.random() - 0.5) * 0.008,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.006,
        },
        floatSpeed: 0.6 + Math.random() * 0.8,
        floatAmp: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // 6. Smooth Mouse Parallax Tracking
    const handlePointerMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    // 7. Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 8. Visibility / Battery Conservation
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 9. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisibleRef.current) return;

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Lerp mouse coordinates for dynamic camera parallax
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.045;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.045;

      camera.position.x = mouseRef.current.x * 0.85;
      camera.position.y = mouseRef.current.y * 0.6;
      camera.lookAt(0, 0, 0);

      // Visible luxury stardust particle drift
      particles.rotation.y = elapsedTime * 0.018;
      particles.rotation.x = Math.sin(elapsedTime * 0.01) * 0.05;

      // Floating geometric prisms rotating & bobbing in 3D space
      floatingItems.forEach((item) => {
        item.mesh.rotation.x += item.rotSpeed.x * 0.9;
        item.mesh.rotation.y += item.rotSpeed.y * 0.9;
        item.mesh.rotation.z += item.rotSpeed.z * 0.9;

        item.mesh.position.y = item.basePos.y + Math.sin(elapsedTime * 0.5 + item.phase) * 0.24;
        item.mesh.position.x = item.basePos.x + Math.cos(elapsedTime * 0.4 + item.phase) * 0.16;
      });

      // Subtle light oscillation
      primaryLight.position.x = 12 + Math.sin(elapsedTime * 0.5) * 4;
      goldLight.position.y = -12 + Math.cos(elapsedTime * 0.4) * 4;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Clean Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      particleGeometry.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      geometries.forEach((g) => g.dispose());
      luxuryMaterials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    />
  );
};

export default ThreeDAtmosphere;
