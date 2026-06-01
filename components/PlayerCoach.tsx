'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

type Severity = 'high' | 'medium' | 'low'

interface Leak {
  title: string
  description: string
  severity: Severity
}

interface PositionEntry {
  score: number
  verdict: string
  key_note: string
}

interface PhaseEntry {
  title: string
  strategy: string
}

interface CoachProfile {
  style: string
  style_description: string
  global_score: number
  strengths: string[]
  priority_leaks: Leak[]
  position_analysis: Record<string, PositionEntry>
  tournament_strategy: {
    early: PhaseEntry
    middle: PhaseEntry
    bubble: PhaseEntry
    final_table: PhaseEntry
    short_stack: PhaseEntry
  }
  personalized_strategy: string
  priority_actions: string[]
}

type Status = 'idle' | 'initializing' | 'loading' | 'loaded' | 'error'
type PhaseKey = keyof CoachProfile['tournament_strategy']

const LOADING_MESSAGES = [
  'Lecture de tes mains sauvegardées...',
  'Identification des patterns par position...',
  'Construction de ton profil de joueur...',
  'Rédaction de ta stratégie personnalisée...',
]

const PHASE_ORDER: PhaseKey[] = ['early', 'middle', 'bubble', 'final_table', 'short_stack']

// "DD MMM YYYY" en français — ex: "31 mai 2026"
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

// Palette
const C = {
  card: '#1a1a1a',
  border: 'rgba(255,255,255,0.1)',
  green: '#22c55e',
  red: '#ff4757',
  orange: '#ffa502',
  yellow: '#ffd32a',
  white: '#ffffff',
  muted: 'rgba(255,255,255,0.6)',
}

function scoreColor(score: number): string {
  if (score > 80) return C.green
  if (score >= 60) return C.orange
  return C.red
}

function severityColor(sev: Severity): string {
  if (sev === 'high') return C.red
  if (sev === 'medium') return C.orange
  return C.yellow
}

function severityLabel(sev: Severity): string {
  if (sev === 'high') return 'Critique'
  if (sev === 'medium') return 'Moyen'
  return 'Mineur'
}

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 12,
}

function ScoreCircle({ score, size = 120 }: { score: number; size?: number }) {
  const stroke = 9
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  // Animation de tracé : on part de 0 puis on transitionne vers le score réel.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score))
    return () => cancelAnimationFrame(id)
  }, [score])
  const offset = circ * (1 - Math.max(0, Math.min(100, shown)) / 100)
  const color = scoreColor(score)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill={C.white} fontSize={size * 0.26} fontWeight={700}>
        {score}
      </text>
      <text x="50%" y="68%" dominantBaseline="central" textAnchor="middle" fill={C.muted} fontSize={size * 0.1}>
        / 100
      </text>
      <text x="50%" y="84%" dominantBaseline="central" textAnchor="middle" fill="#a1a1aa" fontSize={11}>
        Évaluation coach
      </text>
      <text x="50%" y="95%" dominantBaseline="central" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={9}>
        Estimation Claude
      </text>
    </svg>
  )
}

type ContentBlock =
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'text'; text: string }

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
  imagePreview?: string   // data URL for display only (user messages with image)
}

