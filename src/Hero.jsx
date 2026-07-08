import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------- real content, no lorem ------------------------- */

const ERR_BUILD = [
  '$ npm run build',
  "✗ TypeError: cannot read 'user' of undefined",
  '    at checkout/session.js:41:17',
  '✗ 500 POST /api/checkout — payment intent null',
  '✗ FAILED tests/checkout.test.js (3 of 12)',
]

const ERR_SERVER = [
  '[ERR] db pool exhausted — 32 conns waiting',
  '[ERR] redis timeout 5000ms — retries maxed',
  '[ERR] worker-2 crashed: unhandled rejection',
  '[ERR] queue depth 4,812 and climbing',
]

const ERR_CI = [
  'ci/build     ✗ failed',
  'ci/tests     ✗ 9 passed, 3 failed',
  'ci/deploy    ⨯ blocked',
]

const FIX_DIFF = `- const user = session.user
+ const user = (await getSession(req))?.user
+ if (!user) return redirect("/login")
- pool: { max: 10 }
+ pool: { max: 50, idleTimeout: 30_000 }
+ retry(redis, { backoff: "exp", max: 5 })
+ queue.concurrency = os.cpus().length - 1
✓ 12 passed, 0 failed`

const STATUS_LINE = 'all services connected — 0 errors — shipping ✓'

const ARCH_NODES = [
  { id: 'gw', label: 'gateway', x: 50, y: 16 },
  { id: 'auth', label: 'auth', x: 22, y: 36 },
  { id: 'api', label: 'api', x: 50, y: 40 },
  { id: 'cache', label: 'cache', x: 78, y: 36 },
  { id: 'db', label: 'postgres', x: 32, y: 66 },
  { id: 'queue', label: 'queue', x: 68, y: 66 },
  { id: 'wrk', label: 'workers', x: 50, y: 86 },
]

const ARCH_EDGES = [
  { d: 'M 50 20 L 22 32', a: 0.66, b: 0.72 },
  { d: 'M 50 20 L 50 36', a: 0.67, b: 0.73 },
  { d: 'M 50 20 L 78 32', a: 0.68, b: 0.74 },
  { d: 'M 46 44 L 34 62', a: 0.72, b: 0.78 },
  { d: 'M 54 44 L 66 62', a: 0.73, b: 0.79 },
  { d: 'M 78 40 L 54 42', a: 0.74, b: 0.79 },
  { d: 'M 36 70 L 46 83', a: 0.76, b: 0.81 },
  { d: 'M 64 70 L 54 83', a: 0.77, b: 0.82 },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const seg = (p, a, b) => clamp01((p - a) / (b - a))

/* -------------------- chaos particles: shader buffer lerp ------------------ */

const COUNT = 1400

function Particles({ pRef }) {
  const mat = useRef()
  const geo = useRef()

  useEffect(() => {
    const chaos = new Float32Array(COUNT * 3)
    const target = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      chaos[i * 3] = (Math.random() - 0.5) * 24
      chaos[i * 3 + 1] = (Math.random() - 0.5) * 15
      chaos[i * 3 + 2] = (Math.random() - 0.5) * 10
      // targets: an orderly grid lattice — chaos literally becomes structure
      const col = i % 40
      const row = Math.floor(i / 40)
      target[i * 3] = (col - 19.5) * 0.55
      target[i * 3 + 1] = (row - (COUNT / 80)) * 0.5
      target[i * 3 + 2] = -2
    }
    geo.current.setAttribute('position', new THREE.BufferAttribute(chaos, 3))
    geo.current.setAttribute('aTarget', new THREE.BufferAttribute(target, 3))
  }, [])

  useFrame(({ clock }) => {
    if (!mat.current) return
    const p = pRef.current
    mat.current.uniforms.uP.value = seg(p, 0.15, 0.65)
    mat.current.uniforms.uT.value = clock.elapsedTime
    mat.current.uniforms.uRed.value = 1 - seg(p, 0.3, 0.6)
    mat.current.uniforms.uO.value = 0.85 - seg(p, 0.55, 0.75) * 0.72
  })

  return (
    <points>
      <bufferGeometry ref={geo} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        uniforms={{ uP: { value: 0 }, uT: { value: 0 }, uO: { value: 0.85 }, uRed: { value: 1 } }}
        vertexShader={`
          attribute vec3 aTarget;
          uniform float uP; uniform float uT;
          varying float vTint;
          void main() {
            float e = uP * uP * (3.0 - 2.0 * uP);
            vec3 pos = mix(position, aTarget, e);
            float w = (1.0 - e);
            pos.x += sin(uT * 1.4 + position.y * 4.0) * 0.22 * w;
            pos.y += cos(uT * 1.1 + position.x * 3.0) * 0.22 * w;
            vTint = step(0.8, fract(position.x * 13.7));
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = 2.0 * (40.0 / -mv.z);
          }`}
        fragmentShader={`
          uniform float uO; uniform float uRed;
          varying float vTint;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            vec3 calm = mix(vec3(1.0, 0.70, 0.14), vec3(0.31, 0.85, 0.88), vTint);
            vec3 alarm = vec3(1.0, 0.28, 0.22);
            gl_FragColor = vec4(mix(calm, alarm, uRed * (0.35 + 0.4 * vTint)), uO * (1.0 - d * 1.6));
          }`}
      />
    </points>
  )
}

