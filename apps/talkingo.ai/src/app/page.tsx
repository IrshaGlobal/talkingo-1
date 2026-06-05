'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  ChevronRight,
  Globe2,
  GraduationCap,
  Headphones,
  MessageCircle,
  Mic,
  Phone,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { TalkingoSparkles } from '@/components/ui/talkingo-sparkles'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ConversationPage } from '@/components/conversation/ConversationPage'

/* ── Data ────────────────────────────────────────────────────────── */

const modes = [
  { icon: MessageCircle, name: 'Chat', desc: 'Type at your own pace with AI guidance', hint: 'Great for beginners' },
  { icon: Mic, name: 'Handsfree', desc: 'Speak naturally with real-time voice AI', hint: 'Build speaking confidence' },
  { icon: Globe2, name: 'Native', desc: 'Full immersion in your target language', hint: 'Think in the language' },
  { icon: Phone, name: 'Live Call', desc: 'Simulated voice calls with AI tutors', hint: 'Real-world pressure' },
]

const personas = [
  { name: 'Eli', desc: 'Friendly guide for easy, warm conversations', color: '#FFB800', level: 'A1-A2' },
  { name: 'Alex', desc: 'Coach who pushes your daily speaking confidence', color: '#00E5FF', level: 'A2-B1' },
  { name: 'Dr. Luma', desc: 'Linguist who breaks down every nuance', color: '#B388FF', level: 'B1-C1' },
  { name: 'Sofia', desc: 'Cultural guide through real-world scenarios', color: '#FF4081', level: 'All' },
  { name: 'Riko', desc: 'Precision teacher for advanced fluency', color: '#00E676', level: 'B2-C2' },
  { name: 'Marco', desc: 'Energetic partner for fast-paced natural talk', color: '#FF9100', level: 'A2-B2' },
]

const levels = [
  'First Words', 'Building Blocks', 'Survival Mode', 'Daily Explorer',
  'Conversation Ready', 'Confident Talker', 'Confident Speaker', 'Advanced Talker',
  'Almost Native', 'Expert Speaker', 'Precision Speaker', 'Mastery',
]

const languages = [
  { native: 'Español', english: 'Spanish', code: 'es' },
  { native: '日本語', english: 'Japanese', code: 'ja' },
  { native: '中文', english: 'Mandarin', code: 'zh' },
  { native: 'Français', english: 'French', code: 'fr' },
  { native: 'Deutsch', english: 'German', code: 'de' },
  { native: 'Italiano', english: 'Italian', code: 'it' },
  { native: 'Português', english: 'Portuguese', code: 'pt' },
  { native: 'Русский', english: 'Russian', code: 'ru' },
  { native: 'العربية', english: 'Arabic', code: 'ar' },
  { native: '한국어', english: 'Korean', code: 'ko' },
  { native: 'हिन्दी', english: 'Hindi', code: 'hi' },
  { native: 'Türkçe', english: 'Turkish', code: 'tr' },
]

const scenarios = [
  'Order Coffee', 'Meet Someone New', 'Ask for Directions', 'Go Shopping',
  'At a Restaurant', 'Talk About Hobbies', 'Make a Phone Call', 'Visit the Doctor',
  'Book a Hotel', 'Job Interview', 'At the Airport', 'Daily Routine',
  'Talk About Weather', 'Ask for Help', 'Share Opinions', 'Plan a Trip',
  'Order Food Delivery', 'Small Talk', 'At the Bank', 'Emergency Situations',
]

const pricingPlans = [
  { name: 'Free', price: '$0', desc: 'Get started and explore', features: ['Daily warm-up prompts', 'Basic AI voice practice', '1 conversation mode'], popular: false },
  { name: 'Pro', price: '$12', desc: 'For serious fluency seekers', features: ['Unlimited voice sessions', 'All 4 conversation modes', 'Advanced corrections & feedback', 'Progress analytics & insights', 'All 6 AI tutors'], popular: true },
  { name: 'Team', price: '$29', desc: 'For groups & families', features: ['Everything in Pro', 'Up to 5 members', 'Shared progress tracking', 'Priority support'], popular: false },
]

