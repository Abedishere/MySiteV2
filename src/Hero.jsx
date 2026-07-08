import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------- real content, no lorem ------------------------- */

const TASK = 'unicode run "add token-bucket rate limiting to the /checkout API endpoint"'

const ROUTES = [
  '→ claude   architecture & failure modes   (long-context reasoning)',
  '→ codex    middleware implementation      (code synthesis)',
  '→ qwen     test generation                (cheap, parallel, wide coverage)',
]

const CLAUDE_OUT = `# design note
limiter lives in gateway middleware, not the
handler: /checkout must fail fast before auth
and DB work. token bucket per user_id+ip,
burst 10, refill 1/s.
failure mode: redis down -> fail OPEN, log,
alert. never block checkout on limiter infra.`

const CODEX_OUT = `# middleware/rate_limit.py
async def rate_limit(req, call_next):
    key = f"rl:{req.user_id}:{req.ip}"
    ok = await bucket.take(key, cost=1)
    if not ok:
        return json_429(retry=bucket.ttl(key))
    return await call_next(req)`

const QWEN_OUT = `def test_burst_then_throttle():
    for _ in range(10):
        assert post("/checkout").status == 200
    assert post("/checkout").status == 429

def test_refill_after_one_second():
    sleep(1.0)
    assert post("/checkout").status == 200`

const MERGE_OUT = `assemble: design note + middleware + 2 tests
resolve imports, wire gateway.py, run linters
→ single coherent change set`

const OUTPUT_DIFF = `PR: add token-bucket rate limiting to /checkout
+ middleware/rate_limit.py      (+38)
+ tests/test_rate_limit.py      (+24)
~ api/gateway.py                (+3 −0)
note: fail-open on limiter infra errors, alerted
✓ ci: lint, unit, burst 50rps load test — green`

/* --------- layout of the graph plane (percent coords, 2.5D via CSS) -------- */

const NODES = {
  task:   { x: 50, y: 8,  w: 'w-[min(560px,86vw)]', title: 'task' },
  router: { x: 50, y: 26, w: 'w-[min(520px,86vw)]', title: 'router' },
  claude: { x: 18, y: 52, w: 'w-[300px]', title: 'claude · architecture' },
  codex:  { x: 50, y: 52, w: 'w-[300px]', title: 'codex · implementation' },
  qwen:   { x: 82, y: 52, w: 'w-[300px]', title: 'qwen · tests' },
  merge:  { x: 50, y: 76, w: 'w-[min(480px,86vw)]', title: 'merge' },
  output: { x: 50, y: 92, w: 'w-[min(560px,86vw)]', title: 'output · reviewable diff' },
}

const EDGES = [
  { id: 'tr', d: 'M 50 11 L 50 23', a: 0.22, b: 0.30 },
  { id: 'rc', d: 'M 50 30 C 50 40, 18 40, 18 46', a: 0.30, b: 0.40 },
  { id: 'rx', d: 'M 50 30 L 50 46', a: 0.32, b: 0.40 },
  { id: 'rq', d: 'M 50 30 C 50 40, 82 40, 82 46', a: 0.34, b: 0.40 },
  { id: 'cm', d: 'M 18 60 C 18 70, 50 68, 50 73', a: 0.70, b: 0.78 },
  { id: 'xm', d: 'M 50 60 L 50 73', a: 0.71, b: 0.78 },
  { id: 'qm', d: 'M 82 60 C 82 70, 50 68, 50 73', a: 0.72, b: 0.78 },
  { id: 'mo', d: 'M 50 80 L 50 89', a: 0.80, b: 0.85 },
]

