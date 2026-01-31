import { useEffect, useRef } from "react";
import { navigate } from "astro:transitions/client";

const styles = `
.cursor-pixel-core{position:fixed;top:0;left:0;width:4px;height:4px;background:#f48529;pointer-events:none;z-index:10001;will-change:transform}
.cursor-pixel-glow{position:fixed;top:0;left:0;width:4px;height:4px;background:rgba(244,133,41,.4);pointer-events:none;z-index:10000;will-change:transform;box-shadow:4px 0 rgba(244,133,41,.3),-4px 0 rgba(244,133,41,.3),0 4px rgba(244,133,41,.3),0 -4px rgba(244,133,41,.3);transition:box-shadow .2s,background .2s}
.cursor-pixel-glow.hover{background:rgba(244,133,41,.6);box-shadow:4px 0 rgba(244,133,41,.5),-4px 0 rgba(244,133,41,.5),0 4px rgba(244,133,41,.5),0 -4px rgba(244,133,41,.5)}
.click-area{position:fixed;inset:0;z-index:9998;cursor:none}
.transition-canvas{position:fixed;inset:0;z-index:9999;pointer-events:none;display:none}
.transition-canvas.active{display:block}
`;

const POOL = 60;
const DEG_TO_RAD = 0.01745329;
const BIAS_ANGLE = 210 * DEG_TO_RAD;
const TWO_PI = 6.283185;

const px = new Float32Array(POOL);
const py = new Float32Array(POOL);
const vx = new Float32Array(POOL);
const vy = new Float32Array(POOL);
const sz = new Float32Array(POOL);
const life = new Float32Array(POOL);
const white = new Uint8Array(POOL);

const ORANGE = "#f48529";
const WHITE = "#fff";
const TRAIL_BLACK = "rgba(0,0,0,.1)";

