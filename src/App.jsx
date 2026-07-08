import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Hero from './Hero.jsx'

gsap.registerPlugin(ScrollTrigger)

/* ---------------------------------- data ---------------------------------- */

const PROJECTS = [
  {
    tag: 'AGENTIC LEGAL AI',
    name: 'Verdict',
    stack: 'Python · PostgreSQL · QLoRA',
    problem: 'Reviewing dense contracts is slow and error-prone; findings are hard to audit.',
    system: 'Run-based agentic pipeline: Harvey retrieves evidence, Kira detects risks, an admin agent merges findings into an auditable review with mandatory human approval.',
    decisions: 'LLMOps workflow for Kira: CUAD/MAUD data, DeepSeek distillation, Gemma 26B QLoRA fine-tuning, evaluation metrics, deployment automation.',
    outcome: 'Uploaded PDFs become clause-level risk findings with evidence anchors.',
    link: 'https://github.com/Abedishere/Verdict',
  },
  {
    tag: 'MULTI-AGENT ORCHESTRATION',
    name: 'Unicode',
    stack: 'Python · CLI · CI/CD',
    problem: 'Different coding models are good at different tasks; using one for everything wastes their strengths.',
    system: 'CLI pipeline coordinating Claude, Codex and Qwen with a fault-tolerant fallback chain, parallel execution, automatic git integration and persistent cross-session memory.',
    decisions: 'Fallback routing (Claude → Codex → Qwen) instead of a single-model bet; CI with automated linting across the orchestration system.',
    outcome: 'End-to-end software engineering workflows run without babysitting.',
    link: 'https://github.com/Abedishere/Unicode',
  },
  {
    tag: 'AI BOOKING AGENT',
    name: 'Nomada',
    stack: 'Python · React · Flask · PostgreSQL',
    problem: 'Multi-step reservation flows are fragmented and demand constant human handling.',
    system: 'LLM-driven booking agent with JSON-based state management, handling multi-step reservation workflows in natural language over a React + Flask + PostgreSQL stack.',
    decisions: 'Agentic workflows orchestrate payment gateway integration, database operations and automated backups; Docker for containerization.',
    outcome: 'A conversation ends in a confirmed, paid booking.',
    link: 'https://github.com/Abedishere/Nomada',
  },
  {
    tag: 'HEALTHCARE SCHEDULING',
    name: 'Appointly',
    stack: '.NET 9 · C# · PostgreSQL',
    problem: 'Healthcare appointment booking creates friction for both patients and clinics.',
    system: 'REST backend with 15+ endpoints, JWT auth, OTP verification with salting, PostgreSQL functions with a micro ORM.',
    decisions: 'Security-first database architecture; 80+ xUnit test cases; built with a 4-person team.',
    outcome: 'A request becomes a confirmed appointment, reliably.',
    link: null, // private repo (CME)
  },
]

const MORE_WORK = [
  { name: 'Healthcare backend @ CME Offshore', desc: 'Full .NET backend for a Lebanese doctor-patient app. MVC, stored procedures, no ORM, SMTP auth flows.' },
  { name: 'Cellular network detector', desc: 'Flask + Kotlin + PostgreSQL pipeline logging signal strength, SINR/SNR, cell ID and network type.' },
  { name: 'X-ray diagnosis ML', desc: 'Machine-learning pipeline for X-ray image diagnosis with a frontend app.' },
  { name: 'Library management system', desc: 'Java OOP course project automating borrowing, returns and catalog updates.' },
]

const EXPERIENCE = [
  { when: '2025 — NOW', role: 'Programming tutor', org: 'Beirut', desc: 'Teaching intro programming: foundations and algorithms.' },
  { when: 'JUL — AUG 2025', role: 'Backend intern', org: 'CME Offshore', desc: 'Designed and built the full backend for a healthcare app in .NET and PostgreSQL, led backend testing, presented to a jury.' },
  { when: 'FEB — MAR 2025', role: 'Backend training', org: 'Inmind.AI', desc: '.NET Core, REST, Keycloak auth, Hangfire jobs, Docker, DDD.' },
  { when: '2022 — 2026', role: 'B.E. Computer & Communications Engineering', org: 'AUB', desc: 'American University of Beirut. GPA 3.72 / 4.0.' },
]