function CoachChat({ playerProfile }: { playerProfile: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ data: string; mediaType: string; preview: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Auto-scroll vers le dernier message.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      const mediaType = file.type || 'image/jpeg'
      setPendingImage({ data: base64, mediaType, preview: result })
    }
    reader.readAsDataURL(file)
    e.target.value = ''   // allow re-selecting same file
  }

  const send = async () => {
    const text = input.trim()
    if (sending || (!text && !pendingImage)) return

    let content: string | ContentBlock[]
    let imagePreview: string | undefined
    if (pendingImage) {
      content = [
        { type: 'image', source: { type: 'base64', media_type: pendingImage.mediaType, data: pendingImage.data } },
        { type: 'text', text: text || '' },
      ] as ContentBlock[]
      imagePreview = pendingImage.preview
    } else {
      content = text
      imagePreview = undefined
    }

    const next: ChatMsg[] = [...messages, { role: 'user', content, imagePreview }]
    setMessages(next)
    setInput('')
    setPendingImage(null)
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, playerProfile }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de la requête.')
      setMessages(m => [...m, { role: 'assistant', content: String(data.reply ?? '') }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : 'Erreur inconnue'}` }])
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const sendDisabled = sending || (input.trim() === '' && !pendingImage)

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div
        ref={scrollRef}
        style={{
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          height: 420,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 'auto', textAlign: 'center', lineHeight: 1.6 }}>
            Pose une question à ton coach ou décris une main pour qu&apos;il l&apos;analyse.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              background: m.role === 'user' ? 'var(--gold-dim)' : 'var(--bg-surface-2)',
              color: 'var(--text-primary)',
              border: `1px solid ${m.role === 'user' ? 'rgba(201,168,76,0.25)' : 'var(--border-subtle)'}`,
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}
          >
            <>
              {m.imagePreview && (
                <img
                  src={m.imagePreview}
                  alt="Screenshot"
                  style={{ maxWidth: '100%', borderRadius: 6, marginBottom: 4, display: 'block' }}
                />
              )}
              <ReactMarkdown>
                {typeof m.content === 'string'
                  ? m.content
                  : (m.content as ContentBlock[])
                      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
                      .map(b => b.text)
                      .join('')}
              </ReactMarkdown>
            </>
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-dim)', fontSize: 13, fontStyle: 'italic' }}>
            Le coach réfléchit…
          </div>
        )}
      </div>

      {pendingImage && (
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
          <img src={pendingImage.preview} alt="À envoyer" style={{ maxHeight: 80, borderRadius: 6 }} />
          <button
            onClick={() => setPendingImage(null)}
            style={{
              position: 'absolute', top: -6, right: -6,
              background: '#444', color: '#fff', border: 'none',
              borderRadius: '50%', width: 18, height: 18, fontSize: 10,
              cursor: 'pointer', lineHeight: '18px', textAlign: 'center',
            }}
          >×</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        {/* Paperclip button */}
        <button
          onClick={() => fileRef.current?.click()}
          title="Joindre une capture d'écran"
          style={{
            background: 'var(--bg-surface-2)',
            color: 'var(--text-dim)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, fontSize: 16,
          }}
        >
          📎
        </button>

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Écris ton message…"
          style={{
            flex: 1,
            background: 'var(--bg-surface-2)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={sendDisabled}
          style={{
            background: 'var(--gold)',
            color: '#09090b',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: sendDisabled ? 'not-allowed' : 'pointer',
            opacity: sendDisabled ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          Envoyer
        </button>
      </div>
    </div>
  )
}

export default function PlayerCoach() {
  const [status, setStatus] = useState<Status>('initializing')
  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [cached, setCached] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('')
  const [activePhase, setActivePhase] = useState<PhaseKey>('early')
  const [view, setView] = useState<'profile' | 'chat'>('profile')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Auto-chargement du profil depuis le cache au montage. Requête cacheOnly :
  // instantanée si un profil existe, aucune génération Claude sinon → retour à 'idle'.
  useEffect(() => {
    const loadCachedProfile = async () => {
      try {
        const res = await fetch('/api/coach?cacheOnly=true')
        const data = await res.json()
        if (data.error) {
          setStatus('idle')
          return
        }
        const { cached: isCached, generated_at, ...rest } = data
        setProfile(rest as CoachProfile)
        setCached(Boolean(isCached))
        setGeneratedAt(typeof generated_at === 'string' ? generated_at : null)
        setStatus('loaded')
      } catch {
        setStatus('idle')
      }
    }
    loadCachedProfile()
  }, [])

  const generate = async (force = false) => {
    setStatus('loading')
    setErrorMsg('')
    let idx = 0
    setLoadingMessage(LOADING_MESSAGES[0])
    intervalRef.current = setInterval(() => {
      idx = Math.min(idx + 1, LOADING_MESSAGES.length - 1)
      setLoadingMessage(LOADING_MESSAGES[idx])
    }, 3000)

    try {
      const res = await fetch(force ? '/api/coach?force=true' : '/api/coach')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de la génération du profil.')
      const { cached: isCached, generated_at, ...rest } = data
      setProfile(rest as CoachProfile)
      setCached(Boolean(isCached))
      setGeneratedAt(typeof generated_at === 'string' ? generated_at : null)
      setStatus('loaded')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erreur inconnue')
      setStatus('error')
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setLoadingMessage('')
    }
  }

  // ─── Bouton principal — visible uniquement quand aucun profil n'est affiché ───
  const generateButton = (
    <button
      onClick={() => generate(false)}
      disabled={status === 'loading'}
      style={{
        background: C.green,
        color: '#06121f',
        fontWeight: 700,
        padding: '12px 24px',
        borderRadius: 8,
        border: 'none',
        cursor: status === 'loading' ? 'not-allowed' : 'pointer',
        fontSize: 14,
        opacity: status === 'loading' ? 0.6 : 1,
      }}
    >
      {status === 'loading' ? 'Génération…' : '🎓 Générer mon profil de coaching'}
    </button>
  )

  // Résumé textuel du profil envoyé au chat (archétype + points forts + leaks).
  const profileSummary = profile
    ? [
        `Archétype : ${profile.style} — ${profile.style_description}`,
        `Score global : ${profile.global_score}/100`,
        `Points forts : ${profile.strengths.join(' ; ')}`,
        `Leaks prioritaires : ${profile.priority_leaks
          .map(l => `${l.title} (${severityLabel(l.severity)}) — ${l.description}`)
          .join(' ; ')}`,
      ].join('\n')
    : "Le profil de coaching n'a pas encore été généré."

  const tabBar = (
    <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
      {(['profile', 'chat'] as const).map(v => {
        const active = view === v
        return (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              background: active ? 'var(--gold-dim)' : 'transparent',
              color: active ? 'var(--gold)' : C.muted,
              border: `1px solid ${active ? 'rgba(201,168,76,0.4)' : C.border}`,
              borderRadius: 6,
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {v === 'profile' ? 'Profil' : 'Chat'}
          </button>
        )
      })}
    </div>
  )

  return (
    <div style={{ color: C.white }}>
      {tabBar}

      {view === 'chat' && <CoachChat playerProfile={profileSummary} />}

      {view === 'profile' && (
      <>
      {/* Le bouton de génération n'apparaît que si aucun profil n'est affiché
          (et pas pendant l'auto-chargement initial) */}
      {!profile && status !== 'initializing' && (
        <div style={{ marginBottom: 20 }}>{generateButton}</div>
      )}

      {/* INITIALIZING — chargement simple depuis le cache (quasi instantané) */}
      {status === 'initializing' && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 36, color: C.muted, fontSize: 14 }}>
          Chargement du profil…
        </div>
      )}

      {/* LOADING */}
      {status === 'loading' && (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={C.green} strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
          <p style={{ fontSize: 14, color: C.muted, textAlign: 'center', animation: 'poker-pulse 1.8s ease-in-out infinite' }}>
            {loadingMessage}
          </p>
        </div>
      )}

      {/* ERROR */}
      {status === 'error' && (
        <div style={{ ...cardStyle, borderColor: 'rgba(255,71,87,0.4)', background: 'rgba(255,71,87,0.08)' }}>
          <p style={{ color: C.red, fontSize: 14 }}>{errorMsg}</p>
        </div>
      )}

      {/* IDLE */}
      {status === 'idle' && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 36 }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🎓 Ton coach personnalisé</p>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Génère un profil de joueur complet à partir de toutes les mains que tu as analysées :
            style de jeu, forces, leaks prioritaires, analyse par position et stratégie de tournoi.
          </p>
        </div>
      )}

      {/* LOADED — reste affiché même si une régénération échoue */}
      {profile && status !== 'loading' && (
        <>
          {/* En-tête : date de génération (cache) + régénération discrète */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 13, color: C.muted }}>
              {cached && generatedAt ? `Profil généré le ${formatDate(generatedAt)}` : ''}
            </p>
            <button
              onClick={() => generate(true)}
              style={{
                background: 'transparent',
                color: C.muted,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ↺ Régénérer
            </button>
          </div>

          {/* SECTION 1 — Profil joueur */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
              <ScoreCircle score={profile.global_score} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <span
                  style={{
                    display: 'inline-block',
                    background: 'rgba(34,197,94,0.12)',
                    color: C.green,
                    border: `1px solid rgba(34,197,94,0.3)`,
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  {profile.style}
                </span>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)' }}>
                  {profile.style_description}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
              {/* Points forts */}
              <div>
                <p style={sectionTitle}>Points forts</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {profile.strengths.map((s, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.5 }}>
                      <span style={{ color: C.green }}>✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Leaks prioritaires */}
              <div>
                <p style={sectionTitle}>Leaks prioritaires</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {profile.priority_leaks.map((leak, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderLeft: `3px solid ${severityColor(leak.severity)}`,
                        borderRadius: 6,
                        padding: '8px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{leak.title}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: severityColor(leak.severity),
                            background: 'rgba(255,255,255,0.06)',
                            padding: '1px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                          }}
                        >
                          {severityLabel(leak.severity)}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{leak.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 — Analyse par position */}
          <div style={cardStyle}>
            <p style={sectionTitle}>📍 Analyse par position</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {Object.entries(profile.position_analysis)
                .sort((a, b) => a[1].score - b[1].score)
                .map(([pos, p]) => (
                  <div
                    key={pos}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 14,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{pos === '?' ? 'Inconnue' : pos}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: scoreColor(p.score) }}>{p.score}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, p.score))}%`, height: '100%', background: scoreColor(p.score) }} />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: scoreColor(p.score), marginBottom: 2 }}>{p.verdict}</p>
                    <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{p.key_note}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* SECTION 3 — Stratégie par phase */}
          <div style={cardStyle}>
            <p style={sectionTitle}>🏆 Stratégie par phase de tournoi</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {PHASE_ORDER.map(key => {
                const active = activePhase === key
                return (
                  <button
                    key={key}
                    onClick={() => setActivePhase(key)}
                    style={{
                      background: active ? 'rgba(34,197,94,0.12)' : 'transparent',
                      color: active ? C.green : C.muted,
                      border: `1px solid ${active ? 'rgba(34,197,94,0.4)' : C.border}`,
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {profile.tournament_strategy[key].title}
                  </button>
                )
              })}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 6 }}>
                {profile.tournament_strategy[activePhase].title}
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)' }}>
                {profile.tournament_strategy[activePhase].strategy}
              </p>
            </div>
          </div>

          {/* SECTION 4 — Plan d'action */}
          <div style={cardStyle}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Tes 3 priorités cette semaine</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {profile.priority_actions.map((action, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: C.green,
                      color: '#06121f',
                      fontWeight: 700,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </span>
                  <p style={{ fontSize: 14, lineHeight: 1.5, paddingTop: 4 }}>{action}</p>
                </div>
              ))}
            </div>

            <div
              style={{
                background: 'rgba(34,197,94,0.06)',
                border: `1px solid rgba(34,197,94,0.2)`,
                borderRadius: 8,
                padding: 16,
              }}
            >
              <p style={sectionTitle}>Ta stratégie personnalisée</p>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.9)' }}>
                {profile.personalized_strategy}
              </p>
            </div>
          </div>
        </>
      )}
      </>
      )}
    </div>
  )
}
