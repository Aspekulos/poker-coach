'use client'

import { useEffect, useRef, useState } from 'react'

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

export default function PlayerCoach() {
  const [status, setStatus] = useState<Status>('initializing')
  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [cached, setCached] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('')
  const [activePhase, setActivePhase] = useState<PhaseKey>('early')
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

  return (
    <div style={{ color: C.white }}>
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
                <p style={sectionTitle}>💪 Points forts</p>
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
                <p style={sectionTitle}>🎯 Leaks prioritaires</p>
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
    </div>
  )
}