const STACK = ['Python', 'C#', '.NET', 'Java', 'React', 'Flask', 'PostgreSQL', 'Docker', 'Kubernetes', 'Git', 'LLM pipelines', 'QLoRA fine-tuning']

/* ------------------------------- statement -------------------------------- */

const THESIS_A = 'I take ambiguous problems and turn them into '
const THESIS_B = 'structured, usable systems.'

function Statement() {
  const a = useRef(null)
  const b = useRef(null)
  const sec = useRef(null)
  const inner = useRef(null)

  useEffect(() => {
    const total = THESIS_A.length + THESIS_B.length
    const st = ScrollTrigger.create({
      trigger: sec.current,
      // pin the inner div, not the section: pin-spacer must not be inserted
      // between React-managed siblings of <main> or reconciliation crashes
      pin: inner.current,
      start: 'top 40%',
      end: '+=120%',
      scrub: true,
      onUpdate: (self) => {
        const n = Math.floor(self.progress * total)
        a.current.textContent = THESIS_A.slice(0, n)
        b.current.textContent = n > THESIS_A.length ? THESIS_B.slice(0, n - THESIS_A.length) : ''
        b.current.dataset.cursor = self.progress < 1 ? '▌' : ''
      },
    })
    // kill(true) reverts the pin-spacer DOM mutation, otherwise React crashes on remount
    return () => st.kill(true)
  }, [])

  return (
    <section ref={sec} className="relative">
      <div ref={inner} className="blueprint border-y border-line px-8 py-28 md:px-16 md:py-40">
      <p className="mono-label text-amber">THESIS</p>
      <h2 className="display mt-6 min-h-[2.1em] max-w-5xl text-4xl font-black uppercase leading-[1.02] md:text-7xl">
        <span ref={a} /><span ref={b} className="text-amber after:content-[attr(data-cursor)]" />
      </h2>
      <div className="mt-12 flex flex-wrap gap-x-12 gap-y-4">
        {['I start by reducing ambiguity.', 'I map the problem into components.', 'I connect the system around the user outcome.', 'The output has to work, not just look good.'].map((t, i) => (
          <p key={t} className="mono-label text-fog" data-reveal>{String(i).padStart(2, '0')} — {t}</p>
        ))}
      </div>
      </div>
    </section>
  )
}

/* -------------------------------- projects -------------------------------- */

function ProjectCard({ p, i }) {
  return (
    <article data-reveal className="group relative border border-line bg-panel p-8 transition-colors hover:border-amber/60 md:p-10">
      <div className="flex items-baseline justify-between gap-4">
        <p className="mono-label text-cyan">{p.tag}</p>
        <p className="mono-label text-fog">P{String(i + 1).padStart(2, '0')}</p>
      </div>
      <h3 className="display mt-4 text-4xl font-black uppercase md:text-5xl">{p.name}</h3>
      <p className="mono-label mt-2 text-fog">{p.stack}</p>
      <dl className="mt-8 space-y-5 text-[15px] leading-relaxed">
        {[['Problem', p.problem], ['System', p.system], ['Decisions', p.decisions], ['Outcome', p.outcome]].map(([k, v]) => (
          <div key={k} className="grid gap-1 md:grid-cols-[110px_1fr] md:gap-6">
            <dt className="mono-label pt-1 text-amber">{k}</dt>
            <dd className="text-paper/85">{v}</dd>
          </div>
        ))}
      </dl>
      {p.link ? (
        <a href={p.link} target="_blank" rel="noreferrer" className="mono-label mt-8 inline-block border border-line px-4 py-2 text-fog transition-colors hover:border-amber hover:text-amber">
          GITHUB ↗
        </a>
      ) : (
        <p className="mono-label mt-8 inline-block border border-line px-4 py-2 text-fog/50">PRIVATE — BUILT AT CME</p>
      )}
    </article>
  )
}

