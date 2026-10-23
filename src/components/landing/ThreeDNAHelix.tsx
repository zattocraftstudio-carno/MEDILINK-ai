"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

/*
 * A B-DNA-inspired double helix. The geometry is intentionally built from
 * continuous sugar-phosphate backbones and discrete, colour-coded base
 * pairs rather than a string of large beads:
 *
 *   • two smooth Catmull-Rom tube backbones
 *   • small sugar/phosphate nodes at every base pair
 *   • two half-rungs per pair, separated by a hydrogen-bond gap
 *   • A/T and C/G pairs use complementary muted colours
 *
 * It is framed as a complete helix (not a cropped close-up) and uses
 * transparent rendering so the hero gradient can flow underneath it
 * without a visible canvas edge.
 */
const BASE_PAIRS = 32;
const HELIX_RADIUS = 5.4;
const HELIX_HEIGHT = 22;
const TWIST = Math.PI * 2 * 2.8;
const BACKBONE_RADIUS = 0.13;
const NODE_RADIUS = 0.19;
const RUNG_RADIUS = 0.062;
const HYDROGEN_GAP = 0.22;

interface NucleotideDetail {
  name: string;
  symbol: string;
  type: "Purine" | "Pyrimidine";
  pairedWith: string;
  bonds: string;
  formula: string;
  functionDesc: string;
  medicalNote: string;
  color: string;
}

const NUCLEOTIDE_DATA: Record<string, NucleotideDetail> = {
  Adenine: {
    name: "Adenine",
    symbol: "A",
    type: "Purine",
    pairedWith: "Thymine (A = T)",
    bonds: "2 Hydrogen Bonds",
    formula: "C₅H₅N₅",
    functionDesc:
      "Core nucleotide driving genetic translation and the primary adenosine triphosphate (ATP) cellular energy currency.",
    medicalNote:
      "Critical cofactor in NAD+/FAD metabolic oxidation and RNA messenger synthesis.",
    color: "#2A9D8F",
  },
  Thymine: {
    name: "Thymine",
    symbol: "T",
    type: "Pyrimidine",
    pairedWith: "Adenine (T = A)",
    bonds: "2 Hydrogen Bonds",
    formula: "C₅H₆N₂O₂",
    functionDesc:
      "Grants DNA elevated enzymatic stability over RNA, shielding the genetic sequence against photochemical deterioration.",
    medicalNote:
      "UV-induced thymine dimers serve as major clinical targets in dermatology and DNA damage repair.",
    color: "#E6B566",
  },
  Cytosine: {
    name: "Cytosine",
    symbol: "C",
    type: "Pyrimidine",
    pairedWith: "Guanine (C ≡ G)",
    bonds: "3 Hydrogen Bonds",
    formula: "C₄H₅N₃O",
    functionDesc:
      "Forms triple-bonded stabilization and acts as the prime carrier for DNA methylation and epigenetic regulation.",
    medicalNote:
      "CpG island hypermethylation patterns are recognized clinical biomarkers in early cancer screening.",
    color: "#8B7BD8",
  },
  Guanine: {
    name: "Guanine",
    symbol: "G",
    type: "Purine",
    pairedWith: "Cytosine (G ≡ C)",
    bonds: "3 Hydrogen Bonds",
    formula: "C₅H₅N₅O",
    functionDesc:
      "High thermal stability nucleotide capable of forming four-stranded G-quadruplex structures safeguarding chromosome ends.",
    medicalNote:
      "Essential for telomeric integrity and genomic stability; studied extensively in oncology genetics.",
    color: "#E0796A",
  },
};

const BASE_SEQUENCE = ["Adenine", "Thymine", "Cytosine", "Guanine"] as const;
const COMPLEMENT: Record<string, string> = {
  Adenine: "Thymine",
  Thymine: "Adenine",
  Cytosine: "Guanine",
  Guanine: "Cytosine",
};

const BASE_COLORS: Record<string, number> = {
  Adenine: 0x2a9d8f,
  Thymine: 0xe6b566,
  Cytosine: 0x8b7bd8,
  Guanine: 0xe0796a,
};

interface BasePair {
  midX: number;
  midY: number;
  midZ: number;
  info: NucleotideDetail;
}

