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
  type: string
  notes: string | null
}

const C = {
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f59e0b',
  white: '#f5f5f5',
  muted: '#a1a1aa',
  dim: '#3f3f46',
  border: '#2a2a2a',
  card: '#1a1a1a',
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

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
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
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
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
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: C.muted, marginBottom: 4 }}>{label}</p>
      <p style={{ color: C.green, fontWeight: 600 }}>Score : {payload[0].value}%</p>
      <p style={{ color: C.muted }}>{payload[0].payload.total} mains</p>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub: string; color: string
}) {
  return (
    <div className="card-3d">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{sub}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#141414',
  color: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'inherit',
}

const fieldLabel: React.CSSProperties = { fontSize: 11, color: C.muted, marginBottom: 4, display: 'block' }

const emptyForm = (today: string) => ({
  played_at: today,
  tournament_name: '',
  buy_in: '',
  total_players: '',
  position: '',
  gain: '',
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
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', color: C.white }}>
      {/* ───────────── COLONNE GAUCHE (≈65%) ───────────── */}
      <div style={{ flexGrow: 1, flexBasis: 560, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Rangée 1 : 4 stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          <StatCard icon="💰" label="P&L Total" value={eur(pnl, true)} sub={`sur ${count} tournoi${count > 1 ? 's' : ''}`} color={pnl >= 0 ? C.green : C.red} />
          <StatCard icon="📈" label="ROI" value={`${roi > 0 ? '+' : ''}${roi.toFixed(1)} %`} sub={`sur ${count} tournoi${count > 1 ? 's' : ''}`} color={roi >= 0 ? C.green : C.red} />
          <StatCard icon="🎯" label="ITM %" value={`${itm.toFixed(0)} %`} sub={`${itmCount} / ${count} ITM`} color={C.white} />
          <StatCard icon="🎟️" label="Buy-in moyen" value={eur(avgBuyIn)} sub={`sur ${count} tournoi${count > 1 ? 's' : ''}`} color={C.white} />
        </div>

        {/* Rangée 2 : courbe bankroll */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <p style={sectionTitle}>Évolution de la bankroll</p>
          {bankroll.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontSize: 13 }}>
              Aucun tournoi enregistré
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

        {/* Rangée 3 : score d'analyse */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <p style={sectionTitle}>Score d&apos;analyse des mains</p>
          {aTotal === 0 ? (
            <div style={{ color: C.dim, fontSize: 13, padding: '8px 0' }}>
              Aucune main analysée. Analyse des mains dans l&apos;onglet 🔍 Analyser.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 28, fontWeight: 700, color: aScore > 70 ? C.green : aScore >= 50 ? C.orange : C.red }}>{aScore}%</span>
                  <span style={{ fontSize: 12, color: C.muted, marginLeft: 6 }}>score global</span>
                </div>
                <div style={{ fontSize: 13, color: C.muted }}>{aTotal} mains analysées</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                  <span style={{ color: C.green }}>✅ {aGood}</span>
                  <span style={{ color: C.orange }}>⚠️ {aWarn}</span>
                  <span style={{ color: C.red }}>❌ {aBad}</span>
                </div>
              </div>

              {sessionBars.length > 0 && (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={sessionBars} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.dim }} axisLine={{ stroke: C.border }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.dim }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<ScoreBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                      {sessionBars.map((b, i) => <Cell key={i} fill={barColor(b.score)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </div>
      </div>

      {/* ───────────── COLONNE DROITE (≈35%) ───────────── */}
      <div style={{ flexGrow: 1, flexBasis: 300, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
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

          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Position finale</label>
              <input type="number" value={form.position} onChange={set('position')} placeholder="1" style={inputStyle} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Gain (€)</label>
              <input type="number" step="0.01" value={form.gain} onChange={set('gain')} placeholder="0.00" style={inputStyle} />
            </div>
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
              width: '100%',
              background: C.green,
              color: '#06121f',
              fontWeight: 700,
              padding: 11,
              borderRadius: 8,
              border: 'none',
              fontSize: 14,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>

        {/* Liste des 10 derniers tournois */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
          <p style={sectionTitle}>Derniers tournois</p>
          {recent.length === 0 ? (
            <p style={{ color: C.dim, fontSize: 13 }}>Aucun tournoi enregistré</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: C.muted, textAlign: 'left' }}>
                    <th style={{ padding: '6px 6px 6px 0', fontWeight: 500 }}>Date</th>
                    <th style={{ padding: 6, fontWeight: 500 }}>Nom</th>
                    <th style={{ padding: 6, fontWeight: 500, textAlign: 'right' }}>Buy-in</th>
                    <th style={{ padding: 6, fontWeight: 500, textAlign: 'right' }}>Pos.</th>
                    <th style={{ padding: 6, fontWeight: 500, textAlign: 'right' }}>Gain</th>
                    <th style={{ padding: 6, fontWeight: 500, textAlign: 'right' }}>Profit</th>
                    <th style={{ padding: 6, fontWeight: 500 }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(t => {
                    const profit = num(t.gain) - num(t.buy_in)
                    return (
                      <tr key={t.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '8px 6px 8px 0', color: C.muted, whiteSpace: 'nowrap' }}>{dayMonth(t.played_at)}</td>
                        <td style={{ padding: 6, color: C.white, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tournament_name || '—'}</td>
                        <td style={{ padding: 6, textAlign: 'right', color: C.muted }}>{num(t.buy_in).toFixed(2)}</td>
                        <td style={{ padding: 6, textAlign: 'right', color: C.muted }}>{t.position}{t.total_players ? `/${t.total_players}` : ''}</td>
                        <td style={{ padding: 6, textAlign: 'right', color: C.muted }}>{num(t.gain).toFixed(2)}</td>
                        <td style={{ padding: 6, textAlign: 'right', fontWeight: 600, color: profit >= 0 ? C.green : C.red }}>{eur(profit, true)}</td>
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