export default function MobaiCursor() {
	const refs = useRef<{
		core: HTMLDivElement | null;
		glow: HTMLDivElement | null;
		canvas: HTMLCanvasElement | null;
		raf: number;
		active: boolean;
		mx: number;
		my: number;
		cx: number;
		cy: number;
		gx: number;
		gy: number;
		t: number;
	}>({
		core: null,
		glow: null,
		canvas: null,
		raf: 0,
		active: false,
		mx: -99,
		my: -99,
		cx: -99,
		cy: -99,
		gx: -99,
		gy: -99,
		t: 0,
	});

	useEffect(() => {
		const style = document.createElement("style");
		style.textContent = styles;
		document.head.appendChild(style);

		const r = refs.current;
		const canvas = r.canvas;
		if (!canvas) return;

		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) return;

		let w = 0,
			h = 0;

		const resize = () => {
			w = canvas.width = window.innerWidth;
			h = canvas.height = window.innerHeight;
		};
		resize();

		const spawn = () => {
			const ox = r.mx,
				oy = r.my;
			for (let i = 0; i < POOL; i++) {
				const a = Math.random() * TWO_PI * 0.7 + BIAS_ANGLE * 0.3;
				const f = 5 + Math.random() * 12;
				px[i] = ox;
				py[i] = oy;
				vx[i] = Math.cos(a) * f;
				vy[i] = Math.sin(a) * f;
				sz[i] = 2 + Math.random() * 3;
				life[i] = 1;
				white[i] = Math.random() > 0.7 ? 1 : 0;
			}
		};

		const click = () => {
			if (r.active) return;
			r.active = true;
			r.t = 0;
			canvas.classList.add("active");
			if (r.core) r.core.style.opacity = "0";
			if (r.glow) r.glow.style.opacity = "0";
			spawn();
			setTimeout(() => {
				navigate("/start/01-preface/");
			}, 900);
		};

		const area = document.querySelector(".click-area");
		if (!area) return;

		const onMove = (e: MouseEvent) => {
			r.mx = e.clientX;
			r.my = e.clientY;
		};
		const onEnter = () => {
			if (r.glow) r.glow.classList.add("hover");
		};
		const onLeave = () => {
			if (r.glow) r.glow.classList.remove("hover");
		};

		const onTouchMove = (e: TouchEvent) => {
			if (e.touches.length > 0) {
				r.mx = e.touches[0].clientX;
				r.my = e.touches[0].clientY;
			}
		};
		const onTouchStart = (e: TouchEvent) => {
			if (e.touches.length > 0) {
				r.mx = e.touches[0].clientX;
				r.my = e.touches[0].clientY;
				if (r.glow) r.glow.classList.add("hover");
			}
		};
		const onTouchEnd = (e: TouchEvent) => {
			// Use changedTouches for the final position
			if (e.changedTouches.length > 0) {
				r.mx = e.changedTouches[0].clientX;
				r.my = e.changedTouches[0].clientY;
			}
			if (r.glow) r.glow.classList.remove("hover");
			click();
		};

		area.addEventListener("mouseenter", onEnter);
		area.addEventListener("mouseleave", onLeave);
		area.addEventListener("click", click);
		area.addEventListener("touchstart", onTouchStart, { passive: true });
		area.addEventListener("touchmove", onTouchMove, { passive: true });
		area.addEventListener("touchend", onTouchEnd);
		window.addEventListener("mousemove", onMove, { passive: true });
		window.addEventListener("resize", resize, { passive: true });

		const loop = () => {
			r.raf = requestAnimationFrame(loop);

			if (!r.active) {
				r.cx += (r.mx - r.cx) * 0.25;
				r.cy += (r.my - r.cy) * 0.25;
				r.gx += (r.mx - r.gx) * 0.12;
				r.gy += (r.my - r.gy) * 0.12;
				if (r.core)
					r.core.style.transform = `translate3d(${r.cx}px,${r.cy}px,0)translate(-50%,-50%)`;
				if (r.glow)
					r.glow.style.transform = `translate3d(${r.gx}px,${r.gy}px,0)translate(-50%,-50%)`;
				return;
			}

			r.t += 0.012;
			const t = r.t;

			ctx.fillStyle = TRAIL_BLACK;
			ctx.fillRect(0, 0, w, h);

			for (let i = 0; i < POOL; i++) {
				const L = life[i];
				if (L <= 0) continue;

				px[i] += vx[i];
				py[i] += vy[i];
				life[i] = L - 0.012;

				const s = sz[i];
				const x = px[i] - s * 0.5;
				const y = py[i] - s * 0.5;

				ctx.globalAlpha = L;
				ctx.fillStyle = white[i] ? WHITE : ORANGE;
				ctx.fillRect(x, y, s, s);
				ctx.globalAlpha = L * 0.25;
				ctx.fillRect(x - vx[i], y - vy[i], s, s);
			}

			ctx.globalAlpha = 1;

			if (t > 0.6) {
				const f = (t - 0.6) * 2.5;
				const e = 1 - (1 - f) * (1 - f) * (1 - f);
				const v = (10 * e) | 0;
				ctx.fillStyle = `rgb(${v},${v},${v})`;
				ctx.fillRect(0, 0, w, h);
			}
		};
		r.raf = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(r.raf);
			window.removeEventListener("resize", resize);
			window.removeEventListener("mousemove", onMove);
			area.removeEventListener("mouseenter", onEnter);
			area.removeEventListener("mouseleave", onLeave);
			area.removeEventListener("click", click);
			area.removeEventListener("touchstart", onTouchStart);
			area.removeEventListener("touchmove", onTouchMove);
			area.removeEventListener("touchend", onTouchEnd);
			style.remove();
		};
	}, []);

	const r = refs.current;
	return (
		<>
			<div className="click-area" />
			<div
				ref={(el) => {
					r.core = el;
				}}
				className="cursor-pixel-core"
			/>
			<div
				ref={(el) => {
					r.glow = el;
				}}
				className="cursor-pixel-glow"
			/>
			<canvas
				ref={(el) => {
					r.canvas = el;
				}}
				className="transition-canvas"
			/>
		</>
	);
}