function Projects() {
  return (
    <section id="projects" className="px-8 py-28 md:px-16">
      <p className="mono-label text-amber">02 / SELECTED SYSTEMS</p>
      <h2 className="display mt-4 text-4xl font-black uppercase md:text-6xl" data-reveal>Working outputs</h2>
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {PROJECTS.map((p, i) => <ProjectCard key={p.name} p={p} i={i} />)}
      </div>
      <div className="mt-16">
        <p className="mono-label text-fog">MORE WORK</p>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {MORE_WORK.map((m) => (
            <div key={m.name} data-reveal className="flex flex-col gap-1 py-5 md:flex-row md:items-baseline md:gap-10">
              <p className="w-72 shrink-0 font-medium">{m.name}</p>
              <p className="text-sm text-fog">{m.desc}</p>
            </div>
          ))}
        </div>
        <a href="https://github.com/Abedishere" target="_blank" rel="noreferrer" className="mono-label mt-6 inline-block text-cyan hover:text-amber">
          FULL ARCHIVE ON GITHUB ↗
        </a>
      </div>
    </section>
  )
}

/* ------------------------------- experience ------------------------------- */

function Experience() {
  return (
    <section id="experience" className="blueprint border-y border-line px-8 py-28 md:px-16">
      <p className="mono-label text-amber">03 / EXPERIENCE</p>
      <h2 className="display mt-4 text-4xl font-black uppercase md:text-6xl" data-reveal>Background</h2>
      <div className="mt-14 max-w-3xl">
        {EXPERIENCE.map((e) => (
          <div key={e.role} data-reveal className="grid gap-2 border-l-2 border-line py-6 pl-8 transition-colors hover:border-amber md:grid-cols-[160px_1fr] md:gap-8">
            <p className="mono-label pt-1 text-cyan">{e.when}</p>
            <div>
              <h3 className="text-lg font-semibold">{e.role} <span className="text-fog">· {e.org}</span></h3>
              <p className="mt-1 text-sm leading-relaxed text-fog">{e.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap gap-2" data-reveal>
        {STACK.map((s) => (
          <span key={s} className="mono-label border border-line px-3 py-2 text-fog">{s}</span>
        ))}
      </div>
      <a href="/AbdelRahman-ElKouche-CV.pdf" download className="mono-label mt-12 inline-block border border-amber bg-amber px-6 py-3 text-ink transition-colors hover:bg-transparent hover:text-amber">
        DOWNLOAD CV ↓
      </a>
    </section>
  )
}

/* --------------------------------- contact -------------------------------- */

const EMAIL = 'abdelrahmanelkouche@gmail.com'

function Contact() {
  const [copied, setCopied] = useState(false)
  // mailto opens the default mail app; if none is set up, the clipboard copy is
  // the backup so the address is never lost to a dead click
  const copy = () => {
    navigator.clipboard?.writeText(EMAIL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <footer id="contact" className="px-8 py-28 md:px-16 md:py-36">
      <p className="mono-label text-amber">04 / CONTACT</p>
      <a href={`mailto:${EMAIL}`} onClick={copy} className="display mt-6 block break-all text-3xl font-black uppercase leading-tight transition-colors hover:text-amber md:text-6xl" data-reveal>
        abdelrahmanelkouche<br />@gmail.com
      </a>
      <p className="mono-label mt-4 h-4 text-cyan transition-opacity duration-300" style={{ opacity: copied ? 1 : 0 }}>
        COPIED TO CLIPBOARD ✓
      </p>
      <div className="mt-12 flex flex-wrap gap-8">
        <a className="mono-label text-fog hover:text-amber" href="https://github.com/Abedishere" target="_blank" rel="noreferrer">GITHUB ↗</a>
        <a className="mono-label text-fog hover:text-amber" href="https://www.linkedin.com/in/abdel-rahman-el-kouche-27603927a/" target="_blank" rel="noreferrer">LINKEDIN ↗</a>
        <a className="mono-label text-fog hover:text-amber" href="tel:+96170083063">+961 70 083 063</a>
      </div>
      <p className="mono-label mt-20 text-line">BUILT FROM AMBIGUITY — BEIRUT, {new Date().getFullYear()}</p>
    </footer>
  )
}

/* ----------------------------------- app ---------------------------------- */

export default function App() {
  useEffect(() => {
    // Lenis smooth scroll, tuned light so the trackpad still feels like a trackpad
    const lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 1 })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          autoAlpha: 0,
          y: 32,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        })
      })
    })
    return () => { ctx.revert(); gsap.ticker.remove(raf); lenis.destroy() }
  }, [])

  return (
    <main className="grain">
      <Hero />
      <Statement />
      <Projects />
      <Experience />
      <Contact />
    </main>
  )
}