export const ThreeDNAHelix: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animIdRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [activeInfo, setActiveInfo] = useState<NucleotideDetail | null>(null);

  // The visual is only mounted from the `lg` breakpoint upward, matching the
  // `lg:block` wrapper below. Keeping the JS breakpoint in sync avoids running
  // a hidden WebGL scene on tablets.
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const container = containerRef.current;
    if (!container) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let dnaGroup: THREE.Group;
    let hoverRing: THREE.Mesh;
    let hoverRingMat: THREE.MeshBasicMaterial;
    let basePairs: BasePair[] = [];
    let pickMeshes: THREE.Object3D[] = [];

    const initScene = () => {
      if (!container) return;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        38,
        container.offsetWidth / container.offsetHeight,
        0.1,
        100
      );
      // A small negative X offset nudges the helix right of the text column
      // without shifting the canvas itself (which would recreate an edge).
      // The camera sits back far enough that the near-side edge of the helix
      // also stays inside the viewport; a closer camera made the top/bottom
      // base pairs look cut off because of perspective.
      camera.position.set(-1.0, 0, 41);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.domElement.className = "block h-full w-full";
      container.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf3fffb, 0x073c36, 1.15));
      scene.add(new THREE.AmbientLight(0xffffff, 0.28));

      const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.15);
      keyLight.position.set(-8, 10, 12);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xa7f0e2, 1.05);
      fillLight.position.set(10, -5, 8);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xe6fffb, 1.45);
      rimLight.position.set(3, 6, -12);
      scene.add(rimLight);

      const tealPointLight = new THREE.PointLight(0x2ba89b, 11, 48, 2);
      tealPointLight.position.set(-6, 1, 9);
      scene.add(tealPointLight);

      const backboneMatA = new THREE.MeshPhysicalMaterial({
        color: 0x0e5b55,
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.9,
        clearcoatRoughness: 0.16,
      });
      const backboneMatB = new THREE.MeshPhysicalMaterial({
        color: 0x2a8c80,
        roughness: 0.27,
        metalness: 0.18,
        clearcoat: 0.85,
        clearcoatRoughness: 0.18,
      });
      const baseMaterials: Record<string, THREE.MeshPhysicalMaterial> = {};
      for (const name of BASE_SEQUENCE) {
        baseMaterials[name] = new THREE.MeshPhysicalMaterial({
          color: BASE_COLORS[name],
          roughness: 0.34,
          metalness: 0.08,
          clearcoat: 0.6,
          clearcoatRoughness: 0.24,
        });
      }

      dnaGroup = new THREE.Group();
      dnaGroup.rotation.y = -0.38;
      scene.add(dnaGroup);

      basePairs = [];
      pickMeshes = [];

      const pointsA: THREE.Vector3[] = [];
      const pointsB: THREE.Vector3[] = [];
      for (let i = 0; i < BASE_PAIRS; i++) {
        const t = i / (BASE_PAIRS - 1);
        const angle = t * TWIST - 0.55;
        const y = (t - 0.5) * HELIX_HEIGHT;
        pointsA.push(
          new THREE.Vector3(
            Math.cos(angle) * HELIX_RADIUS,
            y,
            Math.sin(angle) * HELIX_RADIUS
          )
        );
        pointsB.push(
          new THREE.Vector3(
            Math.cos(angle + Math.PI) * HELIX_RADIUS,
            y,
            Math.sin(angle + Math.PI) * HELIX_RADIUS
          )
        );
      }

      const curveA = new THREE.CatmullRomCurve3(
        pointsA,
        false,
        "centripetal",
        0.5
      );
      const curveB = new THREE.CatmullRomCurve3(
        pointsB,
        false,
        "centripetal",
        0.5
      );
      dnaGroup.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(
            curveA,
            BASE_PAIRS * 5,
            BACKBONE_RADIUS,
            10,
            false
          ),
          backboneMatA
        )
      );
      dnaGroup.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(
            curveB,
            BASE_PAIRS * 5,
            BACKBONE_RADIUS,
            10,
            false
          ),
          backboneMatB
        )
      );

      const nodeGeo = new THREE.SphereGeometry(NODE_RADIUS, 18, 14);

      const makeRung = (
        start: THREE.Vector3,
        end: THREE.Vector3,
        material: THREE.Material,
        pairIndex: number
      ): THREE.Mesh | null => {
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        if (length < 0.001) return null;

        const geometry = new THREE.CylinderGeometry(
          RUNG_RADIUS,
          RUNG_RADIUS,
          length,
          8,
          1,
          false
        );
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(start).add(end).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize()
        );
        mesh.userData.pairIndex = pairIndex;
        return mesh;
      };

      for (let i = 0; i < BASE_PAIRS; i++) {
        const a = pointsA[i];
        const b = pointsB[i];
        const baseA = BASE_SEQUENCE[i % BASE_SEQUENCE.length];
        const baseB = COMPLEMENT[baseA];
        const info = NUCLEOTIDE_DATA[baseA];

        const nodeA = new THREE.Mesh(nodeGeo, backboneMatA);
        nodeA.position.copy(a);
        nodeA.userData.pairIndex = i;
        dnaGroup.add(nodeA);
        pickMeshes.push(nodeA);

        const nodeB = new THREE.Mesh(nodeGeo, backboneMatB);
        nodeB.position.copy(b);
        nodeB.userData.pairIndex = i;
        dnaGroup.add(nodeB);
        pickMeshes.push(nodeB);

        const mid = a.clone().add(b).multiplyScalar(0.5);
        const direction = b.clone().sub(a).normalize();
        const aEnd = mid.clone().addScaledVector(direction, -HYDROGEN_GAP);
        const bEnd = mid.clone().addScaledVector(direction, HYDROGEN_GAP);

        const rungA = makeRung(a, aEnd, baseMaterials[baseA], i);
        if (rungA) {
          dnaGroup.add(rungA);
          pickMeshes.push(rungA);
        }
        const rungB = makeRung(bEnd, b, baseMaterials[baseB], i);
        if (rungB) {
          dnaGroup.add(rungB);
          pickMeshes.push(rungB);
        }

        basePairs.push({
          midX: mid.x,
          midY: mid.y,
          midZ: mid.z,
          info,
        });
      }

      // A restrained halo that follows the hovered base pair. It is much
      // smaller than the old full-scene glow sphere and never reaches the
      // canvas boundary.
      const ringGeo = new THREE.RingGeometry(
        HELIX_RADIUS + 0.13,
        HELIX_RADIUS + 0.3,
        72
      );
      hoverRingMat = new THREE.MeshBasicMaterial({
        color: 0x9ce9dc,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      hoverRing = new THREE.Mesh(ringGeo, hoverRingMat);
      hoverRing.rotation.x = Math.PI / 2;
      dnaGroup.add(hoverRing);

      startAnimation();
    };

    let targetRotationSpeed = 0.0045;
    let currentRotationSpeed = 0.0045;
    let isHoveringDNA = false;
    let hoveredIndex = -1;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const clock = new THREE.Clock();

    const updateTooltipPosition = () => {
      const tooltip = tooltipRef.current;
      if (hoveredIndex === -1 || !tooltip) {
        tooltip?.classList.remove("visible");
        return;
      }
      const pair = basePairs[hoveredIndex];
      if (!pair) return;
      const vector = new THREE.Vector3(pair.midX, pair.midY, pair.midZ);
      vector.applyMatrix4(dnaGroup.matrixWorld);
      vector.project(camera);

      const rect = container.getBoundingClientRect();
      const rawX = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
      const rawY = (-(vector.y * 0.5) + 0.5) * rect.height + rect.top;

      const cardWidth = 300;
      const cardHeight = 240;
      const clampedX = Math.max(
        16,
        Math.min(window.innerWidth - cardWidth - 20, rawX + 24)
      );
      const clampedY = Math.max(
        80,
        Math.min(window.innerHeight - cardHeight - 20, rawY - 40)
      );

      tooltip.style.left = `${clampedX}px`;
      tooltip.style.top = `${clampedY}px`;
      tooltip.classList.add("visible");
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleMouseEnter = () => {
      isHoveringDNA = true;
      targetRotationSpeed = 0.0008;
    };

    const handleMouseLeave = () => {
      isHoveringDNA = false;
      targetRotationSpeed = 0.0045;
      hoveredIndex = -1;
      if (hoverRingMat) hoverRingMat.opacity = 0;
      tooltipRef.current?.classList.remove("visible");
      setActiveInfo(null);
    };

    const startAnimation = () => {
      renderer.domElement.addEventListener("mousemove", handleMouseMove);
      renderer.domElement.addEventListener("mouseenter", handleMouseEnter);
      renderer.domElement.addEventListener("mouseleave", handleMouseLeave);

      const animate = () => {
        animIdRef.current = requestAnimationFrame(animate);

        const elapsed = clock.getElapsedTime();
        currentRotationSpeed +=
          (targetRotationSpeed - currentRotationSpeed) * 0.045;
        dnaGroup.rotation.y += currentRotationSpeed;
        dnaGroup.rotation.z = Math.sin(elapsed * 0.32) * 0.018;
        dnaGroup.position.y = Math.sin(elapsed * 0.65) * 0.18;

        if (isHoveringDNA) {
          raycaster.setFromCamera(mouse, camera);
          const hits = raycaster.intersectObjects(pickMeshes, false);
          const hit = hits[0];
          const pairIndex = hit?.object.userData.pairIndex;

          if (typeof pairIndex === "number" && basePairs[pairIndex]) {
            if (hoveredIndex !== pairIndex) {
              hoveredIndex = pairIndex;
              setActiveInfo(basePairs[pairIndex].info);
            }
            hoverRing.position.set(0, basePairs[pairIndex].midY, 0);
            hoverRingMat.opacity = Math.min(
              0.22,
              hoverRingMat.opacity + 0.035
            );
          } else {
            hoveredIndex = -1;
            hoverRingMat.opacity = Math.max(0, hoverRingMat.opacity - 0.03);
          }
        } else {
          hoveredIndex = -1;
          if (hoverRingMat) {
            hoverRingMat.opacity = Math.max(0, hoverRingMat.opacity - 0.03);
          }
        }

        updateTooltipPosition();
        renderer.render(scene, camera);
      };

      animate();
    };

    const handleResize = () => {
      if (
        !container ||
        container.offsetWidth === 0 ||
        !camera ||
        !renderer
      ) {
        return;
      }
      camera.aspect = container.offsetWidth / container.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", updateTooltipPosition, {
      passive: true,
    });

    initScene();

    return () => {
      cancelAnimationFrame(animIdRef.current);
      if (renderer) {
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("mouseenter", handleMouseEnter);
        renderer.domElement.removeEventListener("mouseleave", handleMouseLeave);
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", updateTooltipPosition);
      if (scene) {
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.geometry) geometries.add(mesh.geometry);
          if (mesh.material) {
            const list = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            list.forEach((material) => materials.add(material));
          }
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
      }
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="absolute right-0 top-0 w-[50%] h-full z-[2] opacity-0 scale-[0.92] animate-[dnaMaterialize_1.2s_cubic-bezier(0.16,1,0.3,1)_0.8s_forwards] pointer-events-auto lg:block hidden cursor-grab active:cursor-grabbing"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 13%, black 100%)",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 13%, black 100%)",
        }}
      />

      <div
        ref={tooltipRef}
        className="fixed z-[30] pointer-events-none opacity-0 translate-y-3 scale-95 transition-all duration-300"
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {activeInfo && (
          <div className="w-[300px] bg-white/95 backdrop-blur-2xl border border-brand/25 rounded-2xl p-4 shadow-[0_16px_36px_rgba(23,120,111,0.2)] flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-brand/10 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                  style={{ background: activeInfo.color }}
                />
                <span className="font-heading font-extrabold text-[16px] text-text-primary">
                  {activeInfo.name}
                </span>
                <span className="font-sans text-[11px] font-bold text-text-muted/70 bg-bg-soft px-1.5 py-0.5 rounded">
                  {activeInfo.formula}
                </span>
              </div>
              <span
                className="font-sans text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: `${activeInfo.color}15`,
                  color: activeInfo.color,
                }}
              >
                {activeInfo.type}
              </span>
            </div>

            <div className="flex items-center justify-between text-[12px] bg-bg-mint px-2.5 py-1.5 rounded-lg border border-brand/10">
              <span className="font-sans font-semibold text-brand">
                {activeInfo.pairedWith}
              </span>
              <span className="font-sans text-text-muted text-[11px]">
                {activeInfo.bonds}
              </span>
            </div>

            <p className="font-sans text-[12px] text-text-muted leading-relaxed">
              {activeInfo.functionDesc}
            </p>

            <div className="border-t border-brand/10 pt-2 flex items-start gap-1.5 text-[11px] text-brand-dark">
              <span className="font-bold shrink-0 text-brand">⚡ Insight:</span>
              <span className="leading-snug">{activeInfo.medicalNote}</span>
            </div>

            <div className="text-[10px] text-text-muted/70 pt-1 text-center font-mono">
              B-DNA-inspired · 2.8-turn double helix
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .visible {
          opacity: 1 !important;
          transform: translateY(0) scale(1) !important;
        }
      `}</style>
    </>
  );
};

export default ThreeDNAHelix;
