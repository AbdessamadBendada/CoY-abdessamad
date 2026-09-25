"use client";

import { useEffect, useRef } from "react";

export function AnimatedGradientBg({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Orb 1 — teal
      const x1 = width * 0.3 + Math.sin(t * 0.5) * width * 0.15;
      const y1 = height * 0.3 + Math.cos(t * 0.4) * height * 0.15;
      const g1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, width * 0.5);
      g1.addColorStop(0, "rgba(37, 99, 235, 0.12)");
      g1.addColorStop(1, "rgba(37, 99, 235, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      // Orb 2 — teal-dark
      const x2 = width * 0.7 + Math.cos(t * 0.3) * width * 0.12;
      const y2 = height * 0.6 + Math.sin(t * 0.35) * height * 0.12;
      const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, width * 0.4);
      g2.addColorStop(0, "rgba(37, 99, 235, 0.08)");
      g2.addColorStop(1, "rgba(37, 99, 235, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);

      // Orb 3 — coral subtle
      const x3 = width * 0.5 + Math.sin(t * 0.2 + 1) * width * 0.1;
      const y3 = height * 0.15 + Math.cos(t * 0.25) * height * 0.08;
      const g3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, width * 0.25);
      g3.addColorStop(0, "rgba(232, 93, 74, 0.06)");
      g3.addColorStop(1, "rgba(232, 93, 74, 0)");
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, width, height);

      t += 0.008;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