// camera keyframes: [p, scale, translateY in % of plane height]
const CAM = [
  [0.00, 1.9, 40], [0.15, 1.7, 36], [0.30, 1.5, 22],
  [0.40, 1.0, 0], [0.70, 1.0, 0],
  [0.78, 1.35, -26], [0.90, 1.4, -42], [1.00, 1.4, -42],
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const seg = (p, a, b) => clamp01((p - a) / (b - a))

function camAt(p) {
  let i = 0
  while (i < CAM.length - 2 && p > CAM[i + 1][0]) i++
  const [pa, sa, ya] = CAM[i]
  const [pb, sb, yb] = CAM[i + 1]
  const t = clamp01((p - pa) / (pb - pa || 1))
  const e = t * t * (3 - 2 * t)
  return { s: sa + (sb - sa) * e, y: ya + (yb - ya) * e }
}

/* -------------------- chaos particles: shader buffer lerp ------------------ */

const COUNT = 1200

function Particles({ pRef }) {
  const mat = useRef()
  const geo = useRef()

  useEffect(() => {
    const chaos = new Float32Array(COUNT * 3)
    const target = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      chaos[i * 3] = (Math.random() - 0.5) * 22
      chaos[i * 3 + 1] = (Math.random() - 0.5) * 14
      chaos[i * 3 + 2] = (Math.random() - 0.5) * 10
      // targets: a tight band where the task node sits (top of plane)
      const a = Math.random() * Math.PI * 2
      const r = 0.4 + Math.random() * 2.6
      target[i * 3] = Math.cos(a) * r * 1.8
      target[i * 3 + 1] = 3.4 + Math.sin(a) * r * 0.22
      target[i * 3 + 2] = (Math.random() - 0.5) * 0.6
    }
    geo.current.setAttribute('position', new THREE.BufferAttribute(chaos, 3))
    geo.current.setAttribute('aTarget', new THREE.BufferAttribute(target, 3))
  }, [])

  useFrame(({ clock }) => {
    if (!mat.current) return
    const p = pRef.current
    mat.current.uniforms.uP.value = clamp01(p / 0.22)
    mat.current.uniforms.uT.value = clock.elapsedTime
    // particles carry the "chaos" beat, then recede once the graph takes over
    mat.current.uniforms.uO.value = 0.9 - seg(p, 0.22, 0.38) * 0.78
  })

  return (
    <points>
      <bufferGeometry ref={geo} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        uniforms={{ uP: { value: 0 }, uT: { value: 0 }, uO: { value: 0.9 } }}
        vertexShader={`
          attribute vec3 aTarget;
          uniform float uP; uniform float uT;
          varying float vTint;
          void main() {
            float e = uP * uP * (3.0 - 2.0 * uP);
            vec3 pos = mix(position, aTarget, e);
            pos.x += sin(uT * 0.6 + position.y * 3.0) * 0.08 * (1.0 - e);
            pos.y += cos(uT * 0.5 + position.x * 2.0) * 0.08 * (1.0 - e);
            vTint = step(0.85, fract(position.x * 13.7));
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = 2.2 * (140.0 / -mv.z);
          }`}
        fragmentShader={`
          uniform float uO;
          varying float vTint;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            vec3 amber = vec3(1.0, 0.70, 0.14);
            vec3 cyan = vec3(0.31, 0.85, 0.88);
            gl_FragColor = vec4(mix(amber, cyan, vTint), uO * (1.0 - d * 1.6));
          }`}
      />
    </points>
  )
}

/* --------------------------------- panes ---------------------------------- */