const testimonials = [
  { quote: 'I finally look forward to speaking practice. The AI tutors feel like real conversation partners — not robots.', name: 'Sofia M.', role: 'Learning Spanish' },
  { quote: 'The Native mode pushed me to think in Portuguese instead of translating in my head. Game changer.', name: 'James K.', role: 'Portuguese, B1' },
  { quote: 'I tried Duolingo, Babbel, and Pimsleur. Nothing comes close to how natural this feels.', name: 'Aiko T.', role: 'English learner' },
]

const faqs = [
  { q: 'Do I need to be fluent in anything to start?', a: 'Not at all. Every AI tutor adapts to your current level — from absolute beginner to near-native. You just show up and speak.' },
  { q: 'How is this different from Duolingo or Babbel?', a: 'Those teach you about a language. Talkingo lets you live it — real conversations, real corrections, real fluency. No drills, no flashcards.' },
  { q: 'Can I practice any language?', a: 'Yes. We support 23 languages including Spanish, Japanese, Chinese, French, German, Arabic, Korean, and many more.' },
  { q: 'How does the AI know my level?', a: 'We use a 12-level system that tunes vocabulary, speed, and complexity automatically. You can jump between levels anytime.' },
]

const stats = [
  { value: '23', label: 'Languages', color: '#FFB800' },
  { value: '300+', label: 'Scenarios', color: '#00E5FF' },
  { value: '12', label: 'Levels', color: '#FF4081' },
  { value: '6', label: 'AI Tutors', color: '#B388FF' },
]

/* ── Entry point — auth guard ───────────────────────────────────── */

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (user) return <ConversationPage />

  return <LandingPage />
}

/* ── Public landing page ───────────────────────────────────────────── */

