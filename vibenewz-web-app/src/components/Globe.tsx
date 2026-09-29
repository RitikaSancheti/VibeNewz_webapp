// ============================================================
// Globe.tsx — an interactive 3D globe drawn on a <canvas>.
//   • drag to spin (with momentum), arrow keys work too
//   • + / − buttons to zoom
//   • slowly auto-rotates when you're not touching it
//   • real coastlines (see utils/worldLand.ts) drawn as dots
//   • a glowing pin for every country that has stories; click one to open it
// No extra libraries: it's plain maths (orthographic projection).
// ============================================================

import { useEffect, useRef } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, shadows } from "../theme";
import { LandDots, loadLandDots } from "../utils/worldLand";

export interface GlobePin {
  key: string; // e.g. "philippines"
  label: string; // e.g. "Philippines"
  lat: number;
  lng: number;
  count: number; // stories from this country
}

interface Props {
  size: number;
  pins: GlobePin[];
  selectedKey: string | null;
  // Change `focus.id` to make the globe turn to a new spot
  focus: { lat: number; lng: number; id: number } | null;
  onSelectPin: (key: string) => void;
}

const DEG = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180; // → -180..180

export function Globe({ size, pins, selectedKey, focus, onSelectPin }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<LandDots | null>(null);
  const screenPinsRef = useRef<{ key: string; x: number; y: number }[]>([]); // where pins were drawn (for clicks)
  const propsRef = useRef({ pins, selectedKey, onSelectPin });
  propsRef.current = { pins, selectedKey, onSelectPin };

  // Everything that changes every frame lives in one mutable object
  const view = useRef({
    lng: focus?.lng ?? 100, // longitude at the centre of the globe
    lat: clamp(focus?.lat ?? 15, -60, 60),
    zoom: 1,
    vx: 0,
    vy: 0,
    dragging: false,
    moved: 0,
    lastX: 0,
    lastY: 0,
    lastTouch: 0,
    hoverKey: null as string | null,
    target: null as { lat: number; lng: number } | null,
  });

  // Load coastline dots once
  useEffect(() => {
    let alive = true;
    loadLandDots().then((d) => {
      if (alive) dotsRef.current = d;
    });
    return () => {
      alive = false;
    };
  }, []);

  // Turn to a new focus point
  useEffect(() => {
    if (focus)
      view.current.target = { lat: clamp(focus.lat, -60, 60), lng: focus.lng };
  }, [focus?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Animation + drawing loop ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    let frame = 0;

    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      const v = view.current;

      // motion: go to target → momentum → gentle auto-spin
      if (!v.dragging) {
        if (v.target) {
          const dl = wrap(v.target.lng - v.lng);
          const dp = v.target.lat - v.lat;
          v.lng += dl * 0.08;
          v.lat += dp * 0.08;
          if (Math.abs(dl) < 0.15 && Math.abs(dp) < 0.15) v.target = null;
        } else if (Math.abs(v.vx) > 0.01 || Math.abs(v.vy) > 0.01) {
          v.lng += v.vx;
          v.lat = clamp(v.lat + v.vy, -70, 70);
          v.vx *= 0.94;
          v.vy *= 0.94;
        } else if (t - v.lastTouch > 2500) {
          v.lng += 0.05;
        }
      }
      v.lng = wrap(v.lng);

      // skip drawing while the page is hidden (another tab/screen)
      if (document.hidden || canvas.offsetParent === null) return;
      draw(ctx, dpr, t);
    };

    const draw = (ctx: CanvasRenderingContext2D, dpr: number, t: number) => {
      const v = view.current;
      const W = size;
      const cx = W / 2;
      const cy = W / 2;
      const R = (W / 2) * 0.82 * v.zoom;
      const l0 = v.lng * DEG;
      const sinP0 = Math.sin(v.lat * DEG);
      const cosP0 = Math.cos(v.lat * DEG);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, W);

      // soft sunshine glow around the planet
      const glow = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.2);
      glow.addColorStop(0, "rgba(255, 213, 79, 0.32)");
      glow.addColorStop(1, "rgba(255, 213, 79, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // ocean sphere, lit from the top-left
      const ocean = ctx.createRadialGradient(
        cx - R * 0.4,
        cy - R * 0.45,
        R * 0.05,
        cx,
        cy,
        R,
      );
      ocean.addColorStop(0, "#FFFEF6");
      ocean.addColorStop(0.5, "#F6EFCF");
      ocean.addColorStop(0.85, "#E4DBAE");
      ocean.addColorStop(1, "#C9C08E");
      ctx.fillStyle = ocean;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // project (lat, lng) → screen; z > 0 means "facing us"
      const project = (sinLat: number, cosLat: number, lng: number) => {
        const d = lng - l0;
        const cosD = Math.cos(d);
        return {
          z: sinP0 * sinLat + cosP0 * cosLat * cosD,
          x: cx + R * cosLat * Math.sin(d),
          y: cy - R * (cosP0 * sinLat - sinP0 * cosLat * cosD),
        };
      };

      // latitude / longitude lines
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const line = (pts: [number, number][]) => {
        let prev: { x: number; y: number; z: number } | null = null;
        for (const [lat, lng] of pts) {
          const p = project(
            Math.sin(lat * DEG),
            Math.cos(lat * DEG),
            lng * DEG,
          );
          if (p.z > 0 && prev && prev.z > 0) {
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
          }
          prev = p;
        }
      };
      for (let lng = -180; lng < 180; lng += 30) {
        const pts: [number, number][] = [];
        for (let lat = -90; lat <= 90; lat += 4) pts.push([lat, lng]);
        line(pts);
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const pts: [number, number][] = [];
        for (let lng = -180; lng <= 180; lng += 4) pts.push([lat, lng]);
        line(pts);
      }
      ctx.stroke();

      // land dots (brighter + bigger when facing us)
      const dots = dotsRef.current;
      if (dots) {
        const base = Math.max(1.1, R * 0.0078);
        const buckets: Path2D[] = [new Path2D(), new Path2D(), new Path2D()];
        for (let i = 0; i < dots.length; i += 3) {
          const p = project(dots[i], dots[i + 1], dots[i + 2]);
          if (p.z <= 0.02) continue;
          const r = base * (0.55 + 0.45 * p.z);
          const b = p.z < 0.3 ? 0 : p.z < 0.65 ? 1 : 2;
          buckets[b].moveTo(p.x + r, p.y);
          buckets[b].arc(p.x, p.y, r, 0, Math.PI * 2);
        }
        [
          "rgba(163,180,84,0.45)",
          "rgba(163,180,84,0.75)",
          "rgba(140,158,62,0.95)",
        ].forEach((c, k) => {
          ctx.fillStyle = c;
          ctx.fill(buckets[k]);
        });
      }

      // edge shading for depth
      const shade = ctx.createRadialGradient(
        cx - R * 0.25,
        cy - R * 0.3,
        R * 0.55,
        cx,
        cy,
        R,
      );
      shade.addColorStop(0, "rgba(90, 80, 30, 0)");
      shade.addColorStop(1, "rgba(90, 80, 30, 0.22)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(230, 217, 174, 0.9)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // story pins
      const { pins, selectedKey } = propsRef.current;
      const screenPins = pins
        .map((pin, idx) => ({
          pin,
          idx,
          ...project(
            Math.sin(pin.lat * DEG),
            Math.cos(pin.lat * DEG),
            pin.lng * DEG,
          ),
        }))
        .filter((p) => p.z > 0.05)
        .sort((a, b) => a.z - b.z);
      screenPinsRef.current = screenPins.map((p) => ({
        key: p.pin.key,
        x: p.x,
        y: p.y,
      }));

      for (const p of screenPins) {
        const active = p.pin.key === selectedKey;
        const phase = (((t / 1700 + p.idx * 0.27) % 1) + 1) % 1;
        ctx.fillStyle = `rgba(255, 213, 79, ${0.55 * (1 - phase)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7 + phase * (active ? 14 : 10), 0, Math.PI * 2);
        ctx.fill();
        if (active) {
          ctx.strokeStyle = colors.primaryDark;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(p.x, p.y, active ? 7.5 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.sunshine;
        ctx.beginPath();
        ctx.arc(p.x, p.y, active ? 4.5 : 3.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // label for the selected (or hovered) pin
      const labelKey = view.current.hoverKey || selectedKey;
      const lp = screenPins.find((p) => p.pin.key === labelKey);
      if (lp) {
        const text =
          lp.pin.count > 1
            ? `${lp.pin.label} · ${lp.pin.count} stories`
            : lp.pin.label;
        ctx.font = "600 12px 'DM Sans', system-ui, sans-serif";
        const w = ctx.measureText(text).width + 22;
        const x = clamp(lp.x - w / 2, 4, W - w - 4);
        const y = lp.y + 16;
        ctx.fillStyle = "#2F3526";
        ctx.beginPath();
        ctx.roundRect(x, y, w, 24, 12);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + 11, y + 12.5);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [size]);

  const pinAt = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: string | null = null;
    let bestD = 16 * 16;
    for (const p of screenPinsRef.current) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p.key;
      }
    }
    return best;
  };

  // ---- Pointer handlers (mouse, pen and touch) ----
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    v.dragging = true;
    v.moved = 0;
    v.lastX = e.clientX;
    v.lastY = e.clientY;
    v.vx = v.vy = 0;
    v.target = null;
    v.lastTouch = performance.now();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    if (!v.dragging) {
      const key = pinAt(e.clientX, e.clientY);
      v.hoverKey = key;
      e.currentTarget.style.cursor = key ? "pointer" : "grab";
      return;
    }
    const dx = e.clientX - v.lastX;
    const dy = e.clientY - v.lastY;
    v.lastX = e.clientX;
    v.lastY = e.clientY;
    v.moved += Math.abs(dx) + Math.abs(dy);
    const R = (size / 2) * 0.82 * v.zoom;
    const degPerPx = 180 / Math.PI / R;
    v.vx = -dx * degPerPx;
    v.vy = dy * degPerPx;
    v.lng += v.vx;
    v.lat = clamp(v.lat + v.vy, -70, 70);
    v.lastTouch = performance.now();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    v.dragging = false;
    v.lastTouch = performance.now();
    e.currentTarget.style.cursor = "grab";
    if (v.moved < 5) {
      // it was a click, not a drag
      v.vx = v.vy = 0;
      const key = pinAt(e.clientX, e.clientY);
      if (key) propsRef.current.onSelectPin(key);
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const v = view.current;
    const step = 12;
    if (e.key === "ArrowLeft") v.target = { lat: v.lat, lng: v.lng - step };
    else if (e.key === "ArrowRight")
      v.target = { lat: v.lat, lng: v.lng + step };
    else if (e.key === "ArrowUp")
      v.target = { lat: clamp(v.lat + step, -60, 60), lng: v.lng };
    else if (e.key === "ArrowDown")
      v.target = { lat: clamp(v.lat - step, -60, 60), lng: v.lng };
    else if (e.key === "+" || e.key === "=") zoomBy(0.15);
    else if (e.key === "-") zoomBy(-0.15);
    else return;
    v.lastTouch = performance.now();
    e.preventDefault();
  };

  const zoomBy = (d: number) => {
    const v = view.current;
    v.zoom = clamp(v.zoom + d, 0.8, 1.6);
    v.lastTouch = performance.now();
  };

  return (
    <View style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        tabIndex={0}
        aria-label="Interactive globe. Drag to spin, click a glowing pin to open stories from that country."
        style={{
          width: size,
          height: size,
          cursor: "grab",
          touchAction: "none",
          outline: "none",
          display: "block",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => (view.current.hoverKey = null)}
        onKeyDown={onKeyDown}
      />
      <View style={styles.zoom}>
        <Pressable
          onPress={() => zoomBy(0.15)}
          style={[styles.zoomBtn, shadows.pill]}
          accessibilityLabel="Zoom in"
        >
          <Feather name="plus" size={16} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => zoomBy(-0.15)}
          style={[styles.zoomBtn, shadows.pill]}
          accessibilityLabel="Zoom out"
        >
          <Feather name="minus" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zoom: { position: "absolute", right: 4, bottom: 8, gap: 8 },
  zoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