/* ------------------------------ terminal pane ------------------------------ */

function Pane({ rid, refs, title, className = '', style, children }) {
  return (
    <div
      ref={(el) => (refs.current[rid] = el)}
      className={`absolute border border-line bg-panel/95 opacity-0 will-change-transform ${className}`}
      style={style}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#ff5f56]" data-dot />
        <span className="mono-label text-fog">{title}</span>
      </div>
      <div className="px-3 py-2 font-mono text-[10px] leading-relaxed md:text-[11px]">{children}</div>
    </div>
  )
}

function ErrLines({ rid, refs, lines }) {
  return (
    <div ref={(el) => (refs.current[rid] = el)}>
      {lines.map((l, i) => (
        <p key={i} data-line className="whitespace-pre text-[#ff8a80] transition-all duration-300">{l}</p>
      ))}
    </div>
  )
}

/* ------------------------------ full hero ---------------------------------- */

function FullHero() {
  const wrap = useRef(null)
  const stage = useRef(null)
  const refs = useRef({})
  const pRef = useRef(0)

  useEffect(() => {
    const R = refs.current
    const edgeEls = ARCH_EDGES.map((e, i) => R[`aedge-${i}`])
    edgeEls.forEach((el) => { el.style.strokeDasharray = 1; el.style.strokeDashoffset = 1 })

    const show = (el, on) => { if (el) el.style.opacity = on ? 1 : 0 }
    const stream = (el, text, t) => {
      if (!el) return
      const n = Math.floor(t * text.length)
      el.textContent = t >= 1 ? text : n > 0 ? text.slice(0, n) + '▌' : ''
    }
    // strike error lines one by one as fixes land
    const heal = (container, t) => {
      if (!container) return
      const lines = container.querySelectorAll('[data-line]')
      const done = Math.floor(t * (lines.length + 0.99))
      lines.forEach((l, i) => {
        if (i < done) l.className = 'whitespace-pre text-fog/40 line-through transition-all duration-300'
        else l.className = 'whitespace-pre text-[#ff8a80] transition-all duration-300'
      })
    }

    const update = (p) => {
      pRef.current = p

      // cinematic camera: slow push-in through chaos, settle for the graph
      const z = 1.25 - seg(p, 0, 0.6) * 0.25 + seg(p, 0.88, 1) * 0.05
      const drift = (1 - seg(p, 0, 0.55)) * 1.2
      stage.current.style.transform = `scale(${z}) rotate(${drift * -0.6}deg)`

      /* beat 1 — 0.00-0.30: errors everywhere */
      show(R.errA, p > 0.03)
      show(R.errB, p > 0.07)
      show(R.errC, p > 0.11)
      const errN = Math.round(12 * seg(p, 0.05, 0.25)) - Math.round(12 * seg(p, 0.34, 0.58))
      if (R.count) {
        R.count.textContent = `${Math.max(0, errN)} ERRORS`
        R.count.style.color = errN > 0 ? '#ff5f56' : 'var(--color-amber)'
      }

      /* beat 2 — 0.30-0.60: the fix streams in, errors diminish */
      show(R.fix, p > 0.30 && p < 0.66)
      stream(R.fixtxt, FIX_DIFF, seg(p, 0.32, 0.56))
      heal(R.errAlines, seg(p, 0.34, 0.52))
      heal(R.errBlines, seg(p, 0.38, 0.56))
      heal(R.errClines, seg(p, 0.42, 0.58))
      // panes calm down: red dots turn amber as their pane heals
      ;[['errA', 0.52], ['errB', 0.56], ['errC', 0.58]].forEach(([k, at]) => {
        const dot = R[k]?.querySelector('[data-dot]')
        if (dot) dot.style.background = p > at ? 'var(--color-amber)' : '#ff5f56'
      })

      /* beat 3 — 0.60-0.90: error panes exit, architecture connects */
      const exit = seg(p, 0.60, 0.68)
      ;['errA', 'errB', 'errC'].forEach((k, i) => {
        if (p > 0.60) R[k].style.opacity = 1 - exit
        R[k].style.translate = `0 ${-exit * (30 + i * 14)}px`
      })
      show(R.arch, p > 0.62)
      ARCH_NODES.forEach((n, i) => {
        const t = seg(p, 0.62 + i * 0.008, 0.66 + i * 0.008)
        const el = R[`anode-${n.id}`]
        if (el) { el.style.opacity = t; el.style.scale = 0.8 + 0.2 * t }
      })
      edgeEls.forEach((el, i) => { el.style.strokeDashoffset = 1 - seg(p, ARCH_EDGES[i].a, ARCH_EDGES[i].b) })
      show(R.packets, p > 0.80 && p < 0.97)
      stream(R.status, STATUS_LINE, seg(p, 0.80, 0.88))

      /* beat 4 — handoff */
      const h = seg(p, 0.92, 1)
      R.scene.style.opacity = 1 - h
      R.handoff.style.opacity = h
      R.handoff.style.pointerEvents = h > 0.5 ? 'auto' : 'none'
      R.hint.style.opacity = p < 0.5 ? 1 : 0
    }

    const st = ScrollTrigger.create({
      trigger: wrap.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => update(self.progress),
    })
    update(0)
    // hero mounts after the gate's placeholder, growing the page by 550vh —
    // every other trigger measured against the old layout, so re-measure
    ScrollTrigger.refresh()
    return () => st.kill()
  }, [])

  return (
    <section ref={wrap} id="top" className="relative h-[650vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <Canvas className="!absolute inset-0" camera={{ position: [0, 0, 11], fov: 50 }} dpr={[1, 1.5]}>
          <Particles pRef={pRef} />
        </Canvas>

        <div ref={(el) => (refs.current.scene = el)} className="absolute inset-0">
          <div ref={stage} className="absolute inset-0 will-change-transform">

            {/* error panes, deliberately askew — this is the chaos */}
            <Pane rid="errA" refs={refs} title="build — failing" className="w-[min(460px,80vw)]" style={{ left: '12%', top: '18%', rotate: '-2.5deg' }}>
              <ErrLines rid="errAlines" refs={refs} lines={ERR_BUILD} />
            </Pane>
            <Pane rid="errB" refs={refs} title="prod logs — 03:12 AM" className="w-[min(430px,80vw)]" style={{ right: '10%', top: '30%', rotate: '1.8deg' }}>
              <ErrLines rid="errBlines" refs={refs} lines={ERR_SERVER} />
            </Pane>
            <Pane rid="errC" refs={refs} title="ci pipeline" className="w-[300px]" style={{ left: '26%', top: '58%', rotate: '-1.2deg' }}>
              <ErrLines rid="errClines" refs={refs} lines={ERR_CI} />
            </Pane>

            {/* the fix */}
            <Pane rid="fix" refs={refs} title="fix — applying" className="w-[min(500px,86vw)] border-amber/60" style={{ left: '50%', top: '44%', translate: '-50% -50%', zIndex: 10 }}>
              <pre className="whitespace-pre-wrap text-paper/90" ref={(el) => (refs.current.fixtxt = el)} />
            </Pane>

            {/* the architecture that emerges */}
            <div ref={(el) => (refs.current.arch = el)} className="absolute left-1/2 top-1/2 h-[72vh] w-[min(760px,92vw)] -translate-x-1/2 -translate-y-1/2 opacity-0">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {ARCH_EDGES.map((e, i) => (
                  <path key={i} ref={(el) => (refs.current[`aedge-${i}`] = el)} d={e.d} pathLength="1" fill="none" stroke="var(--color-cyan)" strokeOpacity="0.95" strokeWidth="1.6" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 3px rgba(79,216,224,0.6))' }} />
                ))}
                <g ref={(el) => (refs.current.packets = el)} className="opacity-0 transition-opacity duration-700">
                  {ARCH_EDGES.map((e, i) => (
                    <circle key={i} r="0.7" fill="var(--color-amber)">
                      <animateMotion dur={`${1.6 + (i % 3) * 0.5}s`} repeatCount="indefinite" path={e.d} />
                    </circle>
                  ))}
                </g>
              </svg>
              {ARCH_NODES.map((n) => (
                <div key={n.id} ref={(el) => (refs.current[`anode-${n.id}`] = el)} className="absolute -translate-x-1/2 -translate-y-1/2 border border-cyan/50 bg-panel px-3 py-1.5 opacity-0" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
                  <span className="mono-label text-paper/85">{n.label}</span>
                </div>
              ))}
              <p className="mono-label absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-cyan" ref={(el) => (refs.current.status = el)} />
            </div>
          </div>
        </div>

        {/* HUD: nameplate, nav, error counter */}
        <header className="absolute top-6 left-6 right-6 flex items-start justify-between md:top-10 md:left-12 md:right-12">
          <div>
            <p className="mono-label !text-[0.8125rem] font-semibold text-paper [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">ABDEL RAHMAN EL KOUCHE</p>
            <p className="mono-label mt-1 text-amber [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">SOFTWARE / AI ENGINEER — BEIRUT</p>
          </div>
          <nav className="mono-label hidden gap-6 text-fog md:flex">
            <a className="hover:text-amber" href="#projects">PROJECTS</a>
            <a className="hover:text-amber" href="#experience">EXPERIENCE</a>
            <a className="hover:text-amber" href="#contact">CONTACT</a>
          </nav>
        </header>
        <p ref={(el) => (refs.current.count = el)} className="mono-label absolute bottom-6 right-6 md:bottom-10 md:right-12" />
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <p ref={(el) => (refs.current.hint = el)} className="mono-label !text-sm animate-bounce text-center text-fog transition-opacity duration-500">
            SCROLL ▼
          </p>
        </div>

        {/* handoff */}
        <div ref={(el) => (refs.current.handoff = el)} className="pointer-events-none absolute inset-0 flex flex-col items-start justify-end p-8 opacity-0 md:p-16">
          <p className="mono-label text-cyan">THIS IS THE JOB</p>
          <h1 className="display mt-3 max-w-4xl text-4xl font-black uppercase leading-[0.95] md:text-7xl">
            Ambiguity in. <span className="text-amber">Working software out.</span>
          </h1>
        </div>
      </div>
    </section>
  )
}

