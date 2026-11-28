import { getGraphicsLevel, GRAPHICS_LEVEL } from '../core/graphicsSettings';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colorIdx: number; // 0: cyan, 1: gold, 2: crimson, 3: amber
  kind: number; // 0: spark, 1: trail, 2: ring
}

interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  scale: number;
}

interface ProjectileBolt {
  active: boolean;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  t: number;
  duration: number;
  colorIdx: number;
}

interface SlashArc {
  active: boolean;
  x: number;
  y: number;
  angle: number;
  life: number;
  maxLife: number;
  radius: number;
  colorIdx: number;
}

interface EdgeEmber {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface TargetingArc {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  colorIdx: number;
}

const PARTICLE_POOL = 180;
const TEXT_POOL = 28;
const BOLT_POOL = 12;
const SLASH_POOL = 14;
const EMBER_POOL = 24;
const GLOW_COLORS = ['#4FA89E', '#C49C48', '#C44535', '#CC8838'];

function buildGlowStamp(hex: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(24, 24, 1, 24, 24, 22);
  grad.addColorStop(0, `${hex}CC`);
  grad.addColorStop(0.42, `${hex}44`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 48, 48);
  return c;
}

export class VfxOverlay2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 1280;
  private height = 720;
  private dpr = 1;

  private particles: Particle[] = [];
  private pCursor = 0;
  private texts: FloatingText[] = [];
  private tCursor = 0;
  private bolts: ProjectileBolt[] = [];
  private bCursor = 0;
  private slashes: SlashArc[] = [];
  private sCursor = 0;
  private embers: EdgeEmber[] = [];
  private eCursor = 0;
  private targetingArc: TargetingArc | null = null;

  private stamps: HTMLCanvasElement[];
  private vigNormalCanvas: HTMLCanvasElement;
  private vigOverloadCanvas: HTMLCanvasElement;
  private vigDirty = true;
  private overload = false;
  private edgePulse = 0;
  private trailTimer = 0;
  private emberTimer = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pointer-events-none absolute inset-0 z-[5] h-full w-full';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.stamps = GLOW_COLORS.map(buildGlowStamp);
    this.vigNormalCanvas = document.createElement('canvas');
    this.vigOverloadCanvas = document.createElement('canvas');

