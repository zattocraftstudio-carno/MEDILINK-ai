"use client";

import React, { useRef, useEffect } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
}

const CONNECTION_DIST = 80;
const PARTICLE_COUNT = 20;
// Phones get a lighter canvas.
const CONNECTION_DIST_MOBILE = 60;
const PARTICLE_COUNT_MOBILE = 10;
const MOUSE_RADIUS = 120;

export const HeroParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const count = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT;
    const connDist = isMobile ? CONNECTION_DIST_MOBILE : CONNECTION_DIST;

    function resizeCanvas() {
      // Cap at 2 — capping at 1 made the canvas blurry on every HiDPI screen.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const c = canvas;
      const cx = ctx;
      if (!c || !cx) return;
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
      const arr: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const r = Math.random() * 1.5 + 1;
        arr.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: r,
          baseRadius: r,
        });
      }
      particlesRef.current = arr;
    }

    let isVisible = true;
    // A named handler so the SAME function identity is used for add and
    // remove — a fresh arrow function in removeEventListener never matches,
    // so the listener was never detached.
    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) animate();
    };

    function animate() {
      if (!canvas || !ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isHovered = dist < MOUSE_RADIUS;
        p.radius = isHovered ? p.baseRadius + 1.5 : p.baseRadius;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? "#2BA89B" : "#17786F";
        ctx.globalAlpha = isHovered ? 0.8 : 0.5;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connDist) {
            const opacity = (1 - dist / connDist) * 0.3;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(23, 120, 111, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      if (isVisible) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-[1] opacity-50 pointer-events-none"
      style={{ willChange: "transform" }}
    />
  );
};

export default HeroParticleCanvas;
