import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  fadeSpeed: number;
  hue: number;
  isFirefly: boolean;
  angle: number;
  spinSpeed: number;
}

export function AmbientNatureEffects({ count = 22, paused = false }: { count?: number; paused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (paused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Mouse pointer tracking for interactive repulsion
    let mouseX = -9999;
    let mouseY = -9999;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    };
    const handlePointerLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("mouseleave", handlePointerLeave);

    // Initialize particles
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const isFirefly = Math.random() > 0.45;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6 + (isFirefly ? 0 : 0.4),
        vy: (Math.random() - 0.5) * 0.5 + (isFirefly ? 0 : 0.3),
        size: isFirefly ? Math.random() * 2.5 + 1.5 : Math.random() * 4 + 3,
        opacity: Math.random() * 0.7 + 0.2,
        fadeSpeed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        hue: isFirefly ? Math.random() * 30 + 80 : Math.random() * 40 + 110, // gold/green
        isFirefly,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.03,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // Move particle
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spinSpeed;

        // Fade in / out oscillation
        p.opacity += p.fadeSpeed;
        if (p.opacity > 0.85 || p.opacity < 0.15) {
          p.fadeSpeed = -p.fadeSpeed;
        }

        // Wrap around borders
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Mouse avoidance (soft breeze away from cursor)
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 90;

        if (dist < maxDist && dist > 0) {
          const force = (1 - dist / maxDist) * 1.5;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }

        // Draw particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));

        if (p.isFirefly) {
          // Firefly with soft glowing aura
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${p.hue}, 95%, 70%)`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = `hsl(${p.hue}, 100%, 65%)`;
          ctx.fill();
        } else {
          // Drifting leaf petal
          ctx.rotate(p.angle);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.8, 0, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${p.hue}, 60%, 65%)`;
          ctx.fill();
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[12] h-full w-full"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