/* ----------------- static fallback: mobile / no WebGL ---------------------- */

function StaticHero() {
  return (
    <section id="top" className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-6 py-16">
      <video src="/hero-scrub.mp4" autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="relative">
        <p className="mono-label text-amber">ABDEL RAHMAN EL KOUCHE</p>
        <p className="mono-label mt-1 text-fog">SOFTWARE / AI ENGINEER — BEIRUT</p>
        <h1 className="display mt-10 text-4xl font-black uppercase leading-[0.95]">
          Ambiguity in. <span className="text-amber">Working software out.</span>
        </h1>
        <div className="mt-8 border border-line bg-panel/95">
          <p className="mono-label border-b border-line px-3 py-1.5 text-fog">before → after</p>
          <pre className="whitespace-pre-wrap px-3 py-2 font-mono text-[11px] leading-relaxed text-paper/85">{`${ERR_SERVER.join('\n')}\n\n${FIX_DIFF}\n\n${STATUS_LINE}`}</pre>
        </div>
      </div>
    </section>
  )
}

export default function Hero() {
  const [full, setFull] = useState(null)
  useEffect(() => {
    // everyone gets the full scene; StaticHero only if the device truly can't
    // do WebGL (otherwise the canvas would just render blank)
    let webgl = false
    try {
      const c = document.createElement('canvas')
      webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
    } catch { /* no webgl */ }
    setFull(webgl)
  }, [])
  if (full === null) return <section className="h-screen" />
  return full ? <FullHero /> : <StaticHero />
}