function Pane({ id, node, refs, children, className = '' }) {
  return (
    <div
      ref={(el) => (refs.current[id] = el)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 border border-line bg-panel/95 opacity-0 ${node.w} ${className}`}
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-amber/70" />
        <span className="mono-label text-fog">{node.title}</span>
      </div>
      <div className="px-3 py-2 font-mono text-[10px] leading-relaxed text-paper/85 md:text-[11px]">
        {children}
      </div>
    </div>
  )
}

/* ------------------------------ full hero ---------------------------------- */

function FullHero() {
  const wrap = useRef(null)
  const plane = useRef(null)
  const refs = useRef({})
  const pRef = useRef(0)

  useEffect(() => {
    const R = refs.current
    const edgeEls = EDGES.map((e) => ({ ...e, el: R[`edge-${e.id}`] }))
    edgeEls.forEach((e) => { e.el.style.strokeDasharray = 1; e.el.style.strokeDashoffset = 1 })

    const show = (el, on) => { if (el) el.style.opacity = on ? 1 : 0 }
    const stream = (el, text, t) => {
      if (!el) return
      const n = Math.floor(t * text.length)
      el.textContent = t >= 1 ? text : n > 0 ? text.slice(0, n) + '▌' : ''
    }

    const update = (p) => {
      pRef.current = p
      const { s, y } = camAt(p)
      plane.current.style.transform = `translateY(${y}%) scale(${s})`

      show(R.task, p >= 0.13)
      stream(R['task-txt'], TASK, seg(p, 0.15, 0.26))
      show(R.router, p >= 0.28)
      stream(R['router-txt'], ROUTES.join('\n'), seg(p, 0.29, 0.40))

      edgeEls.forEach((e) => { e.el.style.strokeDashoffset = 1 - seg(p, e.a, e.b) })

      // parallel beat: all three stream over the SAME window — concurrency, not sequence
      const t = seg(p, 0.40, 0.70)
      ;['claude', 'codex', 'qwen'].forEach((k) => show(R[k], p >= 0.40))
      stream(R['claude-txt'], CLAUDE_OUT, t)
      stream(R['codex-txt'], CODEX_OUT, t)
      stream(R['qwen-txt'], QWEN_OUT, t)

      show(R.merge, p >= 0.72)
      stream(R['merge-txt'], MERGE_OUT, seg(p, 0.74, 0.83))
      show(R.output, p >= 0.85)
      stream(R['output-txt'], OUTPUT_DIFF, seg(p, 0.85, 0.95))

      // handoff
      const h = seg(p, 0.94, 1)
      R.graph.style.opacity = 1 - h
      R.handoff.style.opacity = h
      R.handoff.style.pointerEvents = h > 0.5 ? 'auto' : 'none'
      R.hint.style.opacity = p < 0.05 ? 1 : 0
    }

    const st = ScrollTrigger.create({
      trigger: wrap.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => update(self.progress),
    })
    update(0)
    return () => st.kill()
  }, [])

  return (
    <section ref={wrap} id="top" className="relative h-[700vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <Canvas className="!absolute inset-0" camera={{ position: [0, 0, 11], fov: 50 }} dpr={[1, 1.5]}>
          <Particles pRef={pRef} />
        </Canvas>

        {/* graph plane, 2.5D: perspective container, pan+zoom as f(p) */}
        <div className="absolute inset-0" style={{ perspective: '1200px' }} ref={(el) => (refs.current.graph = el)}>
          <div ref={plane} className="absolute inset-0 will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {EDGES.map((e) => (
                <path
                  key={e.id}
                  ref={(el) => (refs.current[`edge-${e.id}`] = el)}
                  d={e.d}
                  pathLength="1"
                  fill="none"
                  stroke="var(--color-amber)"
                  strokeOpacity="0.7"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            <Pane id="task" node={NODES.task} refs={refs}>
              <pre className="whitespace-pre-wrap" ref={(el) => (refs.current['task-txt'] = el)} />
            </Pane>
            <Pane id="router" node={NODES.router} refs={refs}>
              <pre className="whitespace-pre" ref={(el) => (refs.current['router-txt'] = el)} />
            </Pane>
            <Pane id="claude" node={NODES.claude} refs={refs} className="hidden md:block">
              <pre className="whitespace-pre-wrap" ref={(el) => (refs.current['claude-txt'] = el)} />
            </Pane>
            <Pane id="codex" node={NODES.codex} refs={refs}>
              <pre className="whitespace-pre-wrap" ref={(el) => (refs.current['codex-txt'] = el)} />
            </Pane>
            <Pane id="qwen" node={NODES.qwen} refs={refs} className="hidden md:block">
              <pre className="whitespace-pre-wrap" ref={(el) => (refs.current['qwen-txt'] = el)} />
            </Pane>
            <Pane id="merge" node={NODES.merge} refs={refs}>
              <pre className="whitespace-pre-wrap" ref={(el) => (refs.current['merge-txt'] = el)} />
            </Pane>
            <Pane id="output" node={NODES.output} refs={refs} className="border-amber/60">
              <pre className="whitespace-pre-wrap" ref={(el) => (refs.current['output-txt'] = el)} />
            </Pane>
          </div>
        </div>

        {/* nameplate + nav, always present */}
        <header className="absolute top-6 left-6 right-6 flex items-start justify-between md:top-10 md:left-12 md:right-12">
          <div>
            <p className="mono-label text-amber">ABDEL RAHMAN EL KOUCHE</p>
            <p className="mono-label mt-1 text-fog">SOFTWARE / AI ENGINEER — BEIRUT</p>
          </div>
          <nav className="mono-label hidden gap-6 text-fog md:flex">
            <a className="hover:text-amber" href="#projects">PROJECTS</a>
            <a className="hover:text-amber" href="#experience">EXPERIENCE</a>
            <a className="hover:text-amber" href="#contact">CONTACT</a>
          </nav>
        </header>

        <p ref={(el) => (refs.current.hint = el)} className="mono-label absolute bottom-6 left-1/2 -translate-x-1/2 text-fog transition-opacity duration-500">
          SCROLL — ONE TASK, THREE MODELS, ONE CHANGE SET ▼
        </p>

        {/* handoff card */}
        <div ref={(el) => (refs.current.handoff = el)} className="pointer-events-none absolute inset-0 flex flex-col items-start justify-end p-8 opacity-0 md:p-16">
          <p className="mono-label text-cyan">THIS IS HOW I WORK</p>
          <h1 className="display mt-3 max-w-4xl text-4xl font-black uppercase leading-[0.95] md:text-7xl">
            Ambiguity in. <span className="text-amber">Working software out.</span>
          </h1>
        </div>
      </div>
    </section>
  )
}

/* ----------------- static fallback: mobile / reduced motion ---------------- */

function StaticHero() {
  return (
    <section id="top" className="relative overflow-hidden px-6 py-16">
      <video src="/hero-scrub.mp4" autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="relative">
        <p className="mono-label text-amber">ABDEL RAHMAN EL KOUCHE</p>
        <p className="mono-label mt-1 text-fog">SOFTWARE / AI ENGINEER — BEIRUT</p>
        <h1 className="display mt-10 text-4xl font-black uppercase leading-[0.95]">
          Ambiguity in. <span className="text-amber">Working software out.</span>
        </h1>
        <p className="mono-label mt-8 text-cyan">UNICODE ORCHESTRATOR — ONE TASK, THREE MODELS, ONE CHANGE SET</p>
        {[['task', TASK], ['router', ROUTES.join('\n')], ['claude · architecture', CLAUDE_OUT], ['codex · implementation', CODEX_OUT], ['qwen · tests', QWEN_OUT], ['merge', MERGE_OUT], ['output · reviewable diff', OUTPUT_DIFF]].map(([title, body]) => (
          <div key={title} className="mt-4 border border-line bg-panel/95">
            <p className="mono-label border-b border-line px-3 py-1.5 text-fog">{title}</p>
            <pre className="whitespace-pre-wrap px-3 py-2 font-mono text-[11px] leading-relaxed text-paper/85">{body}</pre>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Hero() {
  const [full, setFull] = useState(null)
  useEffect(() => {
    const small = window.matchMedia('(max-width: 767px)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setFull(!small && !reduced)
  }, [])
  if (full === null) return <section className="h-screen" />
  return full ? <FullHero /> : <StaticHero />
}
