import { useEffect, useRef } from 'react';

export default function AuthShell({ children }) {
  const canvasRef = useRef(null);

  const SENSE_RADIUS = 180;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width, height;
    let particles = [];
    let mouse = { x: null, y: null };
    const linkDistance = 120;
    const cursorLinkDistance = 100;
    let senseRadius = SENSE_RADIUS;
    let animationId;

    // R10 (§8.4): particle count scales with viewport area — desktop keeps
    // today's 220 cap, mobile drops to a floor of 40.
    const MIN_PARTICLES = 40;
    const MAX_PARTICLES = 220;
    const targetCount = (w, h) =>
      Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, Math.round((w * h) / 9000)));
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Cursor field only on fine pointers — a touch-drag must not spawn it.
    const finePointer =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: fine)').matches;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // Keep all math in CSS px while staying crisp on retina.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }
    }

    function spawnAdditional(count) {
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    }

    function init() {
      resize();
      particles = [];
      spawnAdditional(targetCount(width, height));
    }

    /** R10: all particles are interchangeable — grow by spawning, shrink by splicing. */
    function recomputePopulation() {
      const target = targetCount(width, height);
      if (target > particles.length) {
        spawnAdditional(target - particles.length);
      } else if (target < particles.length) {
        particles.splice(target);
      }
      // Dev-only visibility of the live count (§8.4 gate).
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`[particles] ${particles.length} (${width}x${height})`);
      }
    }

    let resizeTimer;
    function handleResize() {
      resize();
      particles.forEach((p) => {
        if (p.x > width) p.x = width;
        if (p.y > height) p.y = height;
      });
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(recomputePopulation, 200);
    }

    function paint() {
      ctx.clearRect(0, 0, width, height);
      const hasCursor = mouse.x !== null;

      const pToCursor = hasCursor ? new Array(particles.length) : null;
      if (hasCursor) {
        for (let i = 0; i < particles.length; i++) {
          const dx = mouse.x - particles[i].x;
          const dy = mouse.y - particles[i].y;
          pToCursor[i] = Math.sqrt(dx * dx + dy * dy);
        }
      }

      const cellSize = linkDistance;
      const gridCols = Math.ceil(width / cellSize);
      const grid = new Map();
      for (let i = 0; i < particles.length; i++) {
        const cx = Math.floor(particles[i].x / cellSize);
        const cy = Math.floor(particles[i].y / cellSize);
        const key = cy * gridCols + cx;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
      }

      for (let i = 0; i < particles.length; i++) {
        const cx = Math.floor(particles[i].x / cellSize);
        const cy = Math.floor(particles[i].y / cellSize);
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          for (let gx = cx - 1; gx <= cx + 1; gx++) {
            const key = gy * gridCols + gx;
            const cell = grid.get(key);
            if (!cell) continue;
            for (let k = 0; k < cell.length; k++) {
              const j = cell[k];
              if (j <= i) continue;
              const pdx = particles[i].x - particles[j].x;
              const pdy = particles[i].y - particles[j].y;
              const pd = Math.sqrt(pdx * pdx + pdy * pdy);
              if (pd < linkDistance) {
                const opacity = (1 - pd / linkDistance) * 0.5;
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
              }
            }
          }
        }
      }

      if (hasCursor) {
        for (let i = 0; i < particles.length; i++) {
          const d1 = pToCursor[i];
          if (d1 >= senseRadius) continue;

          const opacity = (1 - d1 / senseRadius) * 0.6;
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(particles[i].x, particles[i].y);
          ctx.stroke();

          for (let j = i + 1; j < particles.length; j++) {
            const d2 = pToCursor[j];
            if (d2 >= senseRadius) continue;
            const pdx = particles[i].x - particles[j].x;
            const pdy = particles[i].y - particles[j].y;
            const pd = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pd < cursorLinkDistance) {
              const avg = (d1 + d2) / 2;
              const meshOpacity = (1 - avg / senseRadius) * 0.5;
              ctx.strokeStyle = `rgba(255, 255, 255, ${meshOpacity})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
    }

    function animate() {
      paint();
      animationId = requestAnimationFrame(animate);
    }

    function handleMouseMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    function handleMouseOut(e) {
      if (!e.relatedTarget) {
        mouse.x = null;
        mouse.y = null;
      }
    }
    // Battery: skip work while the tab is hidden.
    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else if (!reducedMotion) {
        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(animate);
      }
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    if (finePointer) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseout', handleMouseOut);
    }

    init();
    if (reducedMotion) {
      // Accessibility: one static frame, no animation loop.
      paint();
    } else {
      animate();
    }

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (finePointer) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseout', handleMouseOut);
      }
    };
  }, []);

  return (
    <div className="split-login">
      <div className="background">
        <canvas ref={canvasRef} id="particleCanvas" />
      </div>

      <div className="login-wrapper">{children}</div>
    </div>
  );
}