function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { scrollYProgress } = useScroll()
  const navOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1])

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#0a0a2e_0%,_#050510_40%,_#020208_100%)] text-white overflow-x-hidden">

      {/* ── STICKY NAV ────────────────────────────────────────────── */}
      <motion.header
        style={{ opacity: navOpacity }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#050510]/80 backdrop-blur-2xl"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/30">T</span>
            <span className="text-base font-semibold tracking-tight">Talkingo</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            <a href="#modes" className="transition hover:text-white">Modes</a>
            <a href="#tutors" className="transition hover:text-white">Tutors</a>
            <a href="#levels" className="transition hover:text-white">Levels</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost" className="hidden text-white/70 hover:text-white hover:bg-white/5 sm:inline-flex text-sm">Sign in</Button></Link>
            <Link href="/signup"><Button className="bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-lg shadow-amber-500/25 text-sm font-semibold px-5">Start free</Button></Link>
          </div>
        </div>
      </motion.header>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Ambient orbs */}
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pt-8">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-center space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/8 px-3.5 py-1.5 text-sm text-amber-200 shadow-lg shadow-amber-900/10">
              <Sparkles className="h-3.5 w-3.5" />
              Don&apos;t study the language. <span className="font-semibold text-amber-100">Live it.</span>
            </div>

            <div className="space-y-5">
              <h1 className="font-display max-w-2xl text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
                <span className="text-white">Speak real conversations.</span>
                <br />
                <span className="text-vibrant">Not textbook drills.</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-white/60 md:text-xl">
                Real-time AI conversations that adapt to your level, pace, and goals. 
                Practice Spanish, Japanese, French &mdash; 23 languages &mdash; with tutors who feel human.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] transition-all text-base px-8 py-6 rounded-2xl border-0">
                  Start speaking free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#modes">
                <Button variant="outline" size="lg" className="border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white text-base px-7 py-6 rounded-2xl">
                  See how it works
                </Button>
              </Link>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-8 text-sm">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-white/40">{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right column — conversation demo */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center"
          >
            <div className="w-full rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl glow-amber">
              <div className="rounded-[28px] border border-white/[0.06] bg-[#08081a]/90 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/10 text-xs font-bold text-amber-300 border border-amber-400/20">AI</div>
                    <div>
                      <p className="text-sm font-medium text-white">Eli &middot; Spanish</p>
                      <p className="text-xs text-white/30">Friendly guide &bull; A1 level</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 border border-emerald-400/15">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>

                <div className="space-y-3 rounded-2xl bg-black/30 p-4 border border-white/[0.04]">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="conversation-bubble-user p-3 text-sm text-white/90 max-w-[85%]"
                  >
                    Let&rsquo;s practice ordering coffee in Spanish.
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="conversation-bubble-ai p-3 text-sm text-white/90 ml-auto max-w-[85%]"
                  >
                    Claro, ¿qué te gustaría pedir?
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                    className="conversation-bubble-user p-3 text-sm text-white/90 max-w-[85%]"
                  >
                    I&rsquo;d like a latte, please.
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 }}
                    className="conversation-bubble-ai p-3 text-sm text-white/90 ml-auto max-w-[85%]"
                  >
                    <span className="text-amber-300 font-medium">Perfecto.</span> Un café latte &mdash; excelente elección. 
                    <span className="block mt-1 text-[11px] text-white/30">Tip: In Spain, ask for &ldquo;un café con leche&rdquo;</span>
                  </motion.div>
                </div>

                {/* Input bar mock */}
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <Mic className="h-4 w-4 text-amber-400/60" />
                  <span className="text-sm text-white/30">Tap to speak or type your response...</span>
                </div>
              </div>
            </div>
            <TalkingoSparkles className="absolute -right-4 -top-4 h-20 w-20 opacity-60" />
          </motion.div>
        </div>
      </section>

      {/* ── 4 MODES ────────────────────────────────────────────────── */}
      <section id="modes" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400/60 mb-3">Four ways to practice</p>
          <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
            Choose your <span className="text-[#00E5FF]">flow</span>
          </h2>
          <p className="mt-3 text-white/40 max-w-lg mx-auto">
            Every mode adapts to your comfort level — from typing to full immersion.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modes.map((mode, i) => {
            const Icon = mode.icon
            return (
              <motion.div
                key={mode.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="mode-pill group relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06] group-hover:border-amber-400/30 group-hover:bg-amber-400/8 transition-all">
                    <Icon className="h-5 w-5 text-amber-400/80" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{mode.name}</h3>
                  <p className="mt-1.5 text-sm text-white/40 leading-relaxed">{mode.desc}</p>
                  <span className="mt-3 inline-block text-[11px] uppercase tracking-wider text-amber-400/50">{mode.hint}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── 6 AI TUTORS ────────────────────────────────────────────── */}
      <section id="tutors" className="border-t border-white/[0.03] bg-white/[0.01] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#FF4081]/60 mb-3">Meet your AI tutors</p>
            <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
              Six <span className="text-[#FF4081]">personalities</span>. One goal.
            </h2>
            <p className="mt-3 text-white/40 max-w-lg mx-auto">
              Each tutor has a unique teaching style. Pick the one that matches your vibe.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl hover:bg-white/[0.04] transition-all"
                style={{ borderColor: `${p.color}15` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shrink-0"
                    style={{ background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}30` }}
                  >
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{p.name}</h3>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${p.color}15`, color: p.color }}>{p.level}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/40">{p.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12 LEVEL SYSTEM ────────────────────────────────────────── */}
      <section id="levels" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400/60 mb-3">Progression system</p>
          <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
            12 levels from <span className="text-amber-400">first words</span> to mastery
          </h2>
        </motion.div>

        <div className="glass-vibrant rounded-[28px] p-8 shadow-2xl">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {levels.map((level, i) => (
              <motion.div
                key={level}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
              >
                <div className={`level-dot ${i < 6 ? 'active' : ''}`} />
                <div className="min-w-0">
                  <p className="text-sm text-white/80 font-medium truncate">{level}</p>
                  <p className="text-[10px] text-white/20">Level {i + 1}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-white/30">
            Halfway mark at Level 6 &mdash; &ldquo;Confident Talker&rdquo;
          </p>
        </div>
      </section>

      {/* ── 23 LANGUAGES ───────────────────────────────────────────── */}
      <section className="border-t border-white/[0.03] bg-white/[0.01] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#00E5FF]/60 mb-3">Pick your language</p>
            <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
              <span className="text-[#00E5FF]">23</span> languages. Real conversations.
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {languages.map((lang, i) => (
              <motion.div
                key={lang.code}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="lang-card group"
              >
                <span className="text-base font-medium text-white/80 group-hover:text-white transition-colors">{lang.native}</span>
                <span className="text-[10px] text-white/20 hidden sm:block">{lang.english}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 300+ SCENARIOS ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400/60 mb-3">Real-life situations</p>
          <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
            <span className="text-amber-400">300+</span> scenarios from real life
          </h2>
          <p className="mt-3 text-white/40 max-w-lg mx-auto">
            From ordering coffee to job interviews — practice what matters to you.
          </p>
        </motion.div>

        <div className="glass-vibrant rounded-[28px] p-8 shadow-2xl">
          <div className="flex flex-wrap gap-2.5 justify-center">
            {scenarios.map((s, i) => (
              <motion.span
                key={s}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.02 }}
                className="scenario-pill"
              >
                {s}
              </motion.span>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-white/30">And 280+ more across all 12 levels</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────── */}
      <section className="border-t border-white/[0.03] bg-white/[0.01] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400/60 mb-3">Real learners</p>
            <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
              What our <span className="text-vibrant">talkers</span> say
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl glow-amber"
              >
                <div className="mb-4 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-white/70 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 pt-4 border-t border-white/[0.04] flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/15 text-xs font-bold text-amber-300">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-white/30">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400/60 mb-3">Simple pricing</p>
          <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
            Start free. Upgrade when you&rsquo;re <span className="text-amber-400">ready</span>.
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative overflow-hidden rounded-[28px] border p-6 backdrop-blur-xl ${
                plan.popular
                  ? 'border-amber-400/30 bg-gradient-to-b from-amber-400/[0.06] to-transparent glow-amber'
                  : 'border-white/[0.06] bg-white/[0.03]'
              }`}
            >
              {plan.popular && (
                <>
                  <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />
                  <div className="absolute top-0 right-0 rounded-bl-2xl rounded-tr-[28px] bg-amber-400/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300 border-b border-l border-amber-400/20">
                    Most popular
                  </div>
                </>
              )}

              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-white/40">{plan.desc}</p>
                <p className="mt-6">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-white/30 ml-1">/mo</span>
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className="mt-6 block">
                  <Button
                    className={`w-full py-5 text-base font-semibold rounded-2xl ${
                      plan.popular
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 border-0'
                        : 'bg-white/8 text-white/80 hover:bg-white/15 border border-white/10'
                    }`}
                  >
                    {plan.name === 'Free' ? 'Get started' : `Start ${plan.name}`}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FAQ + CTA ──────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.03] bg-white/[0.01] py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400/60 mb-3">FAQ</p>
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
              Questions? <span className="text-vibrant">Answers.</span>
            </h2>

            <div className="mt-8 space-y-3">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/[0.04] bg-white/[0.02] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    {faq.q}
                    <ChevronRight
                      className={`h-4 w-4 text-white/30 transition-transform duration-200 ${openFaq === i ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-200 ${
                      openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm text-white/40 leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-[28px] border border-[#FF4081]/25 bg-gradient-to-br from-[#FF4081]/[0.06] via-transparent to-[#FFB800]/[0.04] p-8 glow-rose flex flex-col justify-center"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FF4081]/10 blur-3xl" />
            <Bot className="relative z-10 h-8 w-8 text-[#FF4081]/70" />
            <h3 className="relative z-10 mt-4 text-2xl font-bold text-white">
              Ready to have real conversations?
            </h3>
            <p className="relative z-10 mt-3 text-sm text-white/40 leading-relaxed">
              Join thousands of learners who stopped studying and started speaking. 
              Your first conversation is free.
            </p>
            <div className="relative z-10 mt-6 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-[#FF4081] to-[#FF6B9D] text-white font-semibold shadow-xl shadow-[#FF4081]/30 hover:shadow-[#FF4081]/50 border-0 px-6 py-5 rounded-2xl">
                  Start your first conversation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.03] bg-[#020208]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-4 lg:px-8">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-slate-950">T</span>
              <span className="text-base font-semibold tracking-tight text-white">Talkingo</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/30">
              A voice-first AI language speaking studio. Build real fluency through natural conversation &mdash; not rigid exercises.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-white/30">Product</h4>
            <ul className="space-y-2.5 text-sm">
              {['Modes', 'Tutors', 'Levels', 'Pricing'].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase()}`} className="text-white/30 transition-colors hover:text-white/60">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-white/30">Company</h4>
            <ul className="space-y-2.5 text-sm">
              {['About', 'Blog', 'Contact'].map((link) => (
                <li key={link}><span className="text-white/20 cursor-default">{link}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.03] px-6 py-5 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-white/20 md:flex-row">
            <p>&copy; {new Date().getFullYear()} Talkingo. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="transition-colors hover:text-white/40">Privacy Policy</span>
              <span className="transition-colors hover:text-white/40">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
