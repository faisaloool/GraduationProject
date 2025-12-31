import React, { useEffect, useMemo, useRef } from "react";

// High-performance particle canvas confined to its parent container.
// - Auto-resizes to parent via ResizeObserver
// - Mouse interaction uses container-relative coordinates (getBoundingClientRect)
// - Particles drift back to home positions with smooth easing (lerp)
export function AntigravityCanvas({ className = "" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  const stateRef = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    particles: [],
    mouseX: null,
    mouseY: null,
    mouseActive: false,
    // tuned constants
    radius: 130,
    maxPush: 22,
    returnLerp: 0.07,
    drift: 0.02,
  });

  const palette = useMemo(
    () => [
      "rgba(255,255,255,0.85)",
      "rgba(220,245,255,0.85)",
      "rgba(170,235,255,0.85)",
      "rgba(110,220,255,0.75)",
    ],
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const resizeToParent = () => {
      const rect = parent.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(rect.width));
      const nextHeight = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      const st = stateRef.current;
      const sizeChanged =
        st.width !== nextWidth || st.height !== nextHeight || st.dpr !== dpr;

      if (!sizeChanged) return;

      st.width = nextWidth;
      st.height = nextHeight;
      st.dpr = dpr;

      canvas.width = Math.floor(nextWidth * dpr);
      canvas.height = Math.floor(nextHeight * dpr);
      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildParticles(st);
    };

    const rebuildParticles = (st) => {
      const area = st.width * st.height;

      // Loose grid: scale spacing with size; cap particle count for performance.
      const baseSpacing = 26;
      const scale = Math.max(0.8, Math.min(1.35, Math.sqrt(area) / 900));
      let spacing = Math.max(10, Math.round(baseSpacing * scale));

      let cols = Math.max(4, Math.floor(st.width / spacing));
      let rows = Math.max(3, Math.floor(st.height / spacing));
      const maxParticles = 900;

      // IMPORTANT: Don't truncate rows (creates a visible empty band at the bottom).
      // Instead, increase spacing until the full grid fits within maxParticles.
      let total = cols * rows;
      let guard = 0;
      while (total > maxParticles && guard++ < 5) {
        const factor = Math.sqrt(total / maxParticles);
        spacing = Math.round(spacing * factor);
        cols = Math.max(4, Math.floor(st.width / spacing));
        rows = Math.max(3, Math.floor(st.height / spacing));
        total = cols * rows;
      }

      const particles = new Array(total);

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * (st.width / cols);
          const y = (r + 0.5) * (st.height / rows);

          // jitter home position slightly to avoid perfect grid look
          const jx = (Math.random() - 0.5) * (spacing * 0.55);
          const jy = (Math.random() - 0.5) * (spacing * 0.55);

          const size = 1 + Math.random() * 2; // 1–3px
          const color = palette[(Math.random() * palette.length) | 0];

          const hx = clamp(x + jx, 0, st.width);
          const hy = clamp(y + jy, 0, st.height);

          particles[idx++] = {
            hx,
            hy,
            x: hx,
            y: hy,
            vx: 0,
            vy: 0,
            size,
            color,
          };
        }
      }

      st.particles = particles;
    };

    const onPointerMove = (e) => {
      const st = stateRef.current;
      const rect = parent.getBoundingClientRect();
      st.mouseX = e.clientX - rect.left;
      st.mouseY = e.clientY - rect.top;
      st.mouseActive = true;
    };

    const onPointerLeave = () => {
      const st = stateRef.current;
      st.mouseActive = false;
      st.mouseX = null;
      st.mouseY = null;
    };

    resizeToParent();

    const ro = new ResizeObserver(() => resizeToParent());
    ro.observe(parent);

    // Pointer events are naturally container-relative (clientX/clientY + rect)
    parent.addEventListener("pointermove", onPointerMove, { passive: true });
    parent.addEventListener("pointerleave", onPointerLeave, { passive: true });

    let last = performance.now();

    const tick = (now) => {
      const st = stateRef.current;
      const dt = Math.min(32, now - last);
      last = now;

      // Clear
      ctx.clearRect(0, 0, st.width, st.height);

      const particles = st.particles;
      const mx = st.mouseX;
      const my = st.mouseY;
      const radius = st.radius;
      const r2 = radius * radius;

      // Frame-time scaling for smoother motion across slower frames
      const frameScale = dt / 16.67;
      const returnLerp = clamp01(st.returnLerp * frameScale);
      const drift = st.drift * frameScale;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Subtle wandering velocity (kept tiny)
        p.vx += (Math.random() - 0.5) * drift;
        p.vy += (Math.random() - 0.5) * drift;

        // Mouse "antigravity" push
        if (st.mouseActive && mx != null && my != null) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const d2 = dx * dx + dy * dy;

          if (d2 > 0.0001 && d2 < r2) {
            const d = Math.sqrt(d2);
            const t = 1 - d / radius; // 0..1
            const strength = t * t * st.maxPush;
            const nx = dx / d;
            const ny = dy / d;

            p.vx += nx * strength;
            p.vy += ny * strength;
          }
        }

        // Ease back toward home
        p.x = lerp(p.x, p.hx, returnLerp);
        p.y = lerp(p.y, p.hy, returnLerp);

        // Apply velocity with damping
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.84;
        p.vy *= 0.84;

        // Clamp to canvas bounds
        if (p.x < 0) {
          p.x = 0;
          p.vx *= -0.35;
        } else if (p.x > st.width) {
          p.x = st.width;
          p.vx *= -0.35;
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy *= -0.35;
        } else if (p.y > st.height) {
          p.y = st.height;
          p.vy *= -0.35;
        }

        // Render dot
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      parent.removeEventListener("pointermove", onPointerMove);
      parent.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [palette]);

  return <canvas ref={canvasRef} className={className} />;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