    for (let i = 0; i < PARTICLE_POOL; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 3,
        colorIdx: 0,
        kind: 0,
      });
    }
    for (let i = 0; i < TEXT_POOL; i++) {
      this.texts.push({
        active: false,
        x: 0,
        y: 0,
        vy: -40,
        life: 0,
        maxLife: 1,
        text: '',
        color: '#F4ECE0',
        scale: 1,
      });
    }
    for (let i = 0; i < BOLT_POOL; i++) {
      this.bolts.push({
        active: false,
        sx: 0,
        sy: 0,
        tx: 0,
        ty: 0,
        t: 0,
        duration: 0.28,
        colorIdx: 0,
      });
    }
    for (let i = 0; i < SLASH_POOL; i++) {
      this.slashes.push({
        active: false,
        x: 0,
        y: 0,
        angle: 0,
        life: 0,
        maxLife: 0.24,
        radius: 42,
        colorIdx: 1,
      });
    }
    for (let i = 0; i < EMBER_POOL; i++) {
      this.embers.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1.8,
        size: 3,
      });
    }

    this.resize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  }

  public resize(w: number, h: number): void {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.vigDirty = true;
  }

  private ensureVignettes(): void {
    if (!this.vigDirty) return;
    this.vigDirty = false;
    const vw = Math.max(64, Math.round(this.width * 0.5));
    const vh = Math.max(64, Math.round(this.height * 0.5));
    const paint = (c: HTMLCanvasElement, edgeColor: string) => {
      c.width = vw;
      c.height = vh;
      const vctx = c.getContext('2d');
      if (!vctx) return;
      const vig = vctx.createRadialGradient(
        vw * 0.5,
        vh * 0.46,
        Math.min(vw, vh) * 0.28,
        vw * 0.5,
        vh * 0.5,
        Math.max(vw, vh) * 0.74
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, edgeColor);
      vctx.fillStyle = vig;
      vctx.fillRect(0, 0, vw, vh);
    };
    paint(this.vigNormalCanvas, 'rgba(8, 7, 16, 0.46)');
    paint(this.vigOverloadCanvas, 'rgba(88, 18, 14, 0.62)');
  }

  public setGraphicsLevel(level: number): void {
    if (level < GRAPHICS_LEVEL.high) {
      this.targetingArc = null;
      this.edgePulse = 0;
      for (let i = 0; i < PARTICLE_POOL; i++) this.particles[i].active = false;
      for (let i = 0; i < BOLT_POOL; i++) this.bolts[i].active = false;
      for (let i = 0; i < SLASH_POOL; i++) this.slashes[i].active = false;
      for (let i = 0; i < EMBER_POOL; i++) this.embers[i].active = false;
    } else if (level < GRAPHICS_LEVEL.ultra) {
      this.targetingArc = null;
      for (let i = 0; i < EMBER_POOL; i++) this.embers[i].active = false;
    }
  }

  public setOverload(active: boolean): void {
    this.overload = active;
  }

  public setTargetingArc(arc: TargetingArc | null): void {
    if (getGraphicsLevel() < GRAPHICS_LEVEL.ultra) {
      this.targetingArc = null;
      return;
    }
    this.targetingArc = arc;
  }

  public setParallax(_nx: number, _ny: number): void {
    // Kept for API compatibility; avoids sliding bright HUD rings across the 3D field
  }

  public spawnCardLaunch(x: number, y: number, colorIdx: number): void {
    if (getGraphicsLevel() < GRAPHICS_LEVEL.high) return;
    const count = getGraphicsLevel() === GRAPHICS_LEVEL.ultra ? 12 : 6;
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.pCursor];
      this.pCursor = (this.pCursor + 1) % PARTICLE_POOL;
      const spread = (Math.random() - 0.5) * 1.3;
      const angle = -Math.PI * 0.5 + spread;
      const spd = 120 + Math.random() * 140;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 68;
      p.y = y + (Math.random() - 0.5) * 18;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.life = 0;
      p.maxLife = 0.34 + Math.random() * 0.22;
      p.size = 3.5 + Math.random() * 3.5;
      p.colorIdx = colorIdx;
      p.kind = 0;
    }
  }

  public spawnBurst(x: number, y: number, colorIdx: number, count = 8, speed = 155): void {
    const level = getGraphicsLevel();
    if (level < GRAPHICS_LEVEL.high) return;
    const cappedCount = Math.min(level === GRAPHICS_LEVEL.ultra ? 16 : 9, count);
    const ring = this.particles[this.pCursor];
    this.pCursor = (this.pCursor + 1) % PARTICLE_POOL;
    ring.active = true;
    ring.x = x;
    ring.y = y;
    ring.vx = 0;
    ring.vy = 0;
    ring.life = 0;
    ring.maxLife = 0.34;
    ring.size = 16;
    ring.colorIdx = colorIdx;
    ring.kind = 2;

    for (let i = 0; i < cappedCount; i++) {
      const p = this.particles[this.pCursor];
      this.pCursor = (this.pCursor + 1) % PARTICLE_POOL;
      const angle = (i / cappedCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = speed * (0.45 + Math.random() * 0.65);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd - 24;
      p.life = 0;
      p.maxLife = 0.26 + Math.random() * 0.24;
      p.size = 3 + Math.random() * 4;
      p.colorIdx = colorIdx;
      p.kind = 0;
    }
  }

  public spawnTrailMote(x: number, y: number, colorIdx: number, size = 5): void {
    if (getGraphicsLevel() < GRAPHICS_LEVEL.high) return;
    const p = this.particles[this.pCursor];
    this.pCursor = (this.pCursor + 1) % PARTICLE_POOL;
    p.active = true;
    p.x = x + (Math.random() - 0.5) * 4;
    p.y = y + (Math.random() - 0.5) * 4;
    p.vx = (Math.random() - 0.5) * 12;
    p.vy = -14 - Math.random() * 14;
    p.life = 0;
    p.maxLife = 0.22;
    p.size = size;
    p.colorIdx = colorIdx;
    p.kind = 1;
  }

  public spawnBolt(sx: number, sy: number, tx: number, ty: number, colorIdx: number): void {
    if (getGraphicsLevel() < GRAPHICS_LEVEL.high) return;
    const b = this.bolts[this.bCursor];
    this.bCursor = (this.bCursor + 1) % BOLT_POOL;
    b.active = true;
    b.sx = sx;
    b.sy = sy;
    b.tx = tx;
    b.ty = ty;
    b.t = 0;
    b.duration = 0.36;
    b.colorIdx = colorIdx;
  }

  public spawnSlash(x: number, y: number, angle = -0.6, colorIdx = 1, radius = 44): void {
    if (getGraphicsLevel() < GRAPHICS_LEVEL.high) return;
    const s = this.slashes[this.sCursor];
    this.sCursor = (this.sCursor + 1) % SLASH_POOL;
    s.active = true;
    s.x = x;
    s.y = y;
    s.angle = angle;
    s.life = 0;
    s.maxLife = 0.32;
    s.radius = radius;
    s.colorIdx = colorIdx;
  }

  public spawnText(x: number, y: number, text: string, color = '#F4ECE0', scale = 1): void {
    if (getGraphicsLevel() === GRAPHICS_LEVEL.low) {
      // Minimal gameplay-critical combat text without glow overlap passes
    }
    const clampedX = Math.max(72, Math.min(this.width - 72, x));
    let spawnY = Math.max(76, Math.min(this.height - 190, y));
    for (let pass = 0; pass < 8; pass++) {
      const clash = this.texts.some(
        (other) =>
          other.active &&
          other.life < 1.1 &&
          Math.abs(other.x - clampedX) < 126 &&
          Math.abs(other.y - spawnY) < 38
      );
      if (!clash) break;
      spawnY -= 38;
      if (spawnY < 68) {
        spawnY = Math.max(76, Math.min(this.height - 190, y)) + pass * 36;
      }
    }

    const ft = this.texts[this.tCursor];
    this.tCursor = (this.tCursor + 1) % TEXT_POOL;
    ft.active = true;
    ft.x = clampedX;
    ft.y = spawnY;
    ft.vy = -38;
    ft.life = 0;
    ft.maxLife = 1.35;
    ft.text = text;
    ft.color = color;
    ft.scale = scale;
  }

  public triggerFlash(_color = '#FFE7B5', intensity = 0.2): void {
    if (getGraphicsLevel() < GRAPHICS_LEVEL.high) return;
    // Subtle edge vignette pulse instead of full-screen white glare flash
    this.edgePulse = Math.max(this.edgePulse, Math.min(0.28, intensity));
  }

  public updateAndRender(dt: number, elapsed: number): void {
    const level = getGraphicsLevel();
    const safeDt = Math.min(dt, 0.05);
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Heavy Particles, Bolts, Slashes & Targeting Arc (only executed when Graphics >= High)
    if (level >= GRAPHICS_LEVEL.high) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      this.trailTimer += safeDt;
      const emitBoltTrail = this.trailTimer >= 0.02;
      if (emitBoltTrail) this.trailTimer = 0;

      for (let i = 0; i < BOLT_POOL; i++) {
        const b = this.bolts[i];
        if (!b.active) continue;
        b.t += safeDt / b.duration;
        if (b.t >= 1) {
          b.active = false;
          this.spawnBurst(b.tx, b.ty, b.colorIdx, 10, 185);
          continue;
        }
        const ease = 1 - (1 - b.t) * (1 - b.t);
        const cuHead = Math.max(0, Math.min(1, ease));
        const headX = b.sx + (b.tx - b.sx) * cuHead;
        const headY = b.sy + (b.ty - b.sy) * cuHead - Math.sin(cuHead * Math.PI) * 46;
        if (emitBoltTrail) this.spawnTrailMote(headX, headY, b.colorIdx, 6);

        // Crackling lightning tail ribbon behind projectile head
        const tailStart = Math.max(0, ease - 0.34);
        const segs = 5;
        ctx.strokeStyle = GLOW_COLORS[b.colorIdx] ?? '#66DDD2';
        ctx.globalAlpha = 0.78;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        for (let s = 0; s <= segs; s++) {
          const cu = Math.max(0, Math.min(1, tailStart + ((ease - tailStart) * s) / segs));
          const px = b.sx + (b.tx - b.sx) * cu;
          const py = b.sy + (b.ty - b.sy) * cu - Math.sin(cu * Math.PI) * 46;
          const jitter = s === 0 || s === segs ? 0 : Math.sin(elapsed * 44 + s * 2.9 + i) * 9;
          if (s === 0) ctx.moveTo(px + jitter, py + jitter * 0.5);
          else ctx.lineTo(px + jitter, py + jitter * 0.5);
        }
        ctx.stroke();

        ctx.strokeStyle = '#FFF9E6';
        ctx.globalAlpha = 0.88;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        const stamp = this.stamps[b.colorIdx];
        ctx.globalAlpha = 0.9;
        ctx.drawImage(stamp, headX - 16, headY - 16, 32, 32);
      }

      for (let i = 0; i < PARTICLE_POOL; i++) {
        const p = this.particles[i];
        if (!p.active) continue;
        p.life += safeDt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        const prog = p.life / p.maxLife;
        const alpha = 1 - prog;

        if (p.kind === 2) {
          const radius = p.size + prog * 54;
          ctx.strokeStyle = GLOW_COLORS[p.colorIdx];
          ctx.lineWidth = Math.max(1, 3.2 * alpha);
          ctx.globalAlpha = alpha * 0.72;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#FFF5D6';
          ctx.lineWidth = Math.max(0.8, 1.4 * alpha);
          ctx.globalAlpha = alpha * 0.55;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 0.72, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          p.x += p.vx * safeDt;
          p.y += p.vy * safeDt;
          if (p.kind === 0) p.vy += 240 * safeDt;
          const s = p.size * (0.5 + alpha * 0.85);
          const stamp = this.stamps[p.colorIdx];
          ctx.globalAlpha = alpha * 0.8;
          ctx.drawImage(stamp, p.x - s, p.y - s, s * 2, s * 2);
        }
      }

      for (let i = 0; i < SLASH_POOL; i++) {
        const s = this.slashes[i];
        if (!s.active) continue;
        s.life += safeDt;
        if (s.life >= s.maxLife) {
          s.active = false;
          continue;
        }
        const prog = s.life / s.maxLife;
        const alpha = 1 - prog;
        const r = s.radius * (0.82 + prog * 0.55);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.globalAlpha = alpha * 0.95;
        ctx.strokeStyle = GLOW_COLORS[s.colorIdx] ?? '#F3CD72';
        ctx.lineWidth = 7.0 * alpha + 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, -1.05, 1.05);
        ctx.stroke();

        ctx.strokeStyle = '#FFF7DC';
        ctx.lineWidth = 2.4 * alpha;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.94, -0.82, 0.82);
        ctx.stroke();

        // Impact spark flare at slash crest
        const stamp = this.stamps[s.colorIdx] ?? this.stamps[1];
        ctx.globalAlpha = alpha * 0.85;
        ctx.drawImage(stamp, r * 0.7 - 14, -14, 28, 28);
        ctx.restore();
      }
      ctx.restore();

      // 2. Runic Targeting Arc (Ultra only)
      if (level >= GRAPHICS_LEVEL.ultra && this.targetingArc) {
        const { sx, sy, tx, ty, colorIdx } = this.targetingArc;
        const cx = (sx + tx) * 0.5;
        const cy = Math.min(sy, ty) - Math.max(58, Math.abs(sy - ty) * 0.32);
        const arcColor = GLOW_COLORS[colorIdx] ?? '#E2B354';
        const stamp = this.stamps[colorIdx] ?? this.stamps[1];

        ctx.save();
        ctx.strokeStyle = arcColor;
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -elapsed * 38;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        const beadCount = 12;
        const phase = (elapsed * 0.95) % 1;
        for (let i = 0; i < beadCount; i++) {
          const u = ((i / beadCount) + phase) % 1;
          const inv = 1 - u;
          const bx = inv * inv * sx + 2 * inv * u * cx + u * u * tx;
          const by = inv * inv * sy + 2 * inv * u * cy + u * u * ty;
          const fade = Math.sin(u * Math.PI);
          const radius = 5 + fade * 5;
          ctx.globalAlpha = 0.35 + fade * 0.5;
          ctx.drawImage(stamp, bx - radius, by - radius, radius * 2, radius * 2);
        }

        const pulse = 1 + Math.sin(elapsed * 5.2) * 0.1;
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tx, ty, 18 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#FFF0C2';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(tx, ty, 10 * pulse, elapsed * 1.8, elapsed * 1.8 + Math.PI * 1.45);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. Cached Radial Vignette + Overload Edge Embers (zero per-frame gradient allocations)
    if (level >= GRAPHICS_LEVEL.medium) {
      this.ensureVignettes();
      ctx.save();
      if (this.overload) {
        ctx.globalAlpha = Math.min(1, 0.92 + this.edgePulse);
        ctx.drawImage(this.vigOverloadCanvas, 0, 0, this.width, this.height);
      } else {
        ctx.globalAlpha = 1;
        ctx.drawImage(this.vigNormalCanvas, 0, 0, this.width, this.height);
        if (this.edgePulse > 0.02) {
          ctx.globalAlpha = Math.min(0.85, this.edgePulse * 2.4);
          ctx.drawImage(this.vigOverloadCanvas, 0, 0, this.width, this.height);
        }
      }
      ctx.restore();
    }
    if (this.edgePulse > 0) {
      this.edgePulse = Math.max(0, this.edgePulse - safeDt * 1.4);
    }

    if (level >= GRAPHICS_LEVEL.ultra) {
      if (this.overload) {
        this.emberTimer += safeDt;
        if (this.emberTimer >= 0.09) {
          this.emberTimer = 0;
          const em = this.embers[this.eCursor];
          this.eCursor = (this.eCursor + 1) % EMBER_POOL;
          const edgePick = Math.random();
          em.active = true;
          if (edgePick < 0.55) {
            em.x = Math.random() * this.width;
            em.y = this.height - 8;
            em.vx = (Math.random() - 0.5) * 28;
            em.vy = -34 - Math.random() * 42;
          } else if (edgePick < 0.78) {
            em.x = 12 + Math.random() * 36;
            em.y = this.height * (0.35 + Math.random() * 0.62);
            em.vx = 14 + Math.random() * 18;
            em.vy = -36 - Math.random() * 32;
          } else {
            em.x = this.width - 12 - Math.random() * 36;
            em.y = this.height * (0.35 + Math.random() * 0.62);
            em.vx = -14 - Math.random() * 18;
            em.vy = -36 - Math.random() * 32;
          }
          em.life = 0;
          em.maxLife = 1.4 + Math.random() * 1.1;
          em.size = 3.5 + Math.random() * 3.5;
        }
      }

      ctx.save();
      for (let i = 0; i < EMBER_POOL; i++) {
        const em = this.embers[i];
        if (!em.active) continue;
        em.life += safeDt;
        if (em.life >= em.maxLife) {
          em.active = false;
          continue;
        }
        em.x += em.vx * safeDt + Math.sin(elapsed * 3.5 + i) * 10 * safeDt;
        em.y += em.vy * safeDt;
        const prog = em.life / em.maxLife;
        const alpha = Math.sin(prog * Math.PI) * 0.65;
        const s = em.size * (1 - prog * 0.35);
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.stamps[2], em.x - s, em.y - s, s * 2, s * 2);
      }
      ctx.restore();
    }

    // 3. Crisp Floating Combat Text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    for (let i = 0; i < TEXT_POOL; i++) {
      const ft = this.texts[i];
      if (!ft.active) continue;
      ft.life += safeDt;
      if (ft.life >= ft.maxLife) {
        ft.active = false;
        continue;
      }
      const prog = ft.life / ft.maxLife;
      ft.y += ft.vy * safeDt * (1 - prog * 0.45);
      const pop = prog < 0.12 ? 0.8 + (prog / 0.12) * 0.3 : 1.1 - (prog - 0.12) * 0.15;
      const alpha = prog > 0.68 ? (1 - prog) / 0.32 : 1;

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      const pxSize = Math.round(19 * ft.scale * pop);
      ctx.font = `700 ${pxSize}px 'Cinzel', Georgia, serif`;
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = 'rgba(10, 8, 16, 0.95)';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  public dispose(): void {
    this.canvas.remove();
  }
}
