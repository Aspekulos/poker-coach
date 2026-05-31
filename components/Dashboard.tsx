'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { getAnalysisHistory, AnalysisRecord } from '@/lib/supabase'

interface Tournament {
  id: string
  played_at: string
  tournament_name: string | null
  buy_in: number | string
  total_players: number | null
  position: number
  gain: number | string
  gain_placement: number | string
  gain_bounties: number | string
  type: string
  notes: string | null
}

const C = {
  bg:          '#0c0c18',
  bgElevated:  '#111120',
  border:      'rgba(255,255,255,0.07)',
  text:        '#eeeef5',
  muted:       'rgba(255,255,255,0.35)',
  dim:         'rgba(255,255,255,0.15)',
  green:       '#22c55e',
  greenDim:    'rgba(34,197,94,0.08)',
  greenBorder: 'rgba(34,197,94,0.22)',
  red:         '#ef4444',
  orange:      '#f59e0b',
}

const TYPES = ['KO', 'Classic', 'Rebuy', 'Autre']

// Postgres numeric peut revenir en string : on coerce systématiquement.
const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

const eur = (n: number, sign = false): string =>
  `${sign && n > 0 ? '+' : ''}${n.toFixed(2)} €`

// "2026-05-27" (ou ISO) → "27/05"
const dayMonth = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00Z' : iso)
  if (isNaN(d.getTime())) return '—'
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`
}

// Jour de session UTC d'une analyse (aligné sur DATE(played_at) côté Postgres)
const sessionKey = (iso?: string): string | null => {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

const mono = "'JetBrains Mono','Fira Code',monospace"

const sectionTitle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  color: C.dim,
  textTransform: 'uppercase',
  letterSpacing: '0.09em',
  marginBottom: 12,
}

interface BankrollTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { date: string; name?: string | null } }>
}

function BankrollTooltip({ active, payload }: BankrollTooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: C.muted, marginBottom: 4 }}>{p.payload.date}</p>
      {p.payload.name && <p style={{ color: C.muted, marginBottom: 4 }}>{p.payload.name}</p>}
      <p style={{ color: p.value >= 0 ? C.green : C.red, fontWeight: 600 }}>
        Solde : {eur(p.value, true)}
      </p>
    </div>
  )
}

interface BarTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { date: string; total: number } }>
  label?: string
}

function ScoreBarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: C.muted, marginBottom: 4 }}>{label}</p>
      <p style={{ color: C.green, fontWeight: 600 }}>Score : {payload[0].value}%</p>
      <p style={{ color: C.muted }}>{payload[0].payload.total} mains</p>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string
}) {
  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{
          width: 22, height: 22,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.muted,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 9, fontWeight: 600,
          color: C.dim,
          textTransform: 'uppercase', letterSpacing: '0.09em',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: mono,
        fontSize: 22, fontWeight: 500,
        color, lineHeight: 1, marginBottom: 4,
      }}>{value}</div>
      <div style={{ fontSize: 10, color: C.dim }}>{sub}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
}

const fieldLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 600,
  color: C.dim,
  marginBottom: 5, display: 'block',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

const emptyForm = (today: string) => ({
  played_at: today,
  tournament_name: '',
  buy_in: '',
  total_players: '',
  position: '',
  gain_placement: '',
  gain_bounties: '',
  type: 'KO',
  notes: '',
})

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10)

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm(today))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const loadTournaments = async () => {
    const res = await fetch('/api/tournaments')
    const data = await res.json()
    if (Array.isArray(data)) setTournaments(data)
  }

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadTournaments(),
        getAnalysisHistory().then(setAnalyses).catch(() => {}),
      ])
      setLoading(false)
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.played_at || form.buy_in === '' || form.position === '') {
      setFormError('Date, buy-in et position finale sont requis.')
      return
    }
    setSubmitting(true)
    try {
      const gainPlacement = num(form.gain_placement)
      const gainBounties = num(form.gain_bounties)
      const payload = {
        ...form,
        gain_placement: gainPlacement,
        gain_bounties: gainBounties,
        gain: gainPlacement + gainBounties, // gain total = placement + primes KO
      }
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'enregistrement.")
      await loadTournaments()
      setForm(emptyForm(today))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k: keyof ReturnType<typeof emptyForm>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  // ─── STATS TOURNOIS ───
  const count = tournaments.length
  const totalBuyIn = tournaments.reduce((s, t) => s + num(t.buy_in), 0)
  const totalGain = tournaments.reduce((s, t) => s + num(t.gain), 0)
  const pnl = totalGain - totalBuyIn
  const roi = totalBuyIn > 0 ? (pnl / totalBuyIn) * 100 : 0
  const itmCount = tournaments.filter(t => num(t.gain) > 0).length
  const itm = count > 0 ? (itmCount / count) * 100 : 0
  const avgBuyIn = count > 0 ? totalBuyIn / count : 0

  // ─── COURBE BANKROLL (running sum, ordre chronologique) ───
  const bankroll = (() => {
    const sorted = [...tournaments].sort((a, b) => a.played_at.localeCompare(b.played_at))
    return sorted.map((t, i) => {
      const balance = sorted
        .slice(0, i + 1)
        .reduce((s, x) => s + num(x.gain) - num(x.buy_in), 0)
      return { date: dayMonth(t.played_at), balance: Math.round(balance * 100) / 100, name: t.tournament_name }
    })
  })()

  // ─── SCORE D'ANALYSE (analyses individuelles) ───
  const hands = analyses.filter(a => !a.is_global)
  const aTotal = hands.length
  const aGood = hands.filter(a => a.verdict === '✅').length
  const aWarn = hands.filter(a => a.verdict === '⚠️').length
  const aBad = hands.filter(a => a.verdict === '❌').length
  const aScore = aTotal > 0 ? Math.round((aGood / aTotal) * 100) : 0

  const positionScores = (() => {
    const order = ['EP', 'MP', 'CO', 'BTN', 'SB', 'BB']
    const map: Record<string, { good: number; total: number }> = {}
    hands.forEach(h => {
      const pos = h.position ?? 'Inconnue'
      if (!map[pos]) map[pos] = { good: 0, total: 0 }
      map[pos].total++
      if (h.verdict === '✅') map[pos].good++
    })
    return Object.entries(map)
      .map(([pos, { good, total }]) => ({
        pos, score: Math.round((good / total) * 100), total,
      }))
      .sort((a, b) => {
        const ai = order.indexOf(a.pos)
        const bi = order.indexOf(b.pos)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
  })()

  const sessionBars = (() => {
    const byDay: Record<string, { good: number; total: number }> = {}
    for (const a of hands) {
      const k = sessionKey(a.played_at)
      if (!k) continue
      if (!byDay[k]) byDay[k] = { good: 0, total: 0 }
      byDay[k].total++
      if (a.verdict === '✅') byDay[k].good++
    }
    return Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ date: dayMonth(k), score: Math.round((v.good / v.total) * 100), total: v.total }))
  })()

  const barColor = (s: number) => (s > 70 ? C.green : s >= 50 ? C.orange : C.red)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: 60, color: C.muted, fontSize: 13 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={C.green} strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
        Chargement du dashboard…
      </div>
    )
  }

  const recent = tournaments.slice(0, 10)

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', color: C.text }}>
      {/* ───────────── COLONNE GAUCHE (≈65%) ───────────── */}
      <div style={{ flexGrow: 1, flexBasis: 560, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Rangée 1 : 4 stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          <StatCard
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
            label="P&L Total" value={eur(pnl, true)}
            sub={`sur ${count} tournoi${count > 1 ? 's' : ''}`}
            color={pnl >= 0 ? C.green : C.red}
          />
          <StatCard
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
            label="ROI" value={`${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`}
            sub={`sur ${count} tournoi${count > 1 ? 's' : ''}`}
            color={roi >= 0 ? C.green : C.red}
          />
          <StatCard
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>}
            label="ITM %" value={`${itm.toFixed(0)}%`}
            sub={`${itmCount} / ${count} ITM`}
            color={C.text}
          />
          <StatCard
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
            label="Buy-in moyen" value={eur(avgBuyIn)}
            sub={`par tournoi`}
            color={C.text}
          />
        </div>

        {/* Rangée 2 : courbe bankroll */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
          <p style={sectionTitle}>Évolution de la bankroll</p>
          {bankroll.length === 0 ? (
            <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
                Aucun tournoi enregistré<br/>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)' }}>
                  Utilise le formulaire pour suivre ta bankroll
                </span>
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bankroll} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.dim }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.dim }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
                <Tooltip content={<BankrollTooltip />} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={C.green}
                  strokeWidth={2}
                  dot={{ fill: C.green, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#4ade80' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rangée 3 : score décisions + score par position */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0 }}>
              Score décisions
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: C.green }}>✓ {aGood}</span>
              <span style={{ fontSize: 10, color: C.orange }}>△ {aWarn}</span>
              <span style={{ fontSize: 10, color: C.red }}>✗ {aBad}</span>
              <span style={{ fontSize: 10, color: C.dim }}>{aTotal} mains</span>
            </div>
          </div>

          {aTotal === 0 ? (
            <p style={{ color: C.dim, fontSize: 13 }}>
              Aucune main analysée. Importe un fichier dans l&apos;onglet Analyser.
            </p>
          ) : (
            <>
              {/* Score global */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{
                  fontFamily: mono,
                  fontSize: 36, fontWeight: 500,
                  color: aScore > 70 ? C.green : aScore >= 50 ? C.orange : C.red,
                  lineHeight: 1,
                }}>{aScore}</span>
                <span style={{ fontSize: 14, color: C.muted }}>%</span>
              </div>
              {/* Barre globale */}
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: '100%', width: `${aScore}%`, background: aScore > 70 ? C.green : aScore >= 50 ? C.orange : C.red, borderRadius: 2 }} />
              </div>

              {/* Score par position */}
              {positionScores.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>
                    Par position
                  </p>
                  {positionScores.map(({ pos, score, total }) => {
                    const col = score > 80 ? C.green : score >= 65 ? C.orange : C.red
                    return (
                      <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontFamily: mono,
                          fontSize: 10, color: C.muted,
                          width: 32, flexShrink: 0,
                        }}>{pos}</span>
                        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${score}%`, background: col, borderRadius: 2, transition: 'width 0.4s ease' }} />
                        </div>
                        <span style={{
                          fontFamily: mono,
                          fontSize: 10, color: col,
                          width: 34, textAlign: 'right', flexShrink: 0,
                        }}>{score}%</span>
                        <span style={{ fontSize: 9, color: C.dim, width: 28, flexShrink: 0 }}>{total}m</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Graphe sessions */}
              {sessionBars.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>
                    Évolution par session
                  </p>
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={sessionBars} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<ScoreBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                        {sessionBars.map((b, i) => <Cell key={i} fill={barColor(b.score)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ───────────── COLONNE DROITE (≈35%) ───────────── */}
      <div style={{ flexGrow: 1, flexBasis: 300, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Ajouter un tournoi</p>

          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>Date</label>
            <input type="date" value={form.played_at} onChange={set('played_at')} style={inputStyle} required />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>Nom (optionnel)</label>
            <input type="text" value={form.tournament_name} onChange={set('tournament_name')} placeholder="Ex: Sunday Million" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Buy-in (€)</label>
              <input type="number" step="0.01" value={form.buy_in} onChange={set('buy_in')} placeholder="5.00" style={inputStyle} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Joueurs (opt.)</label>
              <input type="number" value={form.total_players} onChange={set('total_players')} placeholder="—" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>Position finale</label>
            <input type="number" value={form.position} onChange={set('position')} placeholder="1" style={inputStyle} required />
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Gain placement (prize pool)</label>
              <input type="number" step="0.01" value={form.gain_placement} onChange={set('gain_placement')} placeholder="0.00" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Primes KO gagnées</label>
              <input type="number" step="0.01" value={form.gain_bounties} onChange={set('gain_bounties')} placeholder="0.00" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 10, fontSize: 12, color: C.muted }}>
            Total : <strong style={{ color: C.text }}>{(num(form.gain_placement) + num(form.gain_bounties)).toFixed(2)} €</strong>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>Type</label>
            <select value={form.type} onChange={set('type')} style={inputStyle}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabel}>Notes (optionnel)</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Remarques sur le tournoi…" style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {formError && <p style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: C.green, color: '#000',
              fontWeight: 600, fontSize: 12,
              padding: '10px', borderRadius: 6,
              border: 'none', width: '100%',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>

        {/* Liste des 10 derniers tournois */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
          <p style={sectionTitle}>Derniers tournois</p>
          {recent.length === 0 ? (
            <p style={{ color: C.dim, fontSize: 13 }}>Aucun tournoi enregistré</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    {(['Date', 'Nom', 'Buy-in', 'Pos.', 'Gain', 'Primes', 'Profit', 'Type'] as const).map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: i === 0 ? '0 6px 8px 0' : '0 6px 8px',
                          fontSize: 9, fontWeight: 600,
                          color: C.dim,
                          textTransform: 'uppercase', letterSpacing: '0.09em',
                          textAlign: i >= 2 && i <= 6 ? 'right' : 'left',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map(t => {
                    const profit = num(t.gain) - num(t.buy_in)
                    const bounties = num(t.gain_bounties)
                    return (
                      <tr key={t.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '8px 6px 8px 0', color: C.muted, whiteSpace: 'nowrap' }}>{dayMonth(t.played_at)}</td>
                        <td style={{ padding: 6, color: C.text, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tournament_name || '—'}</td>
                        <td style={{ padding: 6, textAlign: 'right', color: C.muted, fontFamily: mono }}>{num(t.buy_in).toFixed(2)}</td>
                        <td style={{ padding: 6, textAlign: 'right', color: C.muted, fontFamily: mono }}>{t.position}{t.total_players ? `/${t.total_players}` : ''}</td>
                        <td style={{ padding: 6, textAlign: 'right', color: C.muted, fontFamily: mono }}>{num(t.gain_placement).toFixed(2)}</td>
                        <td style={{ padding: 6, textAlign: 'right', color: bounties > 0 ? C.green : C.dim, fontFamily: mono, whiteSpace: 'nowrap' }}>
                          {bounties > 0 ? bounties.toFixed(2) : '—'}
                        </td>
                        <td style={{ padding: 6, textAlign: 'right', fontWeight: 600, fontFamily: mono, color: profit >= 0 ? C.green : C.red }}>{eur(profit, true)}</td>
                        <td style={{ padding: 6, color: C.dim }}>{t.type}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
